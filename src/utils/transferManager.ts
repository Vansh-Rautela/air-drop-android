
import { toast } from "sonner";
import { connectivityManager, NetworkDevice } from "./connectivityManager";

export interface TransferFile {
  id: string;
  name: string;
  type: string;
  size: string;
  sizeInBytes: number;
  selected: boolean;
}

export interface TransferSession {
  id: string;
  device: NetworkDevice;
  files: TransferFile[];
  status: "pending" | "transferring" | "paused" | "completed" | "failed";
  progress: number;
  startTime?: Date;
  endTime?: Date;
  transferSpeed: string;
  timeRemaining: string;
  totalSize: string;
}

class TransferManager {
  private activeTransfer: TransferSession | null = null;
  private transferHistory: TransferSession[] = [];
  private transferListeners: Array<(session: TransferSession | null) => void> = [];
  private historyListeners: Array<(history: TransferSession[]) => void> = [];
  private transferInterval: NodeJS.Timeout | null = null;
  
  // Start a new transfer session
  public startTransfer(device: NetworkDevice, files: TransferFile[]): Promise<TransferSession> {
    if (this.activeTransfer && this.activeTransfer.status === "transferring") {
      return Promise.reject(new Error("A transfer is already in progress"));
    }
    
    // Calculate total size in bytes
    const totalSizeInBytes = files.reduce((total, file) => total + file.sizeInBytes, 0);
    
    // Create a new transfer session
    const session: TransferSession = {
      id: `transfer_${Date.now()}`,
      device,
      files,
      status: "pending",
      progress: 0,
      startTime: new Date(),
      transferSpeed: "0 MB/s",
      timeRemaining: "--:--",
      totalSize: this.formatSize(totalSizeInBytes)
    };
    
    this.activeTransfer = session;
    this.notifyTransferListeners();
    
    // Wait for connection to be established
    if (device.status !== "connected") {
      return connectivityManager.connectToDevice(device.id)
        .then(() => this.beginTransfer(session))
        .catch((error) => {
          session.status = "failed";
          this.notifyTransferListeners();
          return Promise.reject(error);
        });
    }
    
    return this.beginTransfer(session);
  }
  
  // Pause current transfer
  public pauseTransfer(): Promise<TransferSession | null> {
    if (!this.activeTransfer || this.activeTransfer.status !== "transferring") {
      return Promise.resolve(null);
    }
    
    this.activeTransfer.status = "paused";
    this.clearTransferInterval();
    this.notifyTransferListeners();
    toast.info("Transfer paused");
    
    return Promise.resolve(this.activeTransfer);
  }
  
  // Resume paused transfer
  public resumeTransfer(): Promise<TransferSession | null> {
    if (!this.activeTransfer || this.activeTransfer.status !== "paused") {
      return Promise.resolve(null);
    }
    
    this.activeTransfer.status = "transferring";
    this.simulateTransferProgress(this.activeTransfer);
    this.notifyTransferListeners();
    toast.info("Transfer resumed");
    
    return Promise.resolve(this.activeTransfer);
  }
  
  // Cancel current transfer
  public cancelTransfer(): Promise<void> {
    if (!this.activeTransfer) {
      return Promise.resolve();
    }
    
    this.clearTransferInterval();
    this.activeTransfer.status = "failed";
    this.transferHistory.push({...this.activeTransfer});
    this.activeTransfer = null;
    this.notifyTransferListeners();
    this.notifyHistoryListeners();
    toast.error("Transfer cancelled");
    
    return Promise.resolve();
  }
  
  // Get active transfer session
  public getActiveTransfer(): TransferSession | null {
    return this.activeTransfer;
  }
  
  // Get transfer history
  public getTransferHistory(): TransferSession[] {
    return [...this.transferHistory];
  }
  
  // Subscribe to transfer updates
  public subscribeToTransfer(callback: (session: TransferSession | null) => void): () => void {
    this.transferListeners.push(callback);
    return () => {
      this.transferListeners = this.transferListeners.filter(cb => cb !== callback);
    };
  }
  
  // Subscribe to history updates
  public subscribeToHistory(callback: (history: TransferSession[]) => void): () => void {
    this.historyListeners.push(callback);
    return () => {
      this.historyListeners = this.historyListeners.filter(cb => cb !== callback);
    };
  }
  
  // Private methods
  private beginTransfer(session: TransferSession): Promise<TransferSession> {
    session.status = "transferring";
    this.notifyTransferListeners();
    
    // Simulate transfer progress
    this.simulateTransferProgress(session);
    
    return Promise.resolve(session);
  }
  
  private simulateTransferProgress(session: TransferSession): void {
    // Clear any existing interval
    this.clearTransferInterval();
    
    // Start a new interval to simulate progress
    this.transferInterval = setInterval(() => {
      if (!this.activeTransfer || this.activeTransfer.status !== "transferring") {
        this.clearTransferInterval();
        return;
      }
      
      // Increment progress by a random amount (1-3%)
      const increment = Math.random() * 2 + 1;
      let newProgress = this.activeTransfer.progress + increment;
      
      // Update transfer speed (0.5-2.5 MB/s)
      const speedValue = (Math.random() * 2 + 0.5).toFixed(1);
      this.activeTransfer.transferSpeed = `${speedValue} MB/s`;
      
      // Update time remaining
      const remainingPercentage = 100 - newProgress;
      const secondsRemaining = Math.round((remainingPercentage / 5) * 4);
      const minutes = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;
      this.activeTransfer.timeRemaining = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      if (newProgress >= 100) {
        newProgress = 100;
        this.activeTransfer.progress = newProgress;
        this.completeTransfer();
      } else {
        this.activeTransfer.progress = newProgress;
        this.notifyTransferListeners();
      }
    }, 500);
  }
  
  private completeTransfer(): void {
    if (!this.activeTransfer) return;
    
    this.clearTransferInterval();
    this.activeTransfer.status = "completed";
    this.activeTransfer.endTime = new Date();
    this.activeTransfer.timeRemaining = "00:00";
    
    // Add to history
    this.transferHistory.push({...this.activeTransfer});
    
    // Notify listeners
    this.notifyTransferListeners();
    this.notifyHistoryListeners();
    
    toast.success("Transfer completed successfully");
    
    // Clear active transfer after a delay
    setTimeout(() => {
      this.activeTransfer = null;
      this.notifyTransferListeners();
    }, 2000);
  }
  
  private clearTransferInterval(): void {
    if (this.transferInterval) {
      clearInterval(this.transferInterval);
      this.transferInterval = null;
    }
  }
  
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  
  private notifyTransferListeners(): void {
    this.transferListeners.forEach(callback => callback(this.activeTransfer));
  }
  
  private notifyHistoryListeners(): void {
    this.historyListeners.forEach(callback => callback(this.getTransferHistory()));
  }
}

// Export a singleton instance
export const transferManager = new TransferManager();

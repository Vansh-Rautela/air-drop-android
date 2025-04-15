import { toast } from "sonner";
import { connectivityManager, NetworkDevice } from "./connectivityManager";
import { WifiDirect } from "../native/wifi";
import { Bluetooth } from "../native/bluetooth";
import { Filesystem, Directory } from "@capacitor/filesystem";

export interface TransferFile {
  id: string;
  name: string;
  type: string;
  size: string;
  sizeInBytes: number;
  selected: boolean;
  path?: string; // Local file path
  uri?: string;  // File URI
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
  transferIds: string[]; // IDs from native transfer operations
}

class TransferManager {
  private activeTransfer: TransferSession | null = null;
  private transferHistory: TransferSession[] = [];
  private transferListeners: Array<(session: TransferSession | null) => void> = [];
  private historyListeners: Array<(history: TransferSession[]) => void> = [];
  private transferTimeoutId: NodeJS.Timeout | null = null;
  
  constructor() {
    this.setupTransferListeners();
    this.loadTransferHistory();
  }
  
  private setupTransferListeners() {
    // Setup WiFi Direct transfer listeners
    WifiDirect.addListener('transferProgress', (event) => {
      console.log('WiFi transfer progress:', event);
      this.updateTransferProgress(event.transferId, event.bytesTransferred, event.totalBytes);
    });
    
    WifiDirect.addListener('transferCompleted', (event) => {
      console.log('WiFi transfer completed:', event);
      this.handleTransferCompletion(event.transferId, event.filePath);
    });
    
    WifiDirect.addListener('transferFailed', (event) => {
      console.log('WiFi transfer failed:', event);
      this.handleTransferFailure(event.transferId, event.error);
    });
    
    // Setup Bluetooth transfer listeners
    Bluetooth.addListener('transferProgress', (event) => {
      console.log('Bluetooth transfer progress:', event);
      this.updateTransferProgress(event.transferId, event.bytesTransferred, event.totalBytes);
    });
    
    Bluetooth.addListener('transferCompleted', (event) => {
      console.log('Bluetooth transfer completed:', event);
      this.handleTransferCompletion(event.transferId, event.filePath);
    });
    
    Bluetooth.addListener('transferFailed', (event) => {
      console.log('Bluetooth transfer failed:', event);
      this.handleTransferFailure(event.transferId, event.error);
    });
  }
  
  private async loadTransferHistory() {
    try {
      const result = await Filesystem.readFile({
        path: 'fileshare/history.json',
        directory: Directory.Data
      });
      
      if (result.data) {
        this.transferHistory = JSON.parse(result.data);
        this.notifyHistoryListeners();
      }
    } catch (error) {
      console.log('No transfer history found or error reading it:', error);
      this.transferHistory = [];
    }
  }
  
  private async saveTransferHistory() {
    try {
      // Ensure directory exists
      await Filesystem.mkdir({
        path: 'fileshare',
        directory: Directory.Data,
        recursive: true
      });
      
      // Save history
      await Filesystem.writeFile({
        path: 'fileshare/history.json',
        data: JSON.stringify(this.transferHistory),
        directory: Directory.Data
      });
    } catch (error) {
      console.error('Failed to save transfer history:', error);
    }
  }
  
  private updateTransferProgress(transferId: string, bytesTransferred: number, totalBytes: number) {
    if (!this.activeTransfer) return;
    
    // Find which file this transfer belongs to
    const fileIndex = this.activeTransfer.transferIds.indexOf(transferId);
    if (fileIndex < 0) return;
    
    // Calculate total progress across all files
    const totalFileSize = this.activeTransfer.files.reduce((total, file) => total + file.sizeInBytes, 0);
    let totalTransferred = 0;
    
    // Add progress from current file
    if (fileIndex < this.activeTransfer.files.length) {
      const previousFilesSize = this.activeTransfer.files
        .slice(0, fileIndex)
        .reduce((total, file) => total + file.sizeInBytes, 0);
      
      totalTransferred = previousFilesSize + bytesTransferred;
    }
    
    // Calculate overall progress percentage
    const progress = Math.min(100, (totalTransferred / totalFileSize) * 100);
    
    // Update transfer speed
    const now = new Date();
    const elapsedSeconds = this.activeTransfer.startTime 
      ? (now.getTime() - this.activeTransfer.startTime.getTime()) / 1000
      : 1;
    
    const bytesPerSecond = totalTransferred / elapsedSeconds;
    const transferSpeed = this.formatSpeed(bytesPerSecond);
    
    // Calculate time remaining
    const remainingBytes = totalFileSize - totalTransferred;
    const secondsRemaining = bytesPerSecond > 0 ? Math.round(remainingBytes / bytesPerSecond) : 0;
    const timeRemaining = this.formatTimeRemaining(secondsRemaining);
    
    // Update active transfer
    this.activeTransfer.progress = progress;
    this.activeTransfer.transferSpeed = transferSpeed;
    this.activeTransfer.timeRemaining = timeRemaining;
    
    // Notify listeners
    this.notifyTransferListeners();
  }
  
  private handleTransferCompletion(transferId: string, filePath?: string) {
    if (!this.activeTransfer) return;
    
    // Find which file this transfer belongs to
    const fileIndex = this.activeTransfer.transferIds.indexOf(transferId);
    if (fileIndex < 0) return;
    
    // If this is the last file, complete the transfer
    if (fileIndex === this.activeTransfer.files.length - 1) {
      this.completeTransfer();
    } else {
      // Otherwise, start the next file transfer
      this.sendNextFile(fileIndex + 1);
    }
  }
  
  private handleTransferFailure(transferId: string, error?: string) {
    if (!this.activeTransfer) return;
    
    console.error('Transfer failed:', error);
    this.activeTransfer.status = "failed";
    
    // Add to history
    this.transferHistory.push({...this.activeTransfer});
    this.saveTransferHistory();
    
    // Notify listeners
    this.notifyTransferListeners();
    this.notifyHistoryListeners();
    
    toast.error(`Transfer failed: ${error || 'Unknown error'}`);
    
    // Clear active transfer after a delay
    setTimeout(() => {
      this.activeTransfer = null;
      this.notifyTransferListeners();
    }, 3000);
  }
  
  // Start a new transfer session
  public async startTransfer(device: NetworkDevice, files: TransferFile[]): Promise<TransferSession> {
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
      transferSpeed: "0 B/s",
      timeRemaining: "--:--",
      totalSize: this.formatSize(totalSizeInBytes),
      transferIds: []
    };
    
    this.activeTransfer = session;
    this.notifyTransferListeners();
    
    // Wait for connection to be established
    if (device.status !== "connected") {
      try {
        await connectivityManager.connectToDevice(device.id);
      } catch (error) {
        session.status = "failed";
        this.notifyTransferListeners();
        return Promise.reject(error);
      }
    }
    
    return this.beginTransfer(session);
  }
  
  private async beginTransfer(session: TransferSession): Promise<TransferSession> {
    session.status = "transferring";
    this.notifyTransferListeners();
    
    // Start sending the first file
    await this.sendNextFile(0);
    
    return Promise.resolve(session);
  }
  
  private async sendNextFile(fileIndex: number) {
    if (!this.activeTransfer || fileIndex >= this.activeTransfer.files.length) {
      return;
    }
    
    const file = this.activeTransfer.files[fileIndex];
    const device = this.activeTransfer.device;
    
    try {
      let transferId: string;
      
      if (device.connectionType === 'wifi') {
        // Send file using WiFi Direct
        const result = await WifiDirect.sendFile({
          filePath: file.path!,
          deviceAddress: device.id
        });
        transferId = result.transferId;
      } else {
        // Send file using Bluetooth
        const result = await Bluetooth.sendFile({
          filePath: file.path!,
          deviceAddress: device.id
        });
        transferId = result.transferId;
      }
      
      // Store the transfer ID
      this.activeTransfer.transferIds[fileIndex] = transferId;
      
    } catch (error) {
      console.error(`Failed to send file ${file.name}:`, error);
      this.handleTransferFailure('unknown', error.message);
    }
  }
  
  // Pause current transfer
  public async pauseTransfer(): Promise<TransferSession | null> {
    if (!this.activeTransfer || this.activeTransfer.status !== "transferring") {
      return Promise.resolve(null);
    }
    
    this.activeTransfer.status = "paused";
    
    // Cancel all ongoing transfers
    for (const transferId of this.activeTransfer.transferIds) {
      if (transferId) {
        try {
          if (this.activeTransfer.device.connectionType === 'wifi') {
            await WifiDirect.cancelTransfer({ transferId });
          } else {
            await Bluetooth.cancelTransfer({ transferId });
          }
        } catch (error) {
          console.error('Error cancelling transfer:', error);
        }
      }
    }
    
    this.notifyTransferListeners();
    toast.info("Transfer paused");
    
    return Promise.resolve(this.activeTransfer);
  }
  
  // Resume paused transfer
  public async resumeTransfer(): Promise<TransferSession | null> {
    if (!this.activeTransfer || this.activeTransfer.status !== "paused") {
      return Promise.resolve(null);
    }
    
    this.activeTransfer.status = "transferring";
    
    // Find the first incomplete file and restart from there
    let nextFileIndex = 0;
    for (let i = 0; i < this.activeTransfer.transferIds.length; i++) {
      if (!this.activeTransfer.transferIds[i]) {
        nextFileIndex = i;
        break;
      }
    }
    
    await this.sendNextFile(nextFileIndex);
    
    this.notifyTransferListeners();
    toast.info("Transfer resumed");
    
    return Promise.resolve(this.activeTransfer);
  }
  
  // Cancel current transfer
  public async cancelTransfer(): Promise<void> {
    if (!this.activeTransfer) {
      return Promise.resolve();
    }
    
    // Cancel all ongoing transfers
    for (const transferId of this.activeTransfer.transferIds) {
      if (transferId) {
        try {
          if (this.activeTransfer.device.connectionType === 'wifi') {
            await WifiDirect.cancelTransfer({ transferId });
          } else {
            await Bluetooth.cancelTransfer({ transferId });
          }
        } catch (error) {
          console.error('Error cancelling transfer:', error);
        }
      }
    }
    
    this.activeTransfer.status = "failed";
    this.transferHistory.push({...this.activeTransfer});
    this.saveTransferHistory();
    
    this.activeTransfer = null;
    this.notifyTransferListeners();
    this.notifyHistoryListeners();
    toast.error("Transfer cancelled");
    
    return Promise.resolve();
  }
  
  private completeTransfer(): void {
    if (!this.activeTransfer) return;
    
    this.activeTransfer.status = "completed";
    this.activeTransfer.progress = 100;
    this.activeTransfer.endTime = new Date();
    this.activeTransfer.timeRemaining = "00:00";
    
    // Add to history
    this.transferHistory.push({...this.activeTransfer});
    this.saveTransferHistory();
    
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
  
  // Cleanup resources
  public async cleanup() {
    if (this.transferTimeoutId) {
      clearTimeout(this.transferTimeoutId);
    }
    
    // Cancel active transfer if exists
    if (this.activeTransfer?.status === "transferring") {
      await this.cancelTransfer();
    }
  }
  
  // Helper methods
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  
  private formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  
  private formatTimeRemaining(seconds: number): string {
    if (seconds <= 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
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

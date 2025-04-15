
import { toast } from "sonner";

// Device connection states
export type ConnectionStatus = "available" | "connecting" | "connected" | "disconnected" | "failed";

// Device interface
export interface NetworkDevice {
  id: string;
  name: string;
  status: ConnectionStatus;
  connectionType?: "wifi" | "bluetooth";
  lastSeen?: Date;
}

// Transfer protocol types
export type TransferProtocol = "wifi_direct" | "bluetooth";

class ConnectivityManager {
  private devices: NetworkDevice[] = [];
  private activeDevice: NetworkDevice | null = null;
  private isScanning: boolean = false;
  private listeners: Array<(devices: NetworkDevice[]) => void> = [];
  private connectionListeners: Array<(device: NetworkDevice | null) => void> = [];
  
  // Simulate device scanning
  public scanForDevices(): Promise<NetworkDevice[]> {
    if (this.isScanning) {
      return Promise.resolve(this.devices);
    }
    
    this.isScanning = true;
    
    // Notify listeners that scanning has started
    this.notifyListeners();
    
    // Simulate network scan with a delay
    return new Promise((resolve) => {
      setTimeout(() => {
        // In a real implementation, this would use WiFi Direct or Bluetooth APIs
        // For demo purposes, we'll generate some mock devices
        this.devices = [
          { id: "device1", name: "Samsung Galaxy S21", status: "available", connectionType: "wifi" },
          { id: "device2", name: "Google Pixel 6", status: "available", connectionType: "wifi" },
          { id: "device3", name: "Xiaomi Mi 11", status: "available", connectionType: "bluetooth" },
          { id: "device4", name: "OnePlus 9", status: "available", connectionType: "wifi" },
          { id: "device5", name: "Motorola Edge", status: "available", connectionType: "bluetooth" }
        ];
        
        this.isScanning = false;
        this.notifyListeners();
        resolve(this.devices);
      }, 2000);
    });
  }
  
  // Connect to a specific device
  public connectToDevice(deviceId: string): Promise<NetworkDevice> {
    const device = this.devices.find(d => d.id === deviceId);
    
    if (!device) {
      return Promise.reject(new Error("Device not found"));
    }
    
    // Update status to connecting
    device.status = "connecting";
    this.notifyListeners();
    
    // Simulate connection process
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 90% success rate
        if (Math.random() < 0.9) {
          device.status = "connected";
          this.activeDevice = device;
          this.notifyConnectionListeners();
          this.notifyListeners();
          toast.success(`Connected to ${device.name}`);
          resolve(device);
        } else {
          device.status = "failed";
          this.notifyListeners();
          toast.error(`Failed to connect to ${device.name}`);
          reject(new Error("Connection failed"));
          
          // Reset status after a delay
          setTimeout(() => {
            device.status = "available";
            this.notifyListeners();
          }, 3000);
        }
      }, 1500);
    });
  }
  
  // Disconnect from current device
  public disconnect(): Promise<void> {
    if (!this.activeDevice) {
      return Promise.resolve();
    }
    
    const device = this.activeDevice;
    
    return new Promise((resolve) => {
      device.status = "disconnected";
      this.activeDevice = null;
      this.notifyConnectionListeners();
      this.notifyListeners();
      
      toast.info(`Disconnected from ${device.name}`);
      
      // Reset status after a delay
      setTimeout(() => {
        device.status = "available";
        this.notifyListeners();
        resolve();
      }, 1000);
    });
  }
  
  // Get all discovered devices
  public getDevices(): NetworkDevice[] {
    return [...this.devices];
  }
  
  // Get connection status
  public getConnectionStatus(): boolean {
    return !!this.activeDevice;
  }
  
  // Get active device
  public getActiveDevice(): NetworkDevice | null {
    return this.activeDevice;
  }
  
  // Check if currently scanning
  public isCurrentlyScanning(): boolean {
    return this.isScanning;
  }
  
  // Subscribe to device list changes
  public subscribeToDevices(callback: (devices: NetworkDevice[]) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }
  
  // Subscribe to connection changes
  public subscribeToConnection(callback: (device: NetworkDevice | null) => void): () => void {
    this.connectionListeners.push(callback);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(cb => cb !== callback);
    };
  }
  
  // Get optimal transfer protocol based on file size and available connections
  public getOptimalProtocol(fileSizeInMB: number): TransferProtocol {
    // For files larger than 10MB, prefer WiFi Direct if available
    if (fileSizeInMB > 10 && this.activeDevice?.connectionType === "wifi") {
      return "wifi_direct";
    }
    
    // Default to Bluetooth for smaller files or if WiFi is not available
    return "bluetooth";
  }
  
  // Private methods
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.getDevices()));
  }
  
  private notifyConnectionListeners(): void {
    this.connectionListeners.forEach(callback => callback(this.activeDevice));
  }
}

// Export a singleton instance
export const connectivityManager = new ConnectivityManager();

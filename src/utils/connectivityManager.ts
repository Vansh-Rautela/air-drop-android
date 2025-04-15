import { toast } from "sonner";
import { WifiDirect, WifiDirectDevice } from "../native/wifi";
import { Bluetooth, BluetoothDevice } from "../native/bluetooth";
import { Filesystem } from "@capacitor/filesystem";

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
  private wifiEventListeners: any[] = [];
  private bluetoothEventListeners: any[] = [];
  
  constructor() {
    this.initializePlugins();
  }
  
  // Initialize the connectivity plugins
  private async initializePlugins() {
    try {
      // Initialize WiFi Direct
      const wifiResult = await WifiDirect.initialize();
      console.log("WiFi Direct initialization:", wifiResult.status);
      
      // Setup WiFi Direct event listeners
      this.setupWifiDirectListeners();
      
      // Initialize Bluetooth
      const btResult = await Bluetooth.initialize();
      console.log("Bluetooth initialization:", btResult.status);
      
      // Setup Bluetooth event listeners
      this.setupBluetoothListeners();
      
    } catch (error) {
      console.error("Failed to initialize connectivity plugins:", error);
      toast.error("Failed to initialize device connectivity");
    }
  }
  
  private setupWifiDirectListeners() {
    // Device discovered event
    WifiDirect.addListener('deviceDiscovered', (event) => {
      console.log('WiFi device discovered:', event);
      this.addOrUpdateDevice({
        id: event.device.address,
        name: event.device.name || `Device (${event.device.address})`,
        status: 'available',
        connectionType: 'wifi',
        lastSeen: new Date()
      });
    });
    
    // Connection state changed event
    WifiDirect.addListener('connectionStateChanged', (event) => {
      console.log('WiFi connection state changed:', event);
      if (event.connected) {
        this.updateDeviceStatus(event.deviceAddress, 'connected');
        const device = this.devices.find(d => d.id === event.deviceAddress);
        if (device) {
          this.activeDevice = device;
          this.notifyConnectionListeners();
        }
      } else {
        this.updateDeviceStatus(event.deviceAddress, 'disconnected');
        if (this.activeDevice?.id === event.deviceAddress) {
          this.activeDevice = null;
          this.notifyConnectionListeners();
        }
      }
    });
    
    // Add listener to track referenced for cleanup
    this.wifiEventListeners.push('deviceDiscovered');
    this.wifiEventListeners.push('connectionStateChanged');
  }
  
  private setupBluetoothListeners() {
    // Device discovered event
    Bluetooth.addListener('deviceDiscovered', (event) => {
      console.log('Bluetooth device discovered:', event);
      this.addOrUpdateDevice({
        id: event.device.address,
        name: event.device.name || `Device (${event.device.address})`,
        status: 'available',
        connectionType: 'bluetooth',
        lastSeen: new Date()
      });
    });
    
    // Connection state changed event
    Bluetooth.addListener('connectionStateChanged', (event) => {
      console.log('Bluetooth connection state changed:', event);
      if (event.connected) {
        this.updateDeviceStatus(event.deviceAddress, 'connected');
        const device = this.devices.find(d => d.id === event.deviceAddress);
        if (device) {
          this.activeDevice = device;
          this.notifyConnectionListeners();
        }
      } else {
        this.updateDeviceStatus(event.deviceAddress, 'disconnected');
        if (this.activeDevice?.id === event.deviceAddress) {
          this.activeDevice = null;
          this.notifyConnectionListeners();
        }
      }
    });
    
    // Add listener to track referenced for cleanup
    this.bluetoothEventListeners.push('deviceDiscovered');
    this.bluetoothEventListeners.push('connectionStateChanged');
  }
  
  private addOrUpdateDevice(device: NetworkDevice) {
    const existingDeviceIndex = this.devices.findIndex(d => d.id === device.id);
    
    if (existingDeviceIndex >= 0) {
      // Update existing device
      this.devices[existingDeviceIndex] = {
        ...this.devices[existingDeviceIndex],
        ...device,
        lastSeen: new Date()
      };
    } else {
      // Add new device
      this.devices.push(device);
    }
    
    this.notifyListeners();
  }
  
  private updateDeviceStatus(deviceId: string, status: ConnectionStatus) {
    const device = this.devices.find(d => d.id === deviceId);
    if (device) {
      device.status = status;
      this.notifyListeners();
    }
  }
  
  // Scan for devices using both WiFi Direct and Bluetooth
  public async scanForDevices(): Promise<NetworkDevice[]> {
    if (this.isScanning) {
      return Promise.resolve(this.devices);
    }
    
    this.isScanning = true;
    this.notifyListeners();
    
    try {
      // Clear existing devices that haven't been seen recently
      this.cleanupStaleDevices();
      
      // Start WiFi Direct discovery
      const wifiResult = await WifiDirect.startDiscovery();
      console.log("WiFi Direct discovery started:", wifiResult.status);
      
      // Start Bluetooth discovery
      const btResult = await Bluetooth.startDiscovery();
      console.log("Bluetooth discovery started:", btResult.status);
      
      // Set a timeout to stop discovery after 30 seconds
      setTimeout(() => {
        this.stopDiscovery();
      }, 30000);
      
      return this.devices;
    } catch (error) {
      console.error("Error scanning for devices:", error);
      toast.error("Failed to scan for devices");
      this.isScanning = false;
      this.notifyListeners();
      return this.devices;
    }
  }
  
  private async stopDiscovery() {
    try {
      await WifiDirect.stopDiscovery();
      await Bluetooth.stopDiscovery();
    } catch (error) {
      console.error("Error stopping discovery:", error);
    } finally {
      this.isScanning = false;
      this.notifyListeners();
    }
  }
  
  private cleanupStaleDevices() {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    this.devices = this.devices.filter(device => {
      // Keep devices that are connected or don't have a lastSeen time
      if (device.status === 'connected' || !device.lastSeen) {
        return true;
      }
      
      // Remove devices that haven't been seen in the last 5 minutes
      return device.lastSeen && device.lastSeen > fiveMinutesAgo;
    });
  }
  
  // Connect to a specific device
  public async connectToDevice(deviceId: string): Promise<NetworkDevice> {
    const device = this.devices.find(d => d.id === deviceId);
    
    if (!device) {
      return Promise.reject(new Error("Device not found"));
    }
    
    // Update status to connecting
    device.status = "connecting";
    this.notifyListeners();
    
    try {
      if (device.connectionType === 'wifi') {
        // Connect using WiFi Direct
        const result = await WifiDirect.connectToDevice({ deviceAddress: deviceId });
        console.log("WiFi Direct connection result:", result.status);
        
        if (result.status === 'connected') {
          device.status = "connected";
          this.activeDevice = device;
          this.notifyConnectionListeners();
          this.notifyListeners();
          toast.success(`Connected to ${device.name}`);
          return device;
        } else {
          throw new Error("Failed to connect via WiFi Direct");
        }
      } else {
        // Connect using Bluetooth
        const pairResult = await Bluetooth.pairDevice({ deviceAddress: deviceId });
        console.log("Bluetooth pair result:", pairResult.status);
        
        const connectResult = await Bluetooth.connectToDevice({ deviceAddress: deviceId });
        console.log("Bluetooth connection result:", connectResult.status);
        
        if (connectResult.status === 'connected') {
          device.status = "connected";
          this.activeDevice = device;
          this.notifyConnectionListeners();
          this.notifyListeners();
          toast.success(`Connected to ${device.name}`);
          return device;
        } else {
          throw new Error("Failed to connect via Bluetooth");
        }
      }
    } catch (error) {
      console.error("Connection error:", error);
      device.status = "failed";
      this.notifyListeners();
      toast.error(`Failed to connect to ${device.name}`);
      
      // Reset status after a delay
      setTimeout(() => {
        device.status = "available";
        this.notifyListeners();
      }, 3000);
      
      return Promise.reject(error);
    }
  }
  
  // Disconnect from current device
  public async disconnect(): Promise<void> {
    if (!this.activeDevice) {
      return Promise.resolve();
    }
    
    const device = this.activeDevice;
    device.status = "disconnected";
    
    try {
      if (device.connectionType === 'wifi') {
        // Disconnect WiFi Direct
        await WifiDirect.disconnectFromDevice();
      } else {
        // Disconnect Bluetooth
        await Bluetooth.disconnectFromDevice({ deviceAddress: device.id });
      }
      
      this.activeDevice = null;
      this.notifyConnectionListeners();
      this.notifyListeners();
      
      toast.info(`Disconnected from ${device.name}`);
      
      // Reset status after a delay
      setTimeout(() => {
        device.status = "available";
        this.notifyListeners();
      }, 1000);
      
    } catch (error) {
      console.error("Disconnect error:", error);
      toast.error(`Error disconnecting from ${device.name}`);
      
      // Reset status and state even if there's an error
      this.activeDevice = null;
      device.status = "available";
      this.notifyConnectionListeners();
      this.notifyListeners();
    }
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
  
  // Clean up resources when app is closed
  public async cleanup() {
    // Stop any ongoing discovery
    await this.stopDiscovery();
    
    // Remove all event listeners
    await WifiDirect.removeAllListeners();
    await Bluetooth.removeAllListeners();
    
    // Disconnect if there's an active connection
    if (this.activeDevice) {
      await this.disconnect();
    }
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

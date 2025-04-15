
export interface BluetoothPlugin {
  initialize(): Promise<{ status: string }>;
  isEnabled(): Promise<{ enabled: boolean }>;
  enableBluetooth(): Promise<{ status: string }>;
  startDiscovery(): Promise<{ status: string }>;
  stopDiscovery(): Promise<{ status: string }>;
  getAvailableDevices(): Promise<{ devices: BluetoothDevice[] }>;
  pairDevice(options: { deviceAddress: string }): Promise<{ status: string }>;
  connectToDevice(options: { deviceAddress: string }): Promise<{ status: string }>;
  disconnectFromDevice(options: { deviceAddress: string }): Promise<{ status: string }>;
  sendFile(options: { filePath: string, deviceAddress: string }): Promise<{ transferId: string }>;
  cancelTransfer(options: { transferId: string }): Promise<{ status: string }>;
  addListener(eventName: string, listenerFunc: (event: any) => void): Promise<{ status: string }>;
  removeAllListeners(): Promise<{ status: string }>;
}

export interface BluetoothDevice {
  address: string;
  name: string;
  paired: boolean;
  connected: boolean;
  type: 'classic' | 'ble' | 'dual';
}

export interface BluetoothTransferStatus {
  transferId: string;
  bytesTransferred: number;
  totalBytes: number;
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  filePath?: string;
  error?: string;
}

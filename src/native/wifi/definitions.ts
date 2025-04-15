
export interface WifiDirectPlugin {
  initialize(): Promise<{ status: string }>;
  startDiscovery(): Promise<{ status: string }>;
  stopDiscovery(): Promise<{ status: string }>;
  getAvailableDevices(): Promise<{ devices: WifiDirectDevice[] }>;
  connectToDevice(options: { deviceAddress: string }): Promise<{ status: string }>;
  disconnectFromDevice(): Promise<{ status: string }>;
  createGroup(): Promise<{ status: string }>;
  removeGroup(): Promise<{ status: string }>;
  sendFile(options: { filePath: string, deviceAddress: string }): Promise<{ transferId: string }>;
  cancelTransfer(options: { transferId: string }): Promise<{ status: string }>;
  addListener(eventName: string, listenerFunc: (event: any) => void): Promise<{ status: string }>;
  removeAllListeners(): Promise<{ status: string }>;
}

export interface WifiDirectDevice {
  address: string;
  name: string;
  status: string;
  isGroupOwner: boolean;
  groupOwnerAddress?: string;
}

export interface TransferStatus {
  transferId: string;
  bytesTransferred: number;
  totalBytes: number;
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  filePath?: string;
  error?: string;
}

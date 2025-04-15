
import { WebPlugin } from '@capacitor/core';
import type { BluetoothPlugin, BluetoothDevice, BluetoothTransferStatus } from './definitions';

export class BluetoothWeb extends WebPlugin implements BluetoothPlugin {
  constructor() {
    super({
      name: 'Bluetooth',
      platforms: ['web']
    });
  }

  async initialize(): Promise<{ status: string }> {
    console.warn('Bluetooth functionality is not available in browser environment');
    return { status: 'unavailable' };
  }

  async isEnabled(): Promise<{ enabled: boolean }> {
    return { enabled: false };
  }

  async enableBluetooth(): Promise<{ status: string }> {
    return { status: 'unavailable' };
  }

  async startDiscovery(): Promise<{ status: string }> {
    return { status: 'unavailable' };
  }

  async stopDiscovery(): Promise<{ status: string }> {
    return { status: 'unavailable' };
  }

  async getAvailableDevices(): Promise<{ devices: BluetoothDevice[] }> {
    return { devices: [] };
  }

  async pairDevice(options: { deviceAddress: string }): Promise<{ status: string }> {
    console.warn(`Cannot pair with device ${options.deviceAddress} in browser environment`);
    return { status: 'unavailable' };
  }

  async connectToDevice(options: { deviceAddress: string }): Promise<{ status: string }> {
    console.warn(`Cannot connect to device ${options.deviceAddress} in browser environment`);
    return { status: 'unavailable' };
  }

  async disconnectFromDevice(options: { deviceAddress: string }): Promise<{ status: string }> {
    return { status: 'unavailable' };
  }

  async sendFile(options: { filePath: string, deviceAddress: string }): Promise<{ transferId: string }> {
    console.warn(`Cannot send file ${options.filePath} in browser environment`);
    return { transferId: 'mock-transfer-id' };
  }

  async cancelTransfer(options: { transferId: string }): Promise<{ status: string }> {
    return { status: 'unavailable' };
  }
}

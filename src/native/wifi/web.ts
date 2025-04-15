
import { WebPlugin } from '@capacitor/core';
import type { WifiDirectPlugin, WifiDirectDevice, TransferStatus } from './definitions';

export class WifiDirectWeb extends WebPlugin implements WifiDirectPlugin {
  constructor() {
    super({
      name: 'WifiDirect',
      platforms: ['web']
    });
  }

  async initialize(): Promise<{ status: string }> {
    console.warn('WiFi Direct is not available in browser environment');
    return { status: 'unavailable' };
  }

  async startDiscovery(): Promise<{ status: string }> {
    console.warn('WiFi Direct is not available in browser environment');
    return { status: 'unavailable' };
  }

  async stopDiscovery(): Promise<{ status: string }> {
    return { status: 'unavailable' };
  }

  async getAvailableDevices(): Promise<{ devices: WifiDirectDevice[] }> {
    return { devices: [] };
  }

  async connectToDevice(options: { deviceAddress: string }): Promise<{ status: string }> {
    console.warn(`Cannot connect to device ${options.deviceAddress} in browser environment`);
    return { status: 'unavailable' };
  }

  async disconnectFromDevice(): Promise<{ status: string }> {
    return { status: 'unavailable' };
  }

  async createGroup(): Promise<{ status: string }> {
    return { status: 'unavailable' };
  }

  async removeGroup(): Promise<{ status: string }> {
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

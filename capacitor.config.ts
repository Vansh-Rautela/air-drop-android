
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.6c706f1923c4432e854c36fd8655861c',
  appName: 'air-drop-android',
  webDir: 'dist',
  server: {
    url: 'https://6c706f19-23c4-432e-854c-36fd8655861c.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    CapacitorFileSystem: {
      readChunkSize: 4096 // For optimized file operations
    }
  }
};

export default config;


# FileShare: Real-Time File Transfer for Android Devices

FileShare is a modern, peer-to-peer file transfer application that allows Android devices to share files directly without requiring an internet connection or a central server.

## Features

- Direct device-to-device file transfers using WiFi Direct and Bluetooth
- Real-time transfer progress tracking
- Transfer history management
- Automatic protocol selection based on file size and available connections
- Support for multiple file types (images, videos, documents, etc.)

## Architecture

FileShare uses a hybrid architecture combining React for the user interface and Capacitor for native device capabilities:

- **Frontend**: React with TypeScript
- **Design**: Tailwind CSS and shadcn-ui components
- **Native Connectivity**: Custom Capacitor plugins for WiFi Direct and Bluetooth
- **State Management**: React Context and hooks

## Project Structure

```
src/
├── components/          # React UI components
├── pages/               # Application pages
├── hooks/               # Custom React hooks
├── utils/               # Utility functions and managers
│   ├── fileManager.ts   # File handling utilities
│   ├── transferManager.ts  # Core transfer coordination
│   ├── connectivityManager.ts  # Device discovery and connection
├── native/              # Native functionality through Capacitor
│   ├── wifi/            # WiFi Direct implementation
│   ├── bluetooth/       # Bluetooth implementation
├── types/               # TypeScript type definitions
└── constants/           # Application constants

android/                 # Android native code
├── app/
│   └── src/
│       └── main/
│           ├── java/
│           │   └── app/
│           │       └── lovable/
│           │           └── fileshare/
│           │               ├── WifiDirectPlugin.java
│           │               └── BluetoothPlugin.java
```

## Setting Up the Project

### Prerequisites

1. Node.js and npm
2. Android SDK (for Android development)
3. Capacitor CLI

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd fileshare
```

2. Install dependencies
```bash
npm install
```

3. Initialize Capacitor
```bash
npx cap init
```

4. Add Android platform
```bash
npx cap add android
```

5. Build the project
```bash
npm run build
```

6. Sync Capacitor
```bash
npx cap sync
```

## Running the Application

### On Android

```bash
npx cap run android
```

This will open the project in Android Studio, where you can run it on an emulator or physical device.

### Testing with Multiple Devices

To properly test file transfers, you'll need at least two physical Android devices. Emulators won't work for WiFi Direct testing as they don't have the necessary hardware capabilities.

## Implementation Details

### WiFi Direct Implementation

The WifiDirectPlugin provides native access to Android's WiFi Direct API, allowing devices to:

- Discover nearby devices
- Establish direct connections
- Transfer files at high speed (up to 250Mbps theoretically)

### Bluetooth Implementation

The BluetoothPlugin provides an alternative transfer method when WiFi Direct is unavailable, supporting:

- Device discovery and pairing
- Secure connections
- File transfers (at lower speeds than WiFi Direct)

### Transfer Protocol Selection

The system automatically selects the optimal transfer protocol based on:

- File size (large files prefer WiFi Direct)
- Available connections
- User preferences

## Security Considerations

- Files are transferred directly between devices without server storage
- All connections require explicit user approval
- The application requires minimal permissions

## Troubleshooting

### Common Issues

1. **WiFi Direct Not Working**:
   - Ensure both devices have WiFi enabled
   - Check that location permissions are granted (Android requirement)
   - Some devices may have manufacturer-specific limitations

2. **Bluetooth Connection Issues**:
   - Make sure Bluetooth is enabled on both devices
   - Try pairing devices manually before using the app
   - Keep devices within 10 meters of each other

3. **Transfer Failures**:
   - Ensure devices remain in close proximity during transfer
   - Check that receiving device has enough storage space
   - Battery optimization may interrupt long transfers

## License

[Specify your license here]

## Credits

Developed by [Your Name/Organization]

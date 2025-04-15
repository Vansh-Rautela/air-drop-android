
# Using FileShare on Real Android Devices

This document provides instructions for setting up and using FileShare on physical Android devices.

## Preparing Your Development Environment

### Step 1: Export the Project to GitHub

1. In the Lovable interface, click on "Share" and select "Export to GitHub"
2. Follow the prompts to create a new repository
3. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
   ```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Set Up Capacitor

```bash
# Initialize Capacitor (if not already done)
npx cap init

# Add Android platform
npx cap add android

# Build the web app
npm run build

# Sync Capacitor
npx cap sync
```

### Step 4: Add Permissions to Android Manifest

Open `android/app/src/main/AndroidManifest.xml` and add the following permissions:

```xml
<!-- Required permissions for WiFi Direct -->
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.CHANGE_NETWORK_STATE" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Required permissions for Bluetooth -->
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />

<!-- Storage permissions -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" />
```

### Step 5: Register the Native Plugins

Add the plugin class registrations to your MainActivity.java:

```java
// Add these imports
import app.lovable.fileshare.WifiDirectPlugin;
import app.lovable.fileshare.BluetoothPlugin;

// Inside the MainActivity class, add this in the onCreate method:
registerPlugin(WifiDirectPlugin.class);
registerPlugin(BluetoothPlugin.class);
```

### Step 6: Copy Custom Plugin Files to Android Project

Copy the `WifiDirectPlugin.java` and `BluetoothPlugin.java` files to:
`android/app/src/main/java/app/lovable/fileshare/`

You may need to create the directory structure if it doesn't exist.

## Building and Installing

### Option 1: Using Android Studio

```bash
npx cap open android
```

This will open the project in Android Studio. From there:
1. Connect your Android device via USB
2. Enable Developer Options and USB Debugging on your device
3. Select your device from the device dropdown in Android Studio
4. Click the "Run" button to build and install the app

### Option 2: Using Command Line

```bash
npx cap run android
```

This will build and install the app on a connected device or emulator.

## Testing on Multiple Devices

For proper testing of file transfers, you'll need:

1. At least two physical Android devices
2. Both devices running the FileShare app
3. WiFi and/or Bluetooth enabled on both devices
4. Location permissions granted on both devices

## Step-by-Step Testing

1. **Launch the app on both devices**
2. **On receiving device:**
   - Go to "Receive Files" tab
   - The device will start listening for connections
3. **On sending device:**
   - Go to "Send Files" tab
   - Select "Choose Device"
   - Wait for the app to discover the receiving device
   - Select the receiving device
   - Select files to send
   - Tap "Send" button
4. **On receiving device:**
   - Accept the incoming file transfer
5. **Both devices:**
   - Monitor transfer progress
   - View completed transfers in the History tab

## Troubleshooting WiFi Direct Connections

1. **Ensure WiFi is enabled** on both devices
2. **Enable Location services** as Android requires this for WiFi Direct discovery
3. **Stay within range** - devices should be within 100 feet (30 meters) of each other
4. **Restart WiFi** on both devices if discovery fails
5. **Check Android version compatibility** - some features may vary across Android versions

## Troubleshooting Bluetooth Connections

1. **Ensure Bluetooth is enabled** on both devices
2. **Pre-pair devices** through Android's Bluetooth settings if connection fails
3. **Stay within range** - devices should be within 30 feet (10 meters) of each other
4. **Restart Bluetooth** if discovery fails
5. **Check for interference** from other Bluetooth devices

## Reporting Issues

If you encounter bugs or issues:

1. Note the specific error message (if any)
2. Document the steps to reproduce the issue
3. Note the Android version and device model
4. Report the issue on GitHub with this information

## Performance Optimization

- **WiFi Direct** is faster (up to 250Mbps) but requires location permissions
- **Bluetooth** is more widely compatible but slower (up to 3Mbps)
- For large files, keep devices close together and ensure they don't enter sleep mode
- Close unnecessary apps to free up memory and processing power

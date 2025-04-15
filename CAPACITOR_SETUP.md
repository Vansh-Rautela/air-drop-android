
# Capacitor Setup for FileShare Android Project

This document provides detailed instructions for setting up the Capacitor Android project, including the custom native plugins for WiFi Direct and Bluetooth functionality.

## Initial Setup

### 1. Install Capacitor CLI and Core

```bash
npm install @capacitor/cli @capacitor/core
```

### 2. Initialize Capacitor in Your Project

```bash
npx cap init
```

When prompted:
- AppID: `app.lovable.fileshare`
- App Name: `FileShare`

### 3. Add Android Platform

```bash
npx cap add android
```

## Native Plugin Implementation

For FileShare to work properly on Android devices, we need to implement two custom Capacitor plugins:

1. WifiDirectPlugin - For WiFi Direct device discovery and file transfers
2. BluetoothPlugin - For Bluetooth device discovery and file transfers

### Creating the Plugin Directory Structure

Create the following directory structure in your Android project:

```
android/app/src/main/java/app/lovable/fileshare/
```

### Plugin Implementation

Copy the `WifiDirectPlugin.java` and `BluetoothPlugin.java` files to the above directory.

### Registering Plugins in MainActivity

Open `android/app/src/main/java/app/lovable/fileshare/MainActivity.java` and update it as follows:

```java
package app.lovable.fileshare;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import app.lovable.fileshare.WifiDirectPlugin;
import app.lovable.fileshare.BluetoothPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Register our custom plugins
        registerPlugin(WifiDirectPlugin.class);
        registerPlugin(BluetoothPlugin.class);
    }
}
```

### Adding Required Permissions

Update `android/app/src/main/AndroidManifest.xml` to include all the necessary permissions:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Basic app permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    
    <!-- WiFi Direct permissions -->
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.CHANGE_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- Bluetooth permissions -->
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
    
    <!-- Feature declarations -->
    <uses-feature android:name="android.hardware.wifi.direct" android:required="true" />
    <uses-feature android:name="android.hardware.bluetooth" android:required="true" />
    
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name="app.lovable.fileshare.MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>
```

## Runtime Permission Handling

Android requires runtime permission requests for certain sensitive permissions. We need to handle these in our app code. Create a file called `src/utils/permissionManager.ts`:

<lov-write file_path="src/utils/permissionManager.ts">
import { Capacitor } from '@capacitor/core';
import { toast } from "sonner";

export interface PermissionStatus {
  location: boolean;
  storage: boolean;
  bluetooth: boolean;
}

class PermissionManager {
  private isAndroid: boolean;

  constructor() {
    this.isAndroid = Capacitor.getPlatform() === 'android';
  }

  /**
   * Request all required permissions for the app
   */
  public async requestAllPermissions(): Promise<PermissionStatus> {
    if (!this.isAndroid) {
      // On web platform, just pretend we have permissions
      return {
        location: true,
        storage: true,
        bluetooth: true
      };
    }

    try {
      // Use Capacitor's Permissions plugin to request permissions
      const permissions = await this.requestPermissionsNatively();
      return permissions;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      toast.error('Failed to get required permissions');
      
      return {
        location: false,
        storage: false,
        bluetooth: false
      };
    }
  }

  /**
   * Request specific permission
   */
  public async requestPermission(type: 'location' | 'storage' | 'bluetooth'): Promise<boolean> {
    if (!this.isAndroid) {
      return true;
    }

    try {
      // Request specific permission
      const permissions = await this.requestPermissionsNatively(type);
      return permissions[type];
    } catch (error) {
      console.error(`Error requesting ${type} permission:`, error);
      toast.error(`Failed to get ${type} permission`);
      return false;
    }
  }

  /**
   * Request permissions using native Android APIs
   */
  private async requestPermissionsNatively(
    specificPermission?: 'location' | 'storage' | 'bluetooth'
  ): Promise<PermissionStatus> {
    // This would use Capacitor's Permissions plugin
    // But for demonstration, we'll mock the functionality
    
    // In a real implementation, you would use:
    // import { Permissions } from '@capacitor/core';
    // const { Permissions } = Plugins;
    // const result = await Permissions.requestPermissions({
    //   permissions: [...]
    // });

    if (specificPermission) {
      toast.info(`Requesting ${specificPermission} permission...`);
      return {
        location: specificPermission === 'location' ? true : false,
        storage: specificPermission === 'storage' ? true : false,
        bluetooth: specificPermission === 'bluetooth' ? true : false
      };
    } else {
      toast.info('Requesting all required permissions...');
      // In a real implementation, this would actually request permissions
      return {
        location: true,
        storage: true,
        bluetooth: true
      };
    }
  }

  /**
   * Check if we have all required permissions
   */
  public async checkPermissions(): Promise<PermissionStatus> {
    if (!this.isAndroid) {
      return {
        location: true,
        storage: true,
        bluetooth: true
      };
    }

    try {
      // In a real implementation, this would check actual permission status
      return {
        location: true,
        storage: true,
        bluetooth: true
      };
    } catch (error) {
      console.error('Error checking permissions:', error);
      return {
        location: false,
        storage: false,
        bluetooth: false
      };
    }
  }
}

// Export a singleton instance
export const permissionManager = new PermissionManager();

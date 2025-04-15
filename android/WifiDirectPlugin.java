
package app.lovable.fileshare;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.wifi.WpsInfo;
import android.net.wifi.p2p.WifiP2pConfig;
import android.net.wifi.p2p.WifiP2pDevice;
import android.net.wifi.p2p.WifiP2pDeviceList;
import android.net.wifi.p2p.WifiP2pGroup;
import android.net.wifi.p2p.WifiP2pInfo;
import android.net.wifi.p2p.WifiP2pManager;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "WifiDirect")
public class WifiDirectPlugin extends Plugin {
    private static final String TAG = "WifiDirectPlugin";
    private static final int PORT = 8988;
    private static final int SOCKET_TIMEOUT = 5000;
    
    private WifiP2pManager manager;
    private WifiP2pManager.Channel channel;
    private BroadcastReceiver receiver;
    private IntentFilter intentFilter;
    private boolean isReceiverRegistered = false;
    
    private List<WifiP2pDevice> peers = new ArrayList<>();
    private WifiP2pInfo connectionInfo;
    
    private ServerSocket serverSocket;
    private ExecutorService executorService;
    private Map<String, TransferTask> activeTransfers = new HashMap<>();
    
    /**
     * Initialize the WiFi P2P manager and channel
     */
    @PluginMethod
    public void initialize(PluginCall call) {
        try {
            // Initialize WifiP2pManager and Channel
            manager = (WifiP2pManager) getContext().getSystemService(Context.WIFI_P2P_SERVICE);
            if (manager == null) {
                call.reject("WifiP2pManager is not available on this device");
                return;
            }
            
            channel = manager.initialize(getContext(), Looper.getMainLooper(), null);
            if (channel == null) {
                call.reject("Failed to initialize WifiP2pManager channel");
                return;
            }
            
            // Setup intent filter for P2P broadcasts
            intentFilter = new IntentFilter();
            intentFilter.addAction(WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION);
            intentFilter.addAction(WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION);
            intentFilter.addAction(WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION);
            intentFilter.addAction(WifiP2pManager.WIFI_P2P_THIS_DEVICE_CHANGED_ACTION);
            
            // Create and register broadcast receiver
            receiver = new WifiDirectBroadcastReceiver();
            getContext().registerReceiver(receiver, intentFilter);
            isReceiverRegistered = true;
            
            // Initialize executor service for file transfers
            executorService = Executors.newCachedThreadPool();
            
            JSObject result = new JSObject();
            result.put("status", "initialized");
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize WiFi Direct", e);
            call.reject("Failed to initialize WiFi Direct: " + e.getMessage());
        }
    }
    
    /**
     * Start device discovery
     */
    @PluginMethod
    public void startDiscovery(PluginCall call) {
        if (manager == null || channel == null) {
            call.reject("WiFi Direct not initialized");
            return;
        }
        
        manager.discoverPeers(channel, new WifiP2pManager.ActionListener() {
            @Override
            public void onSuccess() {
                JSObject result = new JSObject();
                result.put("status", "discovering");
                call.resolve(result);
            }
            
            @Override
            public void onFailure(int reason) {
                String errorMsg = getErrorMessage(reason);
                call.reject("Failed to start discovery: " + errorMsg);
            }
        });
    }
    
    /**
     * Stop device discovery
     */
    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        if (manager == null || channel == null) {
            call.reject("WiFi Direct not initialized");
            return;
        }
        
        manager.stopPeerDiscovery(channel, new WifiP2pManager.ActionListener() {
            @Override
            public void onSuccess() {
                JSObject result = new JSObject();
                result.put("status", "stopped");
                call.resolve(result);
            }
            
            @Override
            public void onFailure(int reason) {
                String errorMsg = getErrorMessage(reason);
                call.reject("Failed to stop discovery: " + errorMsg);
            }
        });
    }
    
    /**
     * Get list of available devices
     */
    @PluginMethod
    public void getAvailableDevices(PluginCall call) {
        JSObject result = new JSObject();
        JSArray deviceArray = new JSArray();
        
        for (WifiP2pDevice device : peers) {
            JSObject deviceObj = new JSObject();
            deviceObj.put("address", device.deviceAddress);
            deviceObj.put("name", device.deviceName);
            deviceObj.put("status", getDeviceStatus(device.status));
            deviceObj.put("isGroupOwner", device.isGroupOwner());
            
            deviceArray.put(deviceObj);
        }
        
        result.put("devices", deviceArray);
        call.resolve(result);
    }
    
    /**
     * Connect to a specific device
     */
    @PluginMethod
    public void connectToDevice(PluginCall call) {
        if (manager == null || channel == null) {
            call.reject("WiFi Direct not initialized");
            return;
        }
        
        String deviceAddress = call.getString("deviceAddress");
        if (deviceAddress == null || deviceAddress.isEmpty()) {
            call.reject("Device address is required");
            return;
        }
        
        // Find the device in our list
        WifiP2pDevice targetDevice = null;
        for (WifiP2pDevice device : peers) {
            if (device.deviceAddress.equals(deviceAddress)) {
                targetDevice = device;
                break;
            }
        }
        
        if (targetDevice == null) {
            call.reject("Device not found in available devices list");
            return;
        }
        
        // Set up connection config
        WifiP2pConfig config = new WifiP2pConfig();
        config.deviceAddress = deviceAddress;
        config.wps.setup = WpsInfo.PBC;
        
        manager.connect(channel, config, new WifiP2pManager.ActionListener() {
            @Override
            public void onSuccess() {
                // Connection initiated, actual connection state will be notified through broadcasts
                JSObject result = new JSObject();
                result.put("status", "connecting");
                call.resolve(result);
            }
            
            @Override
            public void onFailure(int reason) {
                String errorMsg = getErrorMessage(reason);
                call.reject("Failed to connect: " + errorMsg);
            }
        });
    }
    
    /**
     * Disconnect from current device
     */
    @PluginMethod
    public void disconnectFromDevice(PluginCall call) {
        if (manager == null || channel == null) {
            call.reject("WiFi Direct not initialized");
            return;
        }
        
        manager.removeGroup(channel, new WifiP2pManager.ActionListener() {
            @Override
            public void onSuccess() {
                JSObject result = new JSObject();
                result.put("status", "disconnected");
                call.resolve(result);
            }
            
            @Override
            public void onFailure(int reason) {
                // If we're not currently in a group, this is expected
                if (reason == WifiP2pManager.ERROR_BUSY) {
                    JSObject result = new JSObject();
                    result.put("status", "disconnected");
                    call.resolve(result);
                } else {
                    String errorMsg = getErrorMessage(reason);
                    call.reject("Failed to disconnect: " + errorMsg);
                }
            }
        });
    }
    
    /**
     * Create a P2P group (become group owner)
     */
    @PluginMethod
    public void createGroup(PluginCall call) {
        if (manager == null || channel == null) {
            call.reject("WiFi Direct not initialized");
            return;
        }
        
        manager.createGroup(channel, new WifiP2pManager.ActionListener() {
            @Override
            public void onSuccess() {
                JSObject result = new JSObject();
                result.put("status", "creating_group");
                call.resolve(result);
            }
            
            @Override
            public void onFailure(int reason) {
                String errorMsg = getErrorMessage(reason);
                call.reject("Failed to create group: " + errorMsg);
            }
        });
    }
    
    /**
     * Remove current P2P group
     */
    @PluginMethod
    public void removeGroup(PluginCall call) {
        if (manager == null || channel == null) {
            call.reject("WiFi Direct not initialized");
            return;
        }
        
        manager.removeGroup(channel, new WifiP2pManager.ActionListener() {
            @Override
            public void onSuccess() {
                JSObject result = new JSObject();
                result.put("status", "group_removed");
                call.resolve(result);
            }
            
            @Override
            public void onFailure(int reason) {
                String errorMsg = getErrorMessage(reason);
                call.reject("Failed to remove group: " + errorMsg);
            }
        });
    }
    
    /**
     * Send a file to connected device
     */
    @PluginMethod
    public void sendFile(PluginCall call) {
        String filePath = call.getString("filePath");
        String deviceAddress = call.getString("deviceAddress");
        
        if (filePath == null || filePath.isEmpty()) {
            call.reject("File path is required");
            return;
        }
        
        if (deviceAddress == null || deviceAddress.isEmpty()) {
            call.reject("Device address is required");
            return;
        }
        
        if (connectionInfo == null || !connectionInfo.groupFormed) {
            call.reject("Not connected to any device");
            return;
        }
        
        File file = new File(filePath);
        if (!file.exists()) {
            call.reject("File does not exist: " + filePath);
            return;
        }
        
        // Generate a unique transfer ID
        String transferId = UUID.randomUUID().toString();
        
        // Create a transfer task
        TransferTask transferTask = new TransferTask(transferId, file, deviceAddress);
        activeTransfers.put(transferId, transferTask);
        
        // Start the transfer in a background thread
        executorService.execute(() -> {
            try {
                // If we're the group owner, we're the server
                if (connectionInfo.isGroupOwner) {
                    // Wait for client connection if server
                    if (serverSocket == null) {
                        serverSocket = new ServerSocket(PORT);
                    }
                    
                    // Notify frontend that we're waiting for client
                    notifyTransferStatus(transferId, 0, file.length(), "in_progress");
                    
                    Socket client = serverSocket.accept();
                    transferFile(transferTask, client);
                } else {
                    // Connect to group owner as client
                    InetAddress serverAddress = connectionInfo.groupOwnerAddress;
                    Socket socket = new Socket();
                    socket.connect(new InetSocketAddress(serverAddress, PORT), SOCKET_TIMEOUT);
                    
                    transferFile(transferTask, socket);
                }
            } catch (IOException e) {
                Log.e(TAG, "Error sending file", e);
                notifyTransferFailed(transferId, "Failed to send file: " + e.getMessage());
            }
        });
        
        // Return the transfer ID immediately
        JSObject result = new JSObject();
        result.put("transferId", transferId);
        call.resolve(result);
    }
    
    /**
     * Cancel an ongoing transfer
     */
    @PluginMethod
    public void cancelTransfer(PluginCall call) {
        String transferId = call.getString("transferId");
        
        if (transferId == null || transferId.isEmpty()) {
            call.reject("Transfer ID is required");
            return;
        }
        
        TransferTask task = activeTransfers.get(transferId);
        if (task == null) {
            call.reject("No active transfer with ID: " + transferId);
            return;
        }
        
        task.cancel();
        activeTransfers.remove(transferId);
        
        notifyTransferStatus(transferId, 0, 0, "cancelled");
        
        JSObject result = new JSObject();
        result.put("status", "cancelled");
        call.resolve(result);
    }
    
    /**
     * Clean up resources when plugin is destroyed
     */
    @Override
    protected void handleOnDestroy() {
        if (isReceiverRegistered) {
            getContext().unregisterReceiver(receiver);
            isReceiverRegistered = false;
        }
        
        if (serverSocket != null) {
            try {
                serverSocket.close();
            } catch (IOException e) {
                Log.e(TAG, "Error closing server socket", e);
            }
        }
        
        if (executorService != null) {
            executorService.shutdown();
        }
        
        super.handleOnDestroy();
    }
    
    /**
     * Transfer a file through an open socket
     */
    private void transferFile(TransferTask task, Socket socket) throws IOException {
        File file = task.getFile();
        long fileSize = file.length();
        
        OutputStream outputStream = socket.getOutputStream();
        InputStream inputStream = new FileInputStream(file);
        
        // Send file name and size first
        String header = file.getName() + "," + fileSize + "\n";
        outputStream.write(header.getBytes());
        
        // Send file data
        byte[] buffer = new byte[4096];
        int bytesRead;
        long totalBytesRead = 0;
        
        while ((bytesRead = inputStream.read(buffer)) != -1) {
            if (task.isCancelled()) {
                break;
            }
            
            outputStream.write(buffer, 0, bytesRead);
            totalBytesRead += bytesRead;
            
            // Update progress
            notifyTransferStatus(task.getTransferId(), totalBytesRead, fileSize, "in_progress");
        }
        
        outputStream.close();
        inputStream.close();
        socket.close();
        
        if (!task.isCancelled()) {
            // Transfer completed successfully
            notifyTransferCompleted(task.getTransferId(), file.getAbsolutePath());
        }
        
        // Remove from active transfers
        activeTransfers.remove(task.getTransferId());
    }
    
    /**
     * Notify the frontend about transfer progress
     */
    private void notifyTransferStatus(String transferId, long bytesTransferred, long totalBytes, String status) {
        JSObject statusObj = new JSObject();
        statusObj.put("transferId", transferId);
        statusObj.put("bytesTransferred", bytesTransferred);
        statusObj.put("totalBytes", totalBytes);
        statusObj.put("status", status);
        
        notifyListeners("transferProgress", statusObj);
    }
    
    /**
     * Notify the frontend about transfer completion
     */
    private void notifyTransferCompleted(String transferId, String filePath) {
        JSObject statusObj = new JSObject();
        statusObj.put("transferId", transferId);
        statusObj.put("filePath", filePath);
        statusObj.put("status", "completed");
        
        notifyListeners("transferCompleted", statusObj);
    }
    
    /**
     * Notify the frontend about transfer failure
     */
    private void notifyTransferFailed(String transferId, String error) {
        JSObject statusObj = new JSObject();
        statusObj.put("transferId", transferId);
        statusObj.put("error", error);
        statusObj.put("status", "failed");
        
        notifyListeners("transferFailed", statusObj);
    }
    
    /**
     * Broadcast receiver for WiFi Direct events
     */
    private class WifiDirectBroadcastReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            
            if (WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION.equals(action)) {
                int state = intent.getIntExtra(WifiP2pManager.EXTRA_WIFI_STATE, -1);
                boolean isEnabled = state == WifiP2pManager.WIFI_P2P_STATE_ENABLED;
                
                JSObject stateObj = new JSObject();
                stateObj.put("enabled", isEnabled);
                notifyListeners("wifiP2pStateChanged", stateObj);
                
            } else if (WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION.equals(action)) {
                if (manager != null) {
                    manager.requestPeers(channel, peerListListener);
                }
                
            } else if (WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION.equals(action)) {
                if (manager != null) {
                    manager.requestConnectionInfo(channel, connectionInfoListener);
                }
                
            } else if (WifiP2pManager.WIFI_P2P_THIS_DEVICE_CHANGED_ACTION.equals(action)) {
                WifiP2pDevice device = intent.getParcelableExtra(WifiP2pManager.EXTRA_WIFI_P2P_DEVICE);
                
                if (device != null) {
                    JSObject deviceObj = new JSObject();
                    deviceObj.put("address", device.deviceAddress);
                    deviceObj.put("name", device.deviceName);
                    deviceObj.put("status", getDeviceStatus(device.status));
                    
                    notifyListeners("thisDeviceChanged", deviceObj);
                }
            }
        }
    }
    
    /**
     * Listener for peer list changes
     */
    private WifiP2pManager.PeerListListener peerListListener = new WifiP2pManager.PeerListListener() {
        @Override
        public void onPeersAvailable(WifiP2pDeviceList peerList) {
            List<WifiP2pDevice> refreshedPeers = new ArrayList<>(peerList.getDeviceList());
            
            if (!refreshedPeers.equals(peers)) {
                peers.clear();
                peers.addAll(refreshedPeers);
                
                // Notify about each new device discovered
                for (WifiP2pDevice device : refreshedPeers) {
                    JSObject deviceObj = new JSObject();
                    JSObject deviceData = new JSObject();
                    
                    deviceData.put("address", device.deviceAddress);
                    deviceData.put("name", device.deviceName);
                    deviceData.put("status", getDeviceStatus(device.status));
                    deviceData.put("isGroupOwner", device.isGroupOwner());
                    
                    deviceObj.put("device", deviceData);
                    notifyListeners("deviceDiscovered", deviceObj);
                }
            }
        }
    };
    
    /**
     * Listener for connection info changes
     */
    private WifiP2pManager.ConnectionInfoListener connectionInfoListener = new WifiP2pManager.ConnectionInfoListener() {
        @Override
        public void onConnectionInfoAvailable(WifiP2pInfo info) {
            connectionInfo = info;
            
            JSObject connectionObj = new JSObject();
            connectionObj.put("groupFormed", info.groupFormed);
            connectionObj.put("isGroupOwner", info.isGroupOwner);
            
            if (info.groupFormed) {
                connectionObj.put("groupOwnerAddress", info.groupOwnerAddress.getHostAddress());
                
                if (info.isGroupOwner) {
                    // Start server socket if we're the group owner
                    startServerSocket();
                }
                
                // Find the connected device
                for (WifiP2pDevice device : peers) {
                    if (device.status == WifiP2pDevice.CONNECTED) {
                        connectionObj.put("connected", true);
                        connectionObj.put("deviceAddress", device.deviceAddress);
                        break;
                    }
                }
                
                notifyListeners("connectionStateChanged", connectionObj);
            } else {
                connectionObj.put("connected", false);
                notifyListeners("connectionStateChanged", connectionObj);
            }
        }
    };
    
    /**
     * Start the server socket for receiving files
     */
    private void startServerSocket() {
        if (serverSocket != null) return;
        
        executorService.execute(() -> {
            try {
                serverSocket = new ServerSocket(PORT);
                
                while (!Thread.currentThread().isInterrupted()) {
                    try {
                        Socket client = serverSocket.accept();
                        handleIncomingFile(client);
                    } catch (IOException e) {
                        if (serverSocket.isClosed()) {
                            break;
                        }
                        Log.e(TAG, "Error accepting client connection", e);
                    }
                }
            } catch (IOException e) {
                Log.e(TAG, "Could not start server socket", e);
            }
        });
    }
    
    /**
     * Handle an incoming file transfer
     */
    private void handleIncomingFile(Socket socket) {
        executorService.execute(() -> {
            try {
                InputStream inputStream = socket.getInputStream();
                
                // Read file name and size
                StringBuilder headerBuilder = new StringBuilder();
                int c;
                while ((c = inputStream.read()) != -1 && c != '\n') {
                    headerBuilder.append((char) c);
                }
                
                String header = headerBuilder.toString();
                String[] parts = header.split(",");
                if (parts.length != 2) {
                    throw new IOException("Invalid file header");
                }
                
                String fileName = parts[0];
                long fileSize = Long.parseLong(parts[1]);
                
                // Generate a transfer ID for this incoming file
                String transferId = UUID.randomUUID().toString();
                
                // Create output file in downloads directory
                File outputDir = new File(getContext().getExternalFilesDir(null), "Received");
                if (!outputDir.exists()) {
                    outputDir.mkdirs();
                }
                
                File outputFile = new File(outputDir, fileName);
                FileOutputStream fileOutputStream = new FileOutputStream(outputFile);
                
                // Notify about the incoming file
                JSObject incomingObj = new JSObject();
                incomingObj.put("transferId", transferId);
                incomingObj.put("fileName", fileName);
                incomingObj.put("fileSize", fileSize);
                notifyListeners("incomingFile", incomingObj);
                
                // Read the file data and write to output file
                byte[] buffer = new byte[4096];
                int bytesRead;
                long totalBytesRead = 0;
                
                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    fileOutputStream.write(buffer, 0, bytesRead);
                    totalBytesRead += bytesRead;
                    
                    // Update progress
                    notifyTransferStatus(transferId, totalBytesRead, fileSize, "in_progress");
                }
                
                fileOutputStream.close();
                inputStream.close();
                socket.close();
                
                // Notify that transfer is complete
                notifyTransferCompleted(transferId, outputFile.getAbsolutePath());
                
            } catch (IOException e) {
                Log.e(TAG, "Error receiving file", e);
            }
        });
    }
    
    /**
     * Get a human-readable device status string
     */
    private String getDeviceStatus(int deviceStatus) {
        switch (deviceStatus) {
            case WifiP2pDevice.AVAILABLE:
                return "available";
            case WifiP2pDevice.INVITED:
                return "invited";
            case WifiP2pDevice.CONNECTED:
                return "connected";
            case WifiP2pDevice.FAILED:
                return "failed";
            case WifiP2pDevice.UNAVAILABLE:
                return "unavailable";
            default:
                return "unknown";
        }
    }
    
    /**
     * Get a human-readable error message for WiFi P2P errors
     */
    private String getErrorMessage(int reason) {
        switch (reason) {
            case WifiP2pManager.P2P_UNSUPPORTED:
                return "P2P is not supported on this device";
            case WifiP2pManager.ERROR:
                return "Operation failed due to internal error";
            case WifiP2pManager.BUSY:
                return "Framework is busy and unable to service the request";
            default:
                return "Unknown error (code: " + reason + ")";
        }
    }
    
    /**
     * Class to track a file transfer task
     */
    private class TransferTask {
        private final String transferId;
        private final File file;
        private final String deviceAddress;
        private boolean cancelled = false;
        
        public TransferTask(String transferId, File file, String deviceAddress) {
            this.transferId = transferId;
            this.file = file;
            this.deviceAddress = deviceAddress;
        }
        
        public String getTransferId() {
            return transferId;
        }
        
        public File getFile() {
            return file;
        }
        
        public String getDeviceAddress() {
            return deviceAddress;
        }
        
        public boolean isCancelled() {
            return cancelled;
        }
        
        public void cancel() {
            this.cancelled = true;
        }
    }
}


package app.lovable.fileshare;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothServerSocket;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "Bluetooth")
public class BluetoothPlugin extends Plugin {
    private static final String TAG = "BluetoothPlugin";
    private static final UUID SERVICE_UUID = UUID.fromString("fa87c0d0-afac-11de-8a39-0800200c9a66");
    private static final String SERVICE_NAME = "FileShareBluetooth";
    
    private BluetoothAdapter bluetoothAdapter;
    private BroadcastReceiver receiver;
    private boolean isReceiverRegistered = false;
    
    private List<BluetoothDevice> devices = new ArrayList<>();
    private Map<String, BluetoothSocket> connectedSockets = new HashMap<>();
    private Map<String, TransferTask> activeTransfers = new HashMap<>();
    
    private ExecutorService executorService;
    private BluetoothServerSocket serverSocket;
    private boolean isServerRunning = false;
    
    /**
     * Initialize Bluetooth adapter and register receivers
     */
    @PluginMethod
    public void initialize(PluginCall call) {
        try {
            bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
            
            if (bluetoothAdapter == null) {
                call.reject("Bluetooth is not supported on this device");
                return;
            }
            
            // Setup broadcast receiver for Bluetooth events
            IntentFilter filter = new IntentFilter();
            filter.addAction(BluetoothDevice.ACTION_FOUND);
            filter.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
            filter.addAction(BluetoothAdapter.ACTION_STATE_CHANGED);
            filter.addAction(BluetoothDevice.ACTION_BOND_STATE_CHANGED);
            
            receiver = new BluetoothBroadcastReceiver();
            getContext().registerReceiver(receiver, filter);
            isReceiverRegistered = true;
            
            // Initialize executor service for file transfers
            executorService = Executors.newCachedThreadPool();
            
            JSObject result = new JSObject();
            result.put("status", "initialized");
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize Bluetooth", e);
            call.reject("Failed to initialize Bluetooth: " + e.getMessage());
        }
    }
    
    /**
     * Check if Bluetooth is enabled
     */
    @PluginMethod
    public void isEnabled(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth is not supported on this device");
            return;
        }
        
        JSObject result = new JSObject();
        result.put("enabled", bluetoothAdapter.isEnabled());
        call.resolve(result);
    }
    
    /**
     * Enable Bluetooth adapter
     */
    @PluginMethod
    public void enableBluetooth(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth is not supported on this device");
            return;
        }
        
        if (!bluetoothAdapter.isEnabled()) {
            Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
            startActivityForResult(call, enableBtIntent, "enableBluetoothResult");
        } else {
            JSObject result = new JSObject();
            result.put("status", "already_enabled");
            call.resolve(result);
        }
    }
    
    /**
     * Handle the result of enabling Bluetooth
     */
    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);
        
        PluginCall savedCall = bridge.getSavedCall(String.valueOf(requestCode));
        if (savedCall == null) {
            return;
        }
        
        if ("enableBluetoothResult".equals(savedCall.getMethodName())) {
            if (resultCode == android.app.Activity.RESULT_OK) {
                JSObject result = new JSObject();
                result.put("status", "enabled");
                savedCall.resolve(result);
            } else {
                savedCall.reject("User denied Bluetooth activation");
            }
            
            bridge.releaseCall(savedCall);
        }
    }
    
    /**
     * Start discovering Bluetooth devices
     */
    @PluginMethod
    public void startDiscovery(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth is not supported on this device");
            return;
        }
        
        if (!bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth is not enabled");
            return;
        }
        
        // Clear previous devices that aren't paired or connected
        devices.removeIf(device -> device.getBondState() != BluetoothDevice.BOND_BONDED);
        
        // Add paired devices first
        Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
        for (BluetoothDevice device : pairedDevices) {
            if (!devices.contains(device)) {
                devices.add(device);
                notifyDeviceDiscovered(device);
            }
        }
        
        // Start discovery of new devices
        if (bluetoothAdapter.isDiscovering()) {
            bluetoothAdapter.cancelDiscovery();
        }
        
        boolean success = bluetoothAdapter.startDiscovery();
        
        if (success) {
            JSObject result = new JSObject();
            result.put("status", "discovering");
            call.resolve(result);
        } else {
            call.reject("Failed to start discovery");
        }
    }
    
    /**
     * Stop device discovery
     */
    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth is not supported on this device");
            return;
        }
        
        if (!bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth is not enabled");
            return;
        }
        
        if (bluetoothAdapter.isDiscovering()) {
            bluetoothAdapter.cancelDiscovery();
        }
        
        JSObject result = new JSObject();
        result.put("status", "stopped");
        call.resolve(result);
    }
    
    /**
     * Get list of available Bluetooth devices
     */
    @PluginMethod
    public void getAvailableDevices(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth is not supported on this device");
            return;
        }
        
        JSObject result = new JSObject();
        JSArray deviceArray = new JSArray();
        
        // Add paired devices if not already in the list
        Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
        for (BluetoothDevice device : pairedDevices) {
            if (!devices.contains(device)) {
                devices.add(device);
            }
        }
        
        for (BluetoothDevice device : devices) {
            JSObject deviceObj = new JSObject();
            deviceObj.put("address", device.getAddress());
            deviceObj.put("name", device.getName() != null ? device.getName() : "Unknown Device");
            deviceObj.put("paired", device.getBondState() == BluetoothDevice.BOND_BONDED);
            deviceObj.put("connected", connectedSockets.containsKey(device.getAddress()));
            deviceObj.put("type", getDeviceType(device));
            
            deviceArray.put(deviceObj);
        }
        
        result.put("devices", deviceArray);
        call.resolve(result);
    }
    
    /**
     * Pair with a Bluetooth device
     */
    @PluginMethod
    public void pairDevice(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth is not supported on this device");
            return;
        }
        
        String deviceAddress = call.getString("deviceAddress");
        if (deviceAddress == null || deviceAddress.isEmpty()) {
            call.reject("Device address is required");
            return;
        }
        
        // Find the device by address
        BluetoothDevice device = findDeviceByAddress(deviceAddress);
        if (device == null) {
            call.reject("Device not found");
            return;
        }
        
        // If already paired, return success
        if (device.getBondState() == BluetoothDevice.BOND_BONDED) {
            JSObject result = new JSObject();
            result.put("status", "already_paired");
            call.resolve(result);
            return;
        }
        
        // Start pairing process
        try {
            boolean pairingStarted = device.createBond();
            
            if (pairingStarted) {
                // Store the call to resolve later when pairing completes
                bridge.saveCall(call);
                
                // Set a timeout to reject the call if pairing takes too long
                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    if (call.isSaved()) {
                        call.reject("Pairing timed out");
                        bridge.releaseCall(call);
                    }
                }, 30000); // 30-second timeout
                
            } else {
                call.reject("Failed to initiate pairing");
            }
            
        } catch (Exception e) {
            call.reject("Error initiating pairing: " + e.getMessage());
        }
    }
    
    /**
     * Connect to a paired Bluetooth device
     */
    @PluginMethod
    public void connectToDevice(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth is not supported on this device");
            return;
        }
        
        String deviceAddress = call.getString("deviceAddress");
        if (deviceAddress == null || deviceAddress.isEmpty()) {
            call.reject("Device address is required");
            return;
        }
        
        // If already connected, return success
        if (connectedSockets.containsKey(deviceAddress)) {
            JSObject result = new JSObject();
            result.put("status", "connected");
            call.resolve(result);
            return;
        }
        
        // Find the device by address
        BluetoothDevice device = findDeviceByAddress(deviceAddress);
        if (device == null) {
            call.reject("Device not found");
            return;
        }
        
        // Cancel discovery if it's running
        if (bluetoothAdapter.isDiscovering()) {
            bluetoothAdapter.cancelDiscovery();
        }
        
        // Connect to the device in a background thread
        executorService.execute(() -> {
            try {
                // Create RFCOMM socket with the device
                BluetoothSocket socket = device.createRfcommSocketToServiceRecord(SERVICE_UUID);
                
                // Connect to the socket
                socket.connect();
                
                // Store the connected socket
                connectedSockets.put(deviceAddress, socket);
                
                // Notify connection state change
                JSObject connectionObj = new JSObject();
                connectionObj.put("connected", true);
                connectionObj.put("deviceAddress", deviceAddress);
                
                // Start listening for incoming files from this socket
                listenForIncomingData(socket, device);
                
                // Start server socket if not already running
                startServerSocketIfNeeded();
                
                Handler mainHandler = new Handler(Looper.getMainLooper());
                mainHandler.post(() -> {
                    notifyListeners("connectionStateChanged", connectionObj);
                    
                    JSObject result = new JSObject();
                    result.put("status", "connected");
                    call.resolve(result);
                });
                
            } catch (IOException e) {
                Log.e(TAG, "Error connecting to device: " + deviceAddress, e);
                
                Handler mainHandler = new Handler(Looper.getMainLooper());
                mainHandler.post(() -> {
                    call.reject("Failed to connect: " + e.getMessage());
                });
            }
        });
    }
    
    /**
     * Disconnect from a Bluetooth device
     */
    @PluginMethod
    public void disconnectFromDevice(PluginCall call) {
        String deviceAddress = call.getString("deviceAddress");
        if (deviceAddress == null || deviceAddress.isEmpty()) {
            call.reject("Device address is required");
            return;
        }
        
        // Check if connected
        BluetoothSocket socket = connectedSockets.get(deviceAddress);
        if (socket == null) {
            JSObject result = new JSObject();
            result.put("status", "not_connected");
            call.resolve(result);
            return;
        }
        
        // Close the socket
        try {
            socket.close();
            connectedSockets.remove(deviceAddress);
            
            // Notify connection state change
            JSObject connectionObj = new JSObject();
            connectionObj.put("connected", false);
            connectionObj.put("deviceAddress", deviceAddress);
            notifyListeners("connectionStateChanged", connectionObj);
            
            JSObject result = new JSObject();
            result.put("status", "disconnected");
            call.resolve(result);
            
        } catch (IOException e) {
            Log.e(TAG, "Error disconnecting from device: " + deviceAddress, e);
            call.reject("Failed to disconnect: " + e.getMessage());
        }
    }
    
    /**
     * Send a file to a connected device
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
        
        // Check if connected to the device
        BluetoothSocket socket = connectedSockets.get(deviceAddress);
        if (socket == null) {
            call.reject("Not connected to the device");
            return;
        }
        
        // Check if file exists
        File file = new File(filePath);
        if (!file.exists()) {
            call.reject("File does not exist: " + filePath);
            return;
        }
        
        // Generate unique transfer ID
        String transferId = UUID.randomUUID().toString();
        
        // Create transfer task
        TransferTask task = new TransferTask(transferId, file, deviceAddress);
        activeTransfers.put(transferId, task);
        
        // Start transfer in background thread
        executorService.execute(() -> {
            try {
                OutputStream outputStream = socket.getOutputStream();
                sendFileToStream(task, outputStream);
            } catch (IOException e) {
                Log.e(TAG, "Error sending file", e);
                notifyTransferFailed(transferId, "Failed to send file: " + e.getMessage());
            }
        });
        
        // Return transfer ID immediately
        JSObject result = new JSObject();
        result.put("transferId", transferId);
        call.resolve(result);
    }
    
    /**
     * Cancel an active transfer
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
        
        // Close all connected sockets
        for (BluetoothSocket socket : connectedSockets.values()) {
            try {
                socket.close();
            } catch (IOException e) {
                Log.e(TAG, "Error closing socket", e);
            }
        }
        
        connectedSockets.clear();
        
        // Close server socket if it's open
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
     * Find a device by its Bluetooth address
     */
    private BluetoothDevice findDeviceByAddress(String address) {
        // First check in our discovered devices list
        for (BluetoothDevice device : devices) {
            if (device.getAddress().equals(address)) {
                return device;
            }
        }
        
        // Then check in paired devices
        Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
        for (BluetoothDevice device : pairedDevices) {
            if (device.getAddress().equals(address)) {
                return device;
            }
        }
        
        // If not found, try to get the device directly by address
        try {
            return bluetoothAdapter.getRemoteDevice(address);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
    
    /**
     * Get the device type (classic, BLE, or dual)
     */
    private String getDeviceType(BluetoothDevice device) {
        try {
            int type = device.getType();
            switch (type) {
                case BluetoothDevice.DEVICE_TYPE_CLASSIC:
                    return "classic";
                case BluetoothDevice.DEVICE_TYPE_LE:
                    return "ble";
                case BluetoothDevice.DEVICE_TYPE_DUAL:
                    return "dual";
                default:
                    return "unknown";
            }
        } catch (Exception e) {
            return "classic";  // Default to classic if can't determine
        }
    }
    
    /**
     * Send a file through an output stream
     */
    private void sendFileToStream(TransferTask task, OutputStream outputStream) throws IOException {
        File file = task.getFile();
        long fileSize = file.length();
        
        // Send file name and size first
        String header = file.getName() + "," + fileSize + "\n";
        outputStream.write(header.getBytes());
        
        // Send file data
        FileInputStream inputStream = new FileInputStream(file);
        
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
        
        inputStream.close();
        
        if (!task.isCancelled()) {
            // Transfer completed successfully
            notifyTransferCompleted(task.getTransferId(), file.getAbsolutePath());
        }
        
        // Remove from active transfers
        activeTransfers.remove(task.getTransferId());
    }
    
    /**
     * Start listening for incoming data on a connected socket
     */
    private void listenForIncomingData(BluetoothSocket socket, BluetoothDevice device) {
        executorService.execute(() -> {
            try {
                InputStream inputStream = socket.getInputStream();
                
                while (socket.isConnected()) {
                    try {
                        // Wait for incoming file header
                        StringBuilder headerBuilder = new StringBuilder();
                        int c;
                        while ((c = inputStream.read()) != -1 && c != '\n') {
                            headerBuilder.append((char) c);
                        }
                        
                        if (c == -1) {
                            // End of stream, socket closed
                            break;
                        }
                        
                        String header = headerBuilder.toString();
                        String[] parts = header.split(",");
                        if (parts.length != 2) {
                            throw new IOException("Invalid file header");
                        }
                        
                        String fileName = parts[0];
                        long fileSize = Long.parseLong(parts[1]);
                        
                        // Generate transfer ID for this incoming file
                        String transferId = UUID.randomUUID().toString();
                        
                        // Create output file in downloads directory
                        File outputDir = new File(getContext().getExternalFilesDir(null), "Received");
                        if (!outputDir.exists()) {
                            outputDir.mkdirs();
                        }
                        
                        File outputFile = new File(outputDir, fileName);
                        FileOutputStream fileOutputStream = new FileOutputStream(outputFile);
                        
                        // Notify about incoming file
                        JSObject incomingObj = new JSObject();
                        incomingObj.put("transferId", transferId);
                        incomingObj.put("fileName", fileName);
                        incomingObj.put("fileSize", fileSize);
                        incomingObj.put("deviceAddress", device.getAddress());
                        notifyListeners("incomingFile", incomingObj);
                        
                        // Read file data and write to output
                        byte[] buffer = new byte[4096];
                        int bytesRead;
                        long totalBytesRead = 0;
                        
                        while (totalBytesRead < fileSize && (bytesRead = inputStream.read(buffer)) != -1) {
                            fileOutputStream.write(buffer, 0, bytesRead);
                            totalBytesRead += bytesRead;
                            
                            // Update progress
                            notifyTransferStatus(transferId, totalBytesRead, fileSize, "in_progress");
                        }
                        
                        fileOutputStream.close();
                        
                        // Notify transfer completion
                        notifyTransferCompleted(transferId, outputFile.getAbsolutePath());
                        
                    } catch (IOException e) {
                        if (!socket.isConnected()) {
                            break;
                        }
                        Log.e(TAG, "Error reading from socket", e);
                    }
                }
                
            } catch (IOException e) {
                Log.e(TAG, "Error with socket input stream", e);
            }
            
            // If we get here, the socket is closed or had an error
            try {
                socket.close();
            } catch (IOException e) {
                Log.e(TAG, "Error closing socket", e);
            }
            
            // Remove from connected sockets
            connectedSockets.remove(device.getAddress());
            
            // Notify connection state change
            JSObject connectionObj = new JSObject();
            connectionObj.put("connected", false);
            connectionObj.put("deviceAddress", device.getAddress());
            
            Handler mainHandler = new Handler(Looper.getMainLooper());
            mainHandler.post(() -> {
                notifyListeners("connectionStateChanged", connectionObj);
            });
        });
    }
    
    /**
     * Start a server socket for accepting connections if not already running
     */
    private void startServerSocketIfNeeded() {
        if (isServerRunning) return;
        
        executorService.execute(() -> {
            try {
                isServerRunning = true;
                serverSocket = bluetoothAdapter.listenUsingRfcommWithServiceRecord(SERVICE_NAME, SERVICE_UUID);
                
                while (!Thread.currentThread().isInterrupted()) {
                    try {
                        // Wait for a connection
                        BluetoothSocket socket = serverSocket.accept();
                        BluetoothDevice device = socket.getRemoteDevice();
                        
                        // Store connected socket
                        connectedSockets.put(device.getAddress(), socket);
                        
                        // Notify connection
                        JSObject connectionObj = new JSObject();
                        connectionObj.put("connected", true);
                        connectionObj.put("deviceAddress", device.getAddress());
                        
                        Handler mainHandler = new Handler(Looper.getMainLooper());
                        mainHandler.post(() -> {
                            notifyListeners("connectionStateChanged", connectionObj);
                        });
                        
                        // Start listening for data from this socket
                        listenForIncomingData(socket, device);
                        
                    } catch (IOException e) {
                        if (serverSocket == null || !serverSocket.isConnecting()) {
                            break;
                        }
                        Log.e(TAG, "Error accepting connection", e);
                    }
                }
                
            } catch (IOException e) {
                Log.e(TAG, "Error starting server socket", e);
            } finally {
                isServerRunning = false;
            }
        });
    }
    
    /**
     * Notify the frontend when a device is discovered
     */
    private void notifyDeviceDiscovered(BluetoothDevice device) {
        JSObject deviceObj = new JSObject();
        JSObject deviceData = new JSObject();
        
        deviceData.put("address", device.getAddress());
        deviceData.put("name", device.getName() != null ? device.getName() : "Unknown Device");
        deviceData.put("paired", device.getBondState() == BluetoothDevice.BOND_BONDED);
        deviceData.put("connected", connectedSockets.containsKey(device.getAddress()));
        deviceData.put("type", getDeviceType(device));
        
        deviceObj.put("device", deviceData);
        notifyListeners("deviceDiscovered", deviceObj);
    }
    
    /**
     * Notify about transfer progress
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
     * Notify about transfer completion
     */
    private void notifyTransferCompleted(String transferId, String filePath) {
        JSObject statusObj = new JSObject();
        statusObj.put("transferId", transferId);
        statusObj.put("filePath", filePath);
        statusObj.put("status", "completed");
        
        notifyListeners("transferCompleted", statusObj);
    }
    
    /**
     * Notify about transfer failure
     */
    private void notifyTransferFailed(String transferId, String error) {
        JSObject statusObj = new JSObject();
        statusObj.put("transferId", transferId);
        statusObj.put("error", error);
        statusObj.put("status", "failed");
        
        notifyListeners("transferFailed", statusObj);
    }
    
    /**
     * Bluetooth event receiver
     */
    private class BluetoothBroadcastReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            
            if (BluetoothDevice.ACTION_FOUND.equals(action)) {
                // Device found
                BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                if (device != null && !devices.contains(device)) {
                    devices.add(device);
                    notifyDeviceDiscovered(device);
                }
                
            } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(action)) {
                // Discovery finished
                JSObject obj = new JSObject();
                obj.put("status", "discovery_finished");
                notifyListeners("discoveryFinished", obj);
                
            } else if (BluetoothAdapter.ACTION_STATE_CHANGED.equals(action)) {
                // Bluetooth state changed
                int state = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR);
                
                JSObject stateObj = new JSObject();
                
                switch (state) {
                    case BluetoothAdapter.STATE_OFF:
                        stateObj.put("state", "off");
                        break;
                    case BluetoothAdapter.STATE_TURNING_OFF:
                        stateObj.put("state", "turning_off");
                        break;
                    case BluetoothAdapter.STATE_ON:
                        stateObj.put("state", "on");
                        break;
                    case BluetoothAdapter.STATE_TURNING_ON:
                        stateObj.put("state", "turning_on");
                        break;
                    default:
                        stateObj.put("state", "unknown");
                }
                
                notifyListeners("bluetoothStateChanged", stateObj);
                
            } else if (BluetoothDevice.ACTION_BOND_STATE_CHANGED.equals(action)) {
                // Bond state changed
                BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                int bondState = intent.getIntExtra(BluetoothDevice.EXTRA_BOND_STATE, BluetoothDevice.ERROR);
                
                if (device != null) {
                    JSObject bondObj = new JSObject();
                    bondObj.put("deviceAddress", device.getAddress());
                    
                    switch (bondState) {
                        case BluetoothDevice.BOND_BONDED:
                            bondObj.put("bondState", "bonded");
                            
                            // Resolve any pending pair device call
                            Handler mainHandler = new Handler(Looper.getMainLooper());
                            mainHandler.post(() -> {
                                for (PluginCall call : bridge.getSavedCalls()) {
                                    if ("pairDevice".equals(call.getMethodName())) {
                                        String callDeviceAddress = call.getString("deviceAddress");
                                        if (callDeviceAddress != null && callDeviceAddress.equals(device.getAddress())) {
                                            JSObject result = new JSObject();
                                            result.put("status", "paired");
                                            call.resolve(result);
                                            bridge.releaseCall(call);
                                        }
                                    }
                                }
                            });
                            break;
                        case BluetoothDevice.BOND_BONDING:
                            bondObj.put("bondState", "bonding");
                            break;
                        case BluetoothDevice.BOND_NONE:
                            bondObj.put("bondState", "none");
                            break;
                        default:
                            bondObj.put("bondState", "unknown");
                    }
                    
                    notifyListeners("bondStateChanged", bondObj);
                }
            }
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

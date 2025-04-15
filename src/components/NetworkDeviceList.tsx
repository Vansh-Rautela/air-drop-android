
import { Smartphone, RefreshCw, CheckCircle2, WifiIcon, Bluetooth } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { connectivityManager, NetworkDevice } from "../utils/connectivityManager";

interface NetworkDeviceListProps {
  onDeviceSelect?: (device: NetworkDevice) => void;
}

const NetworkDeviceList = ({ onDeviceSelect }: NetworkDeviceListProps) => {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  
  useEffect(() => {
    // Subscribe to device updates
    const unsubscribe = connectivityManager.subscribeToDevices(updatedDevices => {
      setDevices(updatedDevices);
      setIsScanning(connectivityManager.isCurrentlyScanning());
    });
    
    // Initial scan
    handleScan();
    
    return unsubscribe;
  }, []);
  
  const handleScan = () => {
    setIsScanning(true);
    
    connectivityManager.scanForDevices()
      .catch(error => {
        toast.error("Failed to scan for devices");
        console.error("Scan error:", error);
      })
      .finally(() => {
        setIsScanning(false);
      });
  };
  
  const handleSelectDevice = (device: NetworkDevice) => {
    if (device.status !== "available") return;
    
    connectivityManager.connectToDevice(device.id)
      .then(() => {
        if (onDeviceSelect) {
          onDeviceSelect(device);
        }
      })
      .catch(error => {
        console.error("Connection error:", error);
      });
  };
  
  const getStatusIcon = (status: NetworkDevice["status"]) => {
    switch (status) {
      case "connected":
        return <CheckCircle2 className="text-accent" size={18} />;
      case "connecting":
        return <RefreshCw className="text-file-blue animate-spin" size={18} />;
      default:
        return null;
    }
  };
  
  const getConnectionTypeIcon = (device: NetworkDevice) => {
    if (device.connectionType === "wifi") {
      return <WifiIcon size={14} className="text-file-blue" />;
    } else if (device.connectionType === "bluetooth") {
      return <Bluetooth size={14} className="text-indigo-500" />;
    }
    return null;
  };
  
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Available Devices</h2>
        <button 
          onClick={handleScan}
          disabled={isScanning}
          className="text-sm text-file-blue flex items-center gap-1"
        >
          <RefreshCw size={14} className={isScanning ? "animate-spin" : ""} />
          {isScanning ? "Scanning..." : "Scan"}
        </button>
      </div>
      
      {devices.length === 0 && !isScanning && (
        <div className="p-8 text-center text-gray-500 border border-dashed rounded-lg">
          No devices found. Try scanning again.
        </div>
      )}
      
      <div className="space-y-3">
        {devices.map(device => (
          <div 
            key={device.id}
            onClick={() => handleSelectDevice(device)}
            className={`p-4 rounded-lg border flex items-center justify-between ${
              device.status === "connected" 
                ? "border-accent bg-accent/5" 
                : "border-gray-200 bg-white"
            } ${device.status === "available" ? "cursor-pointer hover:border-file-blue" : ""}`}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gray-100 p-2">
                <Smartphone size={20} className="text-file-slate" />
              </div>
              <div>
                <span className="font-medium">{device.name}</span>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                  {getConnectionTypeIcon(device)}
                  <span>{device.connectionType === "wifi" ? "Wi-Fi Direct" : "Bluetooth"}</span>
                </div>
              </div>
            </div>
            {getStatusIcon(device.status)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NetworkDeviceList;


import { Smartphone, RefreshCw, CheckCircle2 } from "lucide-react";
import { useState } from "react";

interface Device {
  id: string;
  name: string;
  status: "available" | "connecting" | "connected";
}

interface DeviceListProps {
  onDeviceSelect?: (device: Device) => void;
}

const DeviceList = ({ onDeviceSelect }: DeviceListProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([
    { id: "device1", name: "Samsung Galaxy S21", status: "available" },
    { id: "device2", name: "Google Pixel 6", status: "available" },
    { id: "device3", name: "Xiaomi Mi 11", status: "available" }
  ]);
  
  const handleScan = () => {
    setIsScanning(true);
    
    // Simulate device scanning
    setTimeout(() => {
      setIsScanning(false);
    }, 2000);
  };
  
  const handleSelectDevice = (device: Device) => {
    if (device.status !== "available") return;
    
    // Update device status
    setDevices(devices.map(d => 
      d.id === device.id ? { ...d, status: "connecting" as const } : d
    ));
    
    // Simulate connection
    setTimeout(() => {
      const updatedDevices = devices.map(d => 
        d.id === device.id ? { ...d, status: "connected" as const } : d
      );
      
      setDevices(updatedDevices);
      const selectedDevice = updatedDevices.find(d => d.id === device.id);
      
      if (selectedDevice && onDeviceSelect) {
        onDeviceSelect(selectedDevice);
      }
    }, 1500);
  };
  
  const getStatusIcon = (status: Device["status"]) => {
    switch (status) {
      case "connected":
        return <CheckCircle2 className="text-accent" size={18} />;
      case "connecting":
        return <RefreshCw className="text-file-blue animate-spin" size={18} />;
      default:
        return null;
    }
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
              <span className="font-medium">{device.name}</span>
            </div>
            {getStatusIcon(device.status)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeviceList;

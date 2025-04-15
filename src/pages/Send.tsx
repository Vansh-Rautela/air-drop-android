
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import Header from "../components/Header";
import DeviceList from "../components/DeviceList";
import FileSelector from "../components/FileSelector";
import TransferProgress from "../components/TransferProgress";

interface Device {
  id: string;
  name: string;
  status: "available" | "connecting" | "connected";
}

interface FileItem {
  id: string;
  name: string;
  type: string;
  size: string;
  selected: boolean;
}

const SendPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"select_device" | "select_files" | "transferring">("select_device");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  
  const handleDeviceSelect = (device: Device) => {
    setSelectedDevice(device);
    setStep("select_files");
  };
  
  const handleFileSelection = (files: FileItem[]) => {
    setSelectedFiles(files);
  };
  
  const handleStartTransfer = () => {
    if (selectedFiles.length > 0) {
      setStep("transferring");
    }
  };
  
  const handleTransferComplete = () => {
    // Navigate to history after a short delay
    setTimeout(() => {
      navigate("/history");
    }, 2000);
  };
  
  const getTotalFileSize = () => {
    // For demo purposes, just add up the sizes (in real app would convert to bytes and sum)
    return "32.1 MB";
  };
  
  const renderStepContent = () => {
    switch (step) {
      case "select_device":
        return <DeviceList onDeviceSelect={handleDeviceSelect} />;
      
      case "select_files":
        return (
          <>
            <FileSelector onSelectionChange={handleFileSelection} />
            
            <div className="mt-auto pt-4">
              <button
                onClick={handleStartTransfer}
                disabled={selectedFiles.length === 0}
                className={`w-full button-primary flex items-center justify-center gap-2 ${
                  selectedFiles.length === 0 ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <Send size={18} />
                Send {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}
              </button>
            </div>
          </>
        );
      
      case "transferring":
        return (
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="section-title text-center mb-6">
              Sending to {selectedDevice?.name}
            </h2>
            <TransferProgress 
              totalFiles={selectedFiles.length} 
              totalSize={getTotalFileSize()} 
              onComplete={handleTransferComplete}
            />
          </div>
        );
    }
  };
  
  return (
    <div className="page-container">
      <Header title="Send Files" showBackButton={true} />
      {renderStepContent()}
    </div>
  );
};

export default SendPage;

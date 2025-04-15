
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import Header from "../components/Header";
import NetworkDeviceList from "../components/NetworkDeviceList";
import FileSelector from "../components/FileSelector";
import TransferProgress from "../components/TransferProgress";
import { NetworkDevice } from "../utils/connectivityManager";
import { TransferFile, transferManager } from "../utils/transferManager";

const SendPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"select_device" | "select_files" | "transferring">("select_device");
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<TransferFile[]>([]);
  
  const handleDeviceSelect = (device: NetworkDevice) => {
    setSelectedDevice(device);
    setStep("select_files");
  };
  
  const handleFileSelection = (files: TransferFile[]) => {
    setSelectedFiles(files);
  };
  
  const handleStartTransfer = () => {
    if (selectedFiles.length === 0 || !selectedDevice) return;
    
    transferManager.startTransfer(selectedDevice, selectedFiles)
      .then(() => {
        setStep("transferring");
      })
      .catch(error => {
        console.error("Transfer error:", error);
      });
  };
  
  const handleTransferComplete = () => {
    // Navigate to history after a delay
    setTimeout(() => {
      navigate("/history");
    }, 2000);
  };
  
  const renderStepContent = () => {
    switch (step) {
      case "select_device":
        return <NetworkDeviceList onDeviceSelect={handleDeviceSelect} />;
      
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
            <TransferProgress onComplete={handleTransferComplete} />
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

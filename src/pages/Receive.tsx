
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Wifi, Check, X } from "lucide-react";
import Header from "../components/Header";
import TransferProgress from "../components/TransferProgress";
import { connectivityManager, NetworkDevice } from "../utils/connectivityManager";
import { transferManager, TransferFile } from "../utils/transferManager";

const ReceivePage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"waiting" | "incoming" | "transferring" | "rejected">("waiting");
  const [incomingDevice, setIncomingDevice] = useState<NetworkDevice | null>(null);
  const [incomingFiles, setIncomingFiles] = useState<TransferFile[]>([]);
  const [totalSize, setTotalSize] = useState("");
  
  useEffect(() => {
    // Start listening for incoming connections
    const connectionListener = connectivityManager.subscribeToConnection(device => {
      if (device && status === "waiting") {
        simulateIncomingRequest(device);
      }
    });
    
    // Cleanup function
    return () => {
      connectionListener();
    };
  }, [status]);
  
  // Simulate an incoming transfer request
  const simulateIncomingRequest = (device: NetworkDevice) => {
    // In a real app, this would be triggered by actual incoming connection
    // For demo, we'll simulate it after a delay if a device connects while in waiting mode
    setTimeout(() => {
      if (status === "waiting") {
        setIncomingDevice(device);
        
        // Generate random files
        const randomFiles: TransferFile[] = [
          { id: "incoming1", name: "Photo_001.jpg", type: "image", size: "2.3 MB", sizeInBytes: 2411724, selected: true },
          { id: "incoming2", name: "Document.pdf", type: "document", size: "4.5 MB", sizeInBytes: 4718592, selected: true },
          { id: "incoming3", name: "Voice_Note.m4a", type: "audio", size: "8.9 MB", sizeInBytes: 9332531, selected: true }
        ];
        
        setIncomingFiles(randomFiles);
        
        // Calculate total size
        const totalBytes = randomFiles.reduce((sum, file) => sum + file.sizeInBytes, 0);
        setTotalSize(formatSize(totalBytes));
        
        setStatus("incoming");
      }
    }, 3000);
  };
  
  const handleAccept = () => {
    if (!incomingDevice || !incomingFiles.length) return;
    
    transferManager.startTransfer(incomingDevice, incomingFiles)
      .then(() => {
        setStatus("transferring");
      })
      .catch(error => {
        console.error("Transfer error:", error);
      });
  };
  
  const handleReject = () => {
    setStatus("rejected");
    
    // Disconnect from the device
    if (incomingDevice) {
      connectivityManager.disconnect().catch(console.error);
    }
    
    // Reset after a delay
    setTimeout(() => {
      setStatus("waiting");
    }, 3000);
  };
  
  const handleTransferComplete = () => {
    // Navigate to history after a delay
    setTimeout(() => {
      navigate("/history");
    }, 2000);
  };
  
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };
  
  const renderContent = () => {
    switch (status) {
      case "waiting":
        return (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="rounded-full bg-blue-50 p-5 mb-6">
              <Wifi size={64} className="text-file-blue animate-pulse" />
            </div>
            <h2 className="text-xl font-bold mb-3 text-center">Waiting for devices...</h2>
            <p className="text-gray-500 text-center max-w-md mx-auto">
              Make sure the sending device has FileShare open. To simulate a device connecting, go to Send and connect to this device.
            </p>
          </div>
        );
      
      case "incoming":
        return (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-xl p-6 shadow-md">
              <h3 className="text-lg font-semibold mb-4">Incoming Transfer Request</h3>
              <p className="mb-2"><span className="font-medium">From:</span> {incomingDevice?.name}</p>
              <p className="mb-2"><span className="font-medium">Files:</span> {incomingFiles.length}</p>
              <p className="mb-4"><span className="font-medium">Size:</span> {totalSize}</p>
              
              <div className="space-y-2 mb-6">
                <h4 className="text-sm font-medium text-gray-500">Files:</h4>
                {incomingFiles.slice(0, 3).map(file => (
                  <div key={file.id} className="text-sm flex justify-between">
                    <span className="truncate max-w-[200px]">{file.name}</span>
                    <span className="text-gray-500">{file.size}</span>
                  </div>
                ))}
                {incomingFiles.length > 3 && (
                  <div className="text-sm text-gray-500">
                    +{incomingFiles.length - 3} more files
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  className="flex-1 py-3 border border-gray-300 rounded-lg flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  Decline
                </button>
                <button
                  onClick={handleAccept}
                  className="flex-1 button-primary"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Check size={18} />
                    Accept
                  </div>
                </button>
              </div>
            </div>
          </div>
        );
      
      case "transferring":
        return (
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="section-title text-center mb-6">
              Receiving from {incomingDevice?.name}
            </h2>
            <TransferProgress onComplete={handleTransferComplete} />
          </div>
        );
      
      case "rejected":
        return (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="rounded-full bg-red-50 p-5 mb-6">
              <X size={64} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-3 text-center">Transfer Declined</h2>
            <p className="text-gray-500 text-center">
              Returning to waiting mode...
            </p>
          </div>
        );
    }
  };
  
  return (
    <div className="page-container">
      <Header title="Receive Files" showBackButton={true} />
      {renderContent()}
    </div>
  );
};

export default ReceivePage;

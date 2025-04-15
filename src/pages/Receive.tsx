
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Wifi, Check, X } from "lucide-react";
import Header from "../components/Header";
import TransferProgress from "../components/TransferProgress";

const ReceivePage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"waiting" | "incoming" | "transferring" | "rejected">("waiting");
  const [incomingDevice, setIncomingDevice] = useState("");
  const [fileCount, setFileCount] = useState(0);
  const [fileSize, setFileSize] = useState("");
  
  useEffect(() => {
    // Simulate incoming transfer request after a delay
    const timeout = setTimeout(() => {
      if (status === "waiting") {
        setStatus("incoming");
        setIncomingDevice("Google Pixel 6");
        setFileCount(3);
        setFileSize("15.7 MB");
      }
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [status]);
  
  const handleAccept = () => {
    setStatus("transferring");
  };
  
  const handleReject = () => {
    setStatus("rejected");
    
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
  
  const renderContent = () => {
    switch (status) {
      case "waiting":
        return (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="rounded-full bg-blue-50 p-5 mb-6">
              <Wifi size={64} className="text-file-blue animate-pulse" />
            </div>
            <h2 className="text-xl font-bold mb-3 text-center">Waiting for devices...</h2>
            <p className="text-gray-500 text-center">
              Make sure the sending device has FileShare open
            </p>
          </div>
        );
      
      case "incoming":
        return (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-full bg-white rounded-xl p-6 shadow-md">
              <h3 className="text-lg font-semibold mb-4">Incoming Transfer Request</h3>
              <p className="mb-2"><span className="font-medium">From:</span> {incomingDevice}</p>
              <p className="mb-2"><span className="font-medium">Files:</span> {fileCount}</p>
              <p className="mb-4"><span className="font-medium">Size:</span> {fileSize}</p>
              
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
              Receiving from {incomingDevice}
            </h2>
            <TransferProgress 
              totalFiles={fileCount} 
              totalSize={fileSize} 
              onComplete={handleTransferComplete}
            />
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

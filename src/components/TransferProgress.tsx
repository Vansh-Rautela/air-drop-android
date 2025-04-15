
import { useState, useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, Pause, Play, XCircleIcon } from "lucide-react";
import { transferManager, TransferSession } from "../utils/transferManager";
import { Button } from "@/components/ui/button";

interface TransferProgressProps {
  onComplete?: () => void;
}

const TransferProgress = ({ onComplete }: TransferProgressProps) => {
  const [transferSession, setTransferSession] = useState<TransferSession | null>(null);
  
  useEffect(() => {
    // Subscribe to transfer updates
    const unsubscribe = transferManager.subscribeToTransfer(session => {
      setTransferSession(session);
      
      if (session?.status === "completed" && onComplete) {
        onComplete();
      }
    });
    
    return unsubscribe;
  }, [onComplete]);
  
  const handlePauseResume = () => {
    if (!transferSession) return;
    
    if (transferSession.status === "transferring") {
      transferManager.pauseTransfer();
    } else if (transferSession.status === "paused") {
      transferManager.resumeTransfer();
    }
  };
  
  const handleCancel = () => {
    transferManager.cancelTransfer();
  };
  
  if (!transferSession) {
    return null;
  }
  
  const { progress, status, transferSpeed, timeRemaining, device, files, totalSize } = transferSession;
  
  const getStatusDisplay = () => {
    switch (status) {
      case "completed":
        return (
          <div className="flex items-center gap-2 text-accent">
            <CheckCircle size={20} />
            <span className="font-medium">Transfer Completed</span>
          </div>
        );
      case "failed":
        return (
          <div className="flex items-center gap-2 text-destructive">
            <XCircle size={20} />
            <span className="font-medium">Transfer Failed</span>
          </div>
        );
      case "paused":
        return (
          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle size={20} />
            <span className="font-medium">Transfer Paused</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 text-file-blue">
            <AlertTriangle size={20} className={progress < 100 ? "animate-pulse-opacity" : ""} />
            <span className="font-medium">
              {progress < 100 ? "Transferring..." : "Processing..."}
            </span>
          </div>
        );
    }
  };
  
  return (
    <div className="rounded-xl bg-white p-5 shadow-md">
      <div className="flex justify-between items-center mb-4">
        {getStatusDisplay()}
        <span className="text-sm font-medium">{Math.round(progress)}%</span>
      </div>
      
      <div className="w-full bg-gray-100 rounded-full h-2.5 mb-4">
        <div 
          className="h-2.5 rounded-full bg-gradient-primary"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <div className="flex justify-between text-sm text-gray-500">
        <div>
          <p>{files.length} Files • {totalSize}</p>
          <p className="mt-1">Speed: {transferSpeed}</p>
          <p className="mt-1">Device: {device.name}</p>
        </div>
        <div className="text-right">
          <p>Time Remaining</p>
          <p className="mt-1 font-medium">{status === "completed" ? "00:00" : timeRemaining}</p>
        </div>
      </div>
      
      {(status === "transferring" || status === "paused") && (
        <div className="flex gap-3 mt-4">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handlePauseResume}
          >
            {status === "transferring" ? (
              <><Pause size={16} /> Pause</>
            ) : (
              <><Play size={16} /> Resume</>
            )}
          </Button>
          <Button 
            variant="destructive" 
            className="flex-1"
            onClick={handleCancel}
          >
            <XCircleIcon size={16} /> Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default TransferProgress;

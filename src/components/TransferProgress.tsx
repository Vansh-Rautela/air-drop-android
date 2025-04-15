
import { useState, useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface TransferProgressProps {
  totalFiles: number;
  totalSize: string;
  onComplete?: () => void;
}

type TransferStatus = "in_progress" | "completed" | "failed";

const TransferProgress = ({ totalFiles, totalSize, onComplete }: TransferProgressProps) => {
  const [progress, setProgress] = useState(0);
  const [transferSpeed, setTransferSpeed] = useState("0 MB/s");
  const [timeRemaining, setTimeRemaining] = useState("--:--");
  const [status, setStatus] = useState<TransferStatus>("in_progress");
  
  useEffect(() => {
    // Simulate transfer progress
    const interval = setInterval(() => {
      setProgress(prevProgress => {
        if (prevProgress >= 100) {
          clearInterval(interval);
          setStatus("completed");
          if (onComplete) onComplete();
          return 100;
        }
        
        // Random increment between 2-5%
        const increment = Math.random() * 3 + 2;
        return Math.min(prevProgress + increment, 100);
      });
      
      // Update random transfer speed
      const speedValue = (Math.random() * 2 + 0.5).toFixed(1);
      setTransferSpeed(`${speedValue} MB/s`);
      
      // Update time remaining
      const remainingPercentage = 100 - progress;
      const secondsRemaining = Math.round((remainingPercentage / 5) * 4);
      const minutes = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;
      setTimeRemaining(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 500);
    
    return () => clearInterval(interval);
  }, [progress, onComplete]);
  
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
          <p>{totalFiles} Files • {totalSize}</p>
          <p className="mt-1">Speed: {transferSpeed}</p>
        </div>
        <div className="text-right">
          <p>Time Remaining</p>
          <p className="mt-1 font-medium">{status === "completed" ? "00:00" : timeRemaining}</p>
        </div>
      </div>
    </div>
  );
};

export default TransferProgress;

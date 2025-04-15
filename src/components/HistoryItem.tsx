
import { FileUp, FileDown, Calendar } from "lucide-react";

interface HistoryItemProps {
  id: string;
  date: string;
  time: string;
  isSent: boolean;
  fileName: string;
  fileCount: number;
  totalSize: string;
  deviceName: string;
}

const HistoryItem = ({
  id,
  date,
  time,
  isSent,
  fileName,
  fileCount,
  totalSize,
  deviceName
}: HistoryItemProps) => {
  const multipleFiles = fileCount > 1;
  
  return (
    <div className="bg-white rounded-lg shadow p-4 card-hover">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${isSent ? "bg-blue-50" : "bg-green-50"}`}>
          {isSent ? (
            <FileUp size={20} className="text-file-blue" />
          ) : (
            <FileDown size={20} className="text-file-teal" />
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">
              {multipleFiles ? `${fileCount} files` : fileName}
            </h3>
            <span className="text-xs text-gray-500">{totalSize}</span>
          </div>
          
          <p className="text-sm text-gray-500 mt-1">
            {isSent ? "Sent to" : "Received from"}: {deviceName}
          </p>
          
          <div className="flex items-center gap-1 mt-2">
            <Calendar size={14} className="text-gray-400" />
            <span className="text-xs text-gray-400">{date} • {time}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryItem;

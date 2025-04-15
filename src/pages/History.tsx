
import { useState } from "react";
import { Search } from "lucide-react";
import Header from "../components/Header";
import HistoryItem from "../components/HistoryItem";

interface HistoryEntryData {
  id: string;
  date: string;
  time: string;
  isSent: boolean;
  fileName: string;
  fileCount: number;
  totalSize: string;
  deviceName: string;
}

const HistoryPage = () => {
  const [historyItems] = useState<HistoryEntryData[]>([
    {
      id: "hist1",
      date: "Today",
      time: "15:42",
      isSent: true,
      fileName: "Project Presentation.pdf",
      fileCount: 1,
      totalSize: "5.7 MB",
      deviceName: "Google Pixel 6"
    },
    {
      id: "hist2",
      date: "Today",
      time: "12:15",
      isSent: false,
      fileName: "",
      fileCount: 3,
      totalSize: "15.7 MB",
      deviceName: "Google Pixel 6"
    },
    {
      id: "hist3",
      date: "Yesterday",
      time: "18:30",
      isSent: true,
      fileName: "",
      fileCount: 12,
      totalSize: "45.2 MB",
      deviceName: "Samsung Galaxy S21"
    },
    {
      id: "hist4",
      date: "Apr 13, 2025",
      time: "09:45",
      isSent: false,
      fileName: "Vacation Photo.jpg",
      fileCount: 1,
      totalSize: "3.2 MB",
      deviceName: "Xiaomi Mi 11"
    }
  ]);
  
  return (
    <div className="page-container">
      <Header title="Transfer History" showBackButton={true} />
      
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search history"
          className="bg-white w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-file-blue focus:border-transparent"
        />
      </div>
      
      <div className="space-y-4">
        {historyItems.map(item => (
          <HistoryItem key={item.id} {...item} />
        ))}
      </div>
      
      {historyItems.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-gray-500">No transfer history yet</p>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;

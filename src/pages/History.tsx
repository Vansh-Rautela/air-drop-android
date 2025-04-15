
import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import Header from "../components/Header";
import HistoryItem from "../components/HistoryItem";
import { transferManager, TransferSession } from "../utils/transferManager";

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
  const [historyItems, setHistoryItems] = useState<HistoryEntryData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  useEffect(() => {
    // Subscribe to history updates
    const unsubscribe = transferManager.subscribeToHistory(history => {
      // Convert transfer sessions to history items
      const items = history.map(session => convertSessionToHistoryItem(session));
      setHistoryItems([...items, ...DEFAULT_HISTORY_ITEMS]);
    });
    
    // Initial history
    setHistoryItems(DEFAULT_HISTORY_ITEMS);
    
    return unsubscribe;
  }, []);
  
  const convertSessionToHistoryItem = (session: TransferSession): HistoryEntryData => {
    // Determine if it was an outgoing or incoming transfer
    // For demo, we'll assume outgoing if the files have the id starting with "file"
    const isSent = session.files[0]?.id.startsWith("file");
    
    // Format date and time
    const date = session.startTime ? formatDate(session.startTime) : "Today";
    const time = session.startTime ? formatTime(session.startTime) : "12:00";
    
    return {
      id: session.id,
      date,
      time,
      isSent,
      fileName: session.files.length === 1 ? session.files[0].name : "",
      fileCount: session.files.length,
      totalSize: session.totalSize,
      deviceName: session.device.name
    };
  };
  
  const formatDate = (date: Date): string => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === now.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    }
  };
  
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  };
  
  const filteredItems = historyItems.filter(item => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      item.deviceName.toLowerCase().includes(query) ||
      item.fileName.toLowerCase().includes(query) ||
      `${item.fileCount} files`.toLowerCase().includes(query)
    );
  });
  
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
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-white w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-file-blue focus:border-transparent"
        />
      </div>
      
      <div className="space-y-4">
        {filteredItems.map(item => (
          <HistoryItem key={item.id} {...item} />
        ))}
      </div>
      
      {filteredItems.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-gray-500">No transfer history found</p>
        </div>
      )}
    </div>
  );
};

// Default history items for demonstration
const DEFAULT_HISTORY_ITEMS: HistoryEntryData[] = [
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
];

export default HistoryPage;

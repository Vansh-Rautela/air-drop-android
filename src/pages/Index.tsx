
import { Link } from "react-router-dom";
import { Send, Download, History, Settings } from "lucide-react";
import Header from "../components/Header";

const Index = () => {
  const menuItems = [
    {
      id: "send",
      title: "Send Files",
      description: "Share files with nearby devices",
      icon: <Send size={24} />,
      color: "bg-file-blue",
      path: "/send"
    },
    {
      id: "receive",
      title: "Receive Files",
      description: "Accept files from nearby devices",
      icon: <Download size={24} />,
      color: "bg-file-teal",
      path: "/receive"
    },
    {
      id: "history",
      title: "Transfer History",
      description: "View your past transfers",
      icon: <History size={24} />,
      color: "bg-indigo-500",
      path: "/history"
    },
    {
      id: "settings",
      title: "Settings",
      description: "Configure application preferences",
      icon: <Settings size={24} />,
      color: "bg-gray-600",
      path: "/settings"
    }
  ];

  return (
    <div className="page-container">
      <Header />
      
      <div className="flex justify-center my-8">
        <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center shadow-lg">
          <Send size={36} className="text-white" />
        </div>
      </div>
      
      <h2 className="text-center text-2xl font-bold mb-8">
        Quick and secure file transfers
      </h2>
      
      <div className="grid grid-cols-1 gap-4 mt-4">
        {menuItems.map(item => (
          <Link
            key={item.id}
            to={item.path}
            className="bg-white rounded-xl p-4 shadow flex items-center gap-4 card-hover"
          >
            <div className={`${item.color} w-12 h-12 rounded-full flex items-center justify-center text-white`}>
              {item.icon}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Index;

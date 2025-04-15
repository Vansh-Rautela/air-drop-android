
import { useState } from "react";
import { Smartphone, Shield, Bell, HardDrive, Info } from "lucide-react";
import Header from "../components/Header";

interface SettingItem {
  id: string;
  title: string;
  description: string;
  type: "toggle" | "select" | "button";
  icon: JSX.Element;
  value?: boolean | string;
  options?: string[];
}

const SettingsPage = () => {
  const [settings, setSettings] = useState<SettingItem[]>([
    {
      id: "device_name",
      title: "Device Name",
      description: "Change how your device appears to others",
      type: "button",
      icon: <Smartphone size={20} className="text-file-blue" />,
      value: "My Android Device"
    },
    {
      id: "security",
      title: "Require PIN",
      description: "Add PIN security for file transfers",
      type: "toggle",
      icon: <Shield size={20} className="text-file-teal" />,
      value: false
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Enable or disable transfer notifications",
      type: "toggle",
      icon: <Bell size={20} className="text-purple-500" />,
      value: true
    },
    {
      id: "storage",
      title: "Storage Location",
      description: "Choose where files are saved",
      type: "select",
      icon: <HardDrive size={20} className="text-orange-500" />,
      value: "Default",
      options: ["Default", "External SD", "Custom"]
    }
  ]);
  
  const toggleSetting = (id: string) => {
    setSettings(settings.map(setting => 
      setting.id === id && setting.type === "toggle"
        ? { ...setting, value: !setting.value }
        : setting
    ));
  };
  
  return (
    <div className="page-container">
      <Header title="Settings" showBackButton={true} />
      
      <div className="space-y-4">
        {settings.map(setting => (
          <div key={setting.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gray-50 p-2">
                {setting.icon}
              </div>
              
              <div className="flex-1">
                <h3 className="font-medium">{setting.title}</h3>
                <p className="text-sm text-gray-500">{setting.description}</p>
              </div>
              
              {setting.type === "toggle" && (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={setting.value as boolean} 
                    onChange={() => toggleSetting(setting.id)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-file-blue/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-file-blue"></div>
                </label>
              )}
              
              {setting.type === "select" && (
                <select className="bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-sm">
                  {setting.options?.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}
              
              {setting.type === "button" && (
                <span className="text-sm text-gray-500">
                  {setting.value as string}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-auto pt-8 pb-4">
        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
          <Info size={14} />
          <span>FileShare v1.0.0</span>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

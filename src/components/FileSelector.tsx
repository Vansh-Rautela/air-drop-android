
import { File, Image, Video, Music, FileText, X, Check } from "lucide-react";
import { useState } from "react";

interface FileItem {
  id: string;
  name: string;
  type: string;
  size: string;
  selected: boolean;
}

interface FileSelectorProps {
  onSelectionChange?: (files: FileItem[]) => void;
}

const FileSelector = ({ onSelectionChange }: FileSelectorProps) => {
  const [files, setFiles] = useState<FileItem[]>([
    { id: "file1", name: "Vacation Photo.jpg", type: "image", size: "3.2 MB", selected: false },
    { id: "file2", name: "Project Presentation.pdf", type: "document", size: "5.7 MB", selected: false },
    { id: "file3", name: "Birthday Video.mp4", type: "video", size: "18.5 MB", selected: false },
    { id: "file4", name: "Meeting Notes.docx", type: "document", size: "1.1 MB", selected: false },
    { id: "file5", name: "Favorite Song.mp3", type: "audio", size: "4.6 MB", selected: false }
  ]);
  
  const toggleFileSelection = (id: string) => {
    const updatedFiles = files.map(file => 
      file.id === id ? { ...file, selected: !file.selected } : file
    );
    
    setFiles(updatedFiles);
    
    if (onSelectionChange) {
      onSelectionChange(updatedFiles.filter(file => file.selected));
    }
  };
  
  const getFileIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image size={24} className="text-green-500" />;
      case "video":
        return <Video size={24} className="text-red-500" />;
      case "audio":
        return <Music size={24} className="text-purple-500" />;
      case "document":
        return <FileText size={24} className="text-blue-500" />;
      default:
        return <File size={24} className="text-gray-500" />;
    }
  };
  
  const selectedCount = files.filter(file => file.selected).length;
  
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Select Files</h2>
        {selectedCount > 0 && (
          <span className="text-sm text-file-teal font-medium">
            {selectedCount} selected
          </span>
        )}
      </div>
      
      <div className="space-y-3">
        {files.map(file => (
          <div 
            key={file.id}
            onClick={() => toggleFileSelection(file.id)}
            className={`file-card ${file.selected ? "border-2 border-file-teal" : "border border-gray-200"}`}
          >
            <div className="p-2 rounded-md bg-gray-50">
              {getFileIcon(file.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{file.size}</p>
            </div>
            
            <div className="ml-2">
              {file.selected ? (
                <div className="w-6 h-6 rounded-full bg-file-teal flex items-center justify-center">
                  <Check size={14} className="text-white" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-gray-200"></div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileSelector;


import { File, Image, Video, Music, FileText, X, Check, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { TransferFile } from "../utils/transferManager";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Button } from "@/components/ui/button";

interface FileSelectorProps {
  onSelectionChange?: (files: TransferFile[]) => void;
}

const FileSelector = ({ onSelectionChange }: FileSelectorProps) => {
  const [files, setFiles] = useState<TransferFile[]>([]);
  
  useEffect(() => {
    // Load recent files when component mounts
    loadRecentFiles();
  }, []);
  
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(files.filter(file => file.selected));
    }
  }, [files, onSelectionChange]);
  
  const loadRecentFiles = async () => {
    try {
      // In a real implementation, this would query the device's recent files
      // For now, we'll list files in the app's directory
      const result = await Filesystem.readdir({
        path: '',
        directory: Directory.Documents
      });
      
      if (result.files && result.files.length > 0) {
        const fileList: TransferFile[] = await Promise.all(
          result.files.slice(0, 10).map(async (fileInfo) => {
            try {
              // Get file stats
              const stats = await Filesystem.stat({
                path: fileInfo.uri || fileInfo.name,
                directory: Directory.Documents
              });
              
              return {
                id: fileInfo.uri || fileInfo.name,
                name: fileInfo.name,
                type: getFileType(fileInfo.name),
                size: formatSize(stats.size || 0),
                sizeInBytes: stats.size || 0,
                selected: false,
                path: fileInfo.uri,
                uri: fileInfo.uri
              };
            } catch (error) {
              console.error(`Error getting file stats for ${fileInfo.name}:`, error);
              return {
                id: fileInfo.uri || fileInfo.name,
                name: fileInfo.name,
                type: getFileType(fileInfo.name),
                size: "Unknown",
                sizeInBytes: 0,
                selected: false,
                path: fileInfo.uri,
                uri: fileInfo.uri
              };
            }
          })
        );
        
        setFiles(fileList);
      }
    } catch (error) {
      console.error("Error loading files:", error);
      
      // If we couldn't load real files, use mock data for demo
      setFiles([
        { id: "file1", name: "Vacation Photo.jpg", type: "image", size: "3.2 MB", sizeInBytes: 3355443, selected: false },
        { id: "file2", name: "Project Presentation.pdf", type: "document", size: "5.7 MB", sizeInBytes: 5976883, selected: false },
        { id: "file3", name: "Birthday Video.mp4", type: "video", size: "18.5 MB", sizeInBytes: 19398656, selected: false },
        { id: "file4", name: "Meeting Notes.docx", type: "document", size: "1.1 MB", sizeInBytes: 1153433, selected: false },
        { id: "file5", name: "Favorite Song.mp3", type: "audio", size: "4.6 MB", sizeInBytes: 4823449, selected: false }
      ]);
    }
  };
  
  const pickFiles = async () => {
    try {
      // This would use a native file picker like DocumentPicker
      // Since we can't directly access it here, we'll simulate it
      
      // In a real implementation, you would use something like:
      // const result = await DocumentPicker.pick({
      //   type: [DocumentPicker.types.allFiles],
      //   allowMultiSelection: true,
      // });
      
      toast.info("File picker would open here on a real device");
      
      // For demo purposes, add a mock selected file
      const newFile: TransferFile = {
        id: `file${Date.now()}`,
        name: "User Selected File.pdf",
        type: "document",
        size: "2.8 MB",
        sizeInBytes: 2936012,
        selected: true,
        path: `/storage/emulated/0/Download/UserSelectedFile.pdf`
      };
      
      setFiles(prevFiles => [...prevFiles, newFile]);
    } catch (error) {
      console.error("Error picking files:", error);
    }
  };
  
  const toggleFileSelection = (id: string) => {
    const updatedFiles = files.map(file => 
      file.id === id ? { ...file, selected: !file.selected } : file
    );
    
    setFiles(updatedFiles);
  };
  
  const getFileType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension)) return 'video';
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(extension)) return 'audio';
    if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) return 'document';
    
    return 'other';
  };
  
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
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
      
      <Button 
        variant="outline" 
        className="w-full mb-4 flex items-center justify-center gap-2"
        onClick={pickFiles}
      >
        <Plus size={16} />
        Add Files
      </Button>
      
      <div className="space-y-3">
        {files.map(file => (
          <div 
            key={file.id}
            onClick={() => toggleFileSelection(file.id)}
            className={`p-3 flex items-center gap-3 rounded-lg border cursor-pointer ${
              file.selected ? "border-2 border-file-teal" : "border border-gray-200"
            }`}
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
        
        {files.length === 0 && (
          <div className="p-8 text-center text-gray-500 border border-dashed rounded-lg">
            No files found. Click "Add Files" to select files to send.
          </div>
        )}
      </div>
    </div>
  );
};

export default FileSelector;

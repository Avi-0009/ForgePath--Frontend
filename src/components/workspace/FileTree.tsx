import { useState } from "react";
import { Folder, FolderOpen, File, ChevronRight, ChevronDown, FileCode } from "lucide-react";
import type { FileNode } from "../../Api/Workspace";

interface FileTreeNodeProps {
  node: FileNode;
  level?: number;
  onSelectFile?: (file: FileNode) => void;
}

const FileTreeNode = ({ node, level = 0, onSelectFile }: FileTreeNodeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isDir = node.is_dir;

  const handleToggle = () => {
    if (isDir) {
      setIsOpen(!isOpen);
    } else if (onSelectFile) {
      onSelectFile(node);
    }
  };

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.ts') || filename.endsWith('.tsx') || filename.endsWith('.js') || filename.endsWith('.py')) {
      return <FileCode className="w-4 h-4 text-app-accent" />;
    }
    return <File className="w-4 h-4 text-app-dim" />;
  };

  return (
    <div className="select-none">
      <div 
        onClick={handleToggle}
        className="flex items-center gap-1.5 py-1 px-2 hover:bg-app-line/50 rounded-md cursor-pointer transition-colors group"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        <div className="w-4 h-4 flex items-center justify-center shrink-0">
          {isDir ? (
            isOpen ? <ChevronDown className="w-3.5 h-3.5 text-app-dim" /> : <ChevronRight className="w-3.5 h-3.5 text-app-dim" />
          ) : (
            <span className="w-3.5 h-3.5" />
          )}
        </div>
        
        {isDir ? (
          isOpen ? <FolderOpen className="w-4 h-4 text-emerald-400" /> : <Folder className="w-4 h-4 text-emerald-500" />
        ) : (
          getFileIcon(node.name)
        )}
        
        <span className={`text-sm truncate ${isDir ? 'font-medium text-app-text' : 'text-app-muted group-hover:text-app-text transition-colors'}`}>
          {node.name}
        </span>
      </div>

      {isDir && isOpen && node.children && (
        <div className="flex flex-col animate-in slide-in-from-top-1 fade-in duration-200">
          {node.children.map((child) => (
            <FileTreeNode 
              key={child.path} 
              node={child} 
              level={level + 1} 
              onSelectFile={onSelectFile} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FileTreeNode;
"use client";

import { Loader2, FileEdit, FileText, FilePlus2, FolderOpen, Trash2, FolderX, FileX, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolInvocationDisplayProps {
  toolName: string;
  state: string;
  args?: Record<string, any>;
  result?: any;
  className?: string;
}

function getActionMessage(toolName: string, args?: Record<string, any>): { message: string; icon: React.ReactNode } {
  if (toolName === "str_replace_editor" && args) {
    const { command, path } = args;
    const fileName = path ? path.split('/').pop() : 'file';
    
    switch (command) {
      case "create":
        return {
          message: `Creating ${fileName}`,
          icon: <FilePlus2 className="w-3 h-3" />
        };
      case "str_replace":
        return {
          message: `Editing ${fileName}`,
          icon: <FileEdit className="w-3 h-3" />
        };
      case "view":
        return {
          message: `Viewing ${fileName}`,
          icon: <FileText className="w-3 h-3" />
        };
      case "insert":
        return {
          message: `Adding content to ${fileName}`,
          icon: <FileEdit className="w-3 h-3" />
        };
      case "undo_edit":
        return {
          message: `Undoing changes to ${fileName}`,
          icon: <RotateCcw className="w-3 h-3" />
        };
      default:
        return {
          message: `Working on ${fileName}`,
          icon: <FileEdit className="w-3 h-3" />
        };
    }
  }
  
  if (toolName === "file_manager" && args) {
    const { command, path, new_path } = args;
    const fileName = path ? path.split('/').pop() : 'file';
    const newFileName = new_path ? new_path.split('/').pop() : '';
    
    switch (command) {
      case "rename":
        return {
          message: `Renaming ${fileName} to ${newFileName}`,
          icon: <FolderOpen className="w-3 h-3" />
        };
      case "delete":
        return {
          message: `Deleting ${fileName}`,
          icon: path?.includes('.') ? <FileX className="w-3 h-3" /> : <FolderX className="w-3 h-3" />
        };
      default:
        return {
          message: `Managing ${fileName}`,
          icon: <FolderOpen className="w-3 h-3" />
        };
    }
  }
  
  // Fallback for unknown tools
  return {
    message: `Using ${toolName}`,
    icon: <FileEdit className="w-3 h-3" />
  };
}

export function ToolInvocationDisplay({ 
  toolName, 
  state, 
  args, 
  result, 
  className 
}: ToolInvocationDisplayProps) {
  const { message, icon } = getActionMessage(toolName, args);
  const isCompleted = state === "result" && result;
  const isLoading = !isCompleted;

  return (
    <div className={cn(
      "inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg text-xs border transition-colors",
      isCompleted 
        ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
        : "bg-blue-50 border-blue-200 text-blue-800",
      className
    )}>
      {isLoading ? (
        <Loader2 className="w-3 h-3 animate-spin" data-testid="loading-icon" />
      ) : (
        <div className="w-2 h-2 rounded-full bg-current opacity-70" data-testid="completed-icon"></div>
      )}
      {icon}
      <span className="font-medium">{message}</span>
    </div>
  );
}
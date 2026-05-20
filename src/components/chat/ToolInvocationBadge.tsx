import type { ToolInvocation } from "ai";
import { Loader2, FilePlus, FileEdit, FileSearch, FileX, File } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type ToolDescription = { label: string; Icon: LucideIcon };

function describeStrReplaceEditor(args: Record<string, unknown>): ToolDescription {
  const path = typeof args.path === "string" ? args.path : undefined;
  const filename = path?.split("/").pop() ?? path ?? "file";
  switch (args.command) {
    case "create":
      return { label: `Creating ${filename}`, Icon: FilePlus };
    case "str_replace":
    case "insert":
      return { label: `Editing ${filename}`, Icon: FileEdit };
    case "view":
      return { label: `Reading ${filename}`, Icon: FileSearch };
    default:
      return { label: `Updating ${filename}`, Icon: FileEdit };
  }
}

function describeFileManager(args: Record<string, unknown>): ToolDescription {
  const path = typeof args.path === "string" ? args.path : undefined;
  const filename = path?.split("/").pop() ?? path ?? "file";
  if (args.command === "delete") {
    return { label: `Deleting ${filename}`, Icon: FileX };
  }
  if (args.command === "rename") {
    const newPath = typeof args.new_path === "string" ? args.new_path : undefined;
    const newFilename = newPath?.split("/").pop() ?? newPath ?? filename;
    return { label: `Renaming ${filename} → ${newFilename}`, Icon: FileEdit };
  }
  return { label: `Managing ${filename}`, Icon: File };
}

function getToolDescription(toolName: string, args: unknown): ToolDescription {
  const safeArgs = (args && typeof args === "object" ? args : {}) as Record<string, unknown>;
  if (toolName === "str_replace_editor") return describeStrReplaceEditor(safeArgs);
  if (toolName === "file_manager") return describeFileManager(safeArgs);
  return { label: toolName, Icon: File };
}

interface ToolInvocationBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const isDone = toolInvocation.state === "result";
  const { label, Icon } = getToolDescription(toolInvocation.toolName, toolInvocation.args);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600 flex-shrink-0" />
      )}
      <Icon className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}

import { Loader2, FolderKanban, RefreshCw } from "lucide-react";
import type { FileNode } from "../../Api/Workspace";
import FileTree from "./FileTree";

interface WorkspaceSidebarProps {
  selectedFile: FileNode | null;
  isLoading: boolean;
  treeError: string | null;
  treeData: FileNode | null;
  onRefresh: () => void;
  onSelectFile: (file: FileNode | null) => void;
}

const WorkspaceSidebar = ({
  selectedFile,
  isLoading,
  treeError,
  treeData,
  onRefresh,
  onSelectFile,
}: WorkspaceSidebarProps) => {
  return (
    <aside
      className={`${
        selectedFile ? "hidden md:flex" : "flex"
      } flex-col w-full md:w-80 shrink-0 h-full overflow-hidden border-r border-app-line bg-[#141719]`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-app-line p-4">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-app-accent" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-app-dim">
            Workspace
          </h2>
        </div>

        <button
          type="button"
          aria-label="Refresh workspaces"
          title="Refresh workspaces"
          disabled={isLoading}
          onClick={onRefresh}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-app-muted transition-colors hover:bg-app-line/50 hover:text-app-text disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 min-h-0 scrollbar-thumb-app-btn-hover">
        {isLoading ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3 text-app-muted">
            <Loader2 className="h-5 w-5 animate-spin text-app-accent" />
            <p className="text-xs">Loading workspaces...</p>
          </div>
        ) : treeError ? (
          <div className="mx-2 mt-8 rounded-xl border border-app-line bg-[#1c2124] p-4 text-center">
            <FolderKanban className="mx-auto mb-3 h-8 w-8 text-app-dim" />
            <p className="text-sm font-medium text-app-text">Workspace unavailable</p>
            <p className="mt-2 text-xs leading-5 text-app-muted">{treeError}</p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-app-line px-3 text-xs font-semibold text-app-text transition-colors hover:bg-app-line/50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </button>
          </div>
        ) : treeData?.children?.length ? (
          <>
            <FileTree node={treeData} onSelectFile={onSelectFile} />
            {treeData.truncated && (
              <p className="px-3 py-3 text-xs leading-5 text-app-muted">
                The workspace tree was limited. Some entries may be omitted.
              </p>
            )}
          </>
        ) : (
          <div className="px-4 py-10 text-center">
            <FolderKanban className="mx-auto mb-3 h-8 w-8 text-app-dim" />
            <p className="text-sm font-medium text-app-text">No workspaces found</p>
            <p className="mt-2 text-xs leading-5 text-app-muted">
              Configure workspace roots in the backend environment and refresh this view.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default WorkspaceSidebar;
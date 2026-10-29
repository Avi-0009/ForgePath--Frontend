import { useEffect, useState } from "react";
import {
  Loader2,
  Play,
  FolderKanban,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

import { useAuthStore } from "../store/useAuthStore";
import { GetWorkspaceTree } from "../Api/Workspace";
import type { FileNode } from "../Api/Workspace";
import {
  InitiateCodeReview,
  ApplyCodePatch,
} from "../Api/Review";
import type { CodeReviewResponse } from "../Api/Review";
import FileTree from "../components/workspace/FileTree";
import DiffViewer from "../components/workspace/DiffViewer";

const WorkspacePage = () => {
  const { token } = useAuthStore();

  const [treeData, setTreeData] = useState<FileNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [reviewResult, setReviewResult] =
    useState<CodeReviewResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchTree = async () => {
      setIsLoading(true);
      setTreeError(null);

      if (!token) {
        setTreeData(null);
        setTreeError("Please sign in to access your workspaces.");
        setIsLoading(false);
        return;
      }

      try {
        const data = await GetWorkspaceTree(token);

        if (!cancelled) {
          setTreeData(data);
        }
      } catch (error) {
        console.error("Failed to load workspace tree:", error);

        if (!cancelled) {
          setTreeData(null);
          setTreeError(
            "Couldn't load your workspaces. Check that the backend is running and your login session is valid.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchTree();

    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  const handleSelectFile = (path: string) => {
    setSelectedFile(path || null);
    setReviewResult(null);
  };

  const handleLaunchReview = async () => {
    if (!selectedFile || !token || isReviewing) {
      return;
    }

    const fileName = selectedFile.split(/[\\/]/).pop() ?? selectedFile;
    const loadingToast = toast.loading(`Reviewing ${fileName}...`);

    setIsReviewing(true);

    try {
      const response = await InitiateCodeReview(token, {
        file_path: selectedFile,
      });

      setReviewResult(response);
      toast.success("Code review complete");
    } catch (error) {
      console.error("Code review request failed:", error);
      toast.error("Code review failed. Check the backend/API configuration.");
    } finally {
      toast.dismiss(loadingToast);
      setIsReviewing(false);
    }
  };

  const handleApprovePatch = async () => {
    if (!reviewResult || !token || isApplying) {
      return;
    }

    setIsApplying(true);

    try {
      await ApplyCodePatch(token, reviewResult.id);
      toast.success("Patch applied successfully");
      setReviewResult(null);
    } catch (error) {
      console.error("Patch application failed:", error);
      toast.error("Failed to apply the patch.");
    } finally {
      setIsApplying(false);
    }
  };

  const handleRejectPatch = () => {
    setReviewResult(null);
    toast.success("Patch dismissed");
  };

  const fileName =
    selectedFile?.split(/[\\/]/).pop() ?? selectedFile;

  return (
    <div className="flex h-full min-h-125 w-full animate-in fade-in duration-300 bg-app-bg text-app-text">
      <aside
        className={`${
          selectedFile ? "hidden md:flex" : "flex"
        } w-full shrink-0 flex-col border-r border-app-line bg-[#141719] md:w-80`}
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
            onClick={() => setReloadKey((key) => key + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-app-muted transition-colors hover:bg-app-line/50 hover:text-app-text disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 text-app-muted">
              <Loader2 className="h-5 w-5 animate-spin text-app-accent" />
              <p className="text-xs">Loading workspaces...</p>
            </div>
          ) : treeError ? (
            <div className="mx-2 mt-8 rounded-xl border border-app-line bg-[#1c2124] p-4 text-center">
              <FolderKanban className="mx-auto mb-3 h-8 w-8 text-app-dim" />

              <p className="text-sm font-medium text-app-text">
                Workspace unavailable
              </p>

              <p className="mt-2 text-xs leading-5 text-app-muted">
                {treeError}
              </p>

              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-app-line px-3 text-xs font-semibold text-app-text transition-colors hover:bg-app-line/50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </button>
            </div>
          ) : treeData?.children?.length ? (
            <>
              <FileTree
                node={treeData}
                onSelectFile={handleSelectFile}
              />

              {treeData.truncated && (
                <p className="px-3 py-3 text-xs leading-5 text-app-muted">
                  The workspace tree was limited. Some entries may be
                  omitted.
                </p>
              )}
            </>
          ) : (
            <div className="px-4 py-10 text-center">
              <FolderKanban className="mx-auto mb-3 h-8 w-8 text-app-dim" />
              <p className="text-sm font-medium text-app-text">
                No workspaces found
              </p>
              <p className="mt-2 text-xs leading-5 text-app-muted">
                Configure workspace roots in the backend environment and
                refresh this view.
              </p>
            </div>
          )}
        </div>
      </aside>

      <main
        className={`${
          !selectedFile ? "hidden md:flex" : "flex"
        } relative min-w-0 flex-1 flex-col overflow-hidden bg-[#1c2124]`}
      >
        {reviewResult ? (
          <DiffViewer
            originalCode={reviewResult.original_content}
            newCode={reviewResult.reviewed_content}
            onApprove={handleApprovePatch}
            onReject={handleRejectPatch}
            isApplying={isApplying}
          />
        ) : (
          <>
            <div className="mb-2 p-4 md:hidden">
              <button
                type="button"
                onClick={() => handleSelectFile("")}
                className="flex items-center gap-2 text-sm font-medium text-app-muted transition-colors hover:text-app-text"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to files
              </button>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
              {selectedFile ? (
                <div className="w-full max-w-md animate-in zoom-in-95 rounded-xl border border-app-line bg-[#141719] p-6 text-center shadow-xl duration-200">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-app-line bg-[#1c2124]">
                    <FolderKanban className="h-5 w-5 text-app-accent" />
                  </div>

                  <h3 className="mb-2 break-all text-lg font-bold">
                    {fileName}
                  </h3>

                  <p className="mb-6 break-all text-xs text-app-muted">
                    {selectedFile}
                  </p>

                  <button
                    type="button"
                    onClick={handleLaunchReview}
                    disabled={isReviewing}
                    className="btn btn-primary flex h-10 w-full items-center justify-center gap-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isReviewing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}

                    {isReviewing
                      ? "Analyzing code..."
                      : "Launch Code Review"}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center text-app-dim">
                  <FolderKanban className="h-12 w-12 opacity-20" />
                  <p className="text-sm font-medium">
                    Select a file from the explorer to begin.
                  </p>
                  <p className="max-w-xs text-xs leading-5 text-app-muted">
                    Choose a file inside one of your configured workspaces.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default WorkspacePage;
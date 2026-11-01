import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { HTTPError } from "ky";

import { useAuthStore } from "../store/useAuthStore";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { GetWorkspaceTree } from "../Api/Workspace";
import type { FileNode } from "../Api/Workspace";

import { InitiateCodeReview, GenerateCodePatch, ApplyCodePatch } from "../Api/Review";
import type { ReviewFinding } from "../Api/Review";

import WorkspaceSidebar from "../components/workspace/WorkspaceSidebar";
import WorkspaceMainContent from "../components/workspace/WorkspaceMainContent";

// HELPERS

const getErrorMessage = async (error: unknown, fallback: string): Promise<string> => {
  if (error instanceof HTTPError) {
    try {
      const errorData = await error.response.clone().json() as { detail?: unknown; message?: unknown };
      const detail = errorData.detail ?? errorData.message;
      if (typeof detail === "string") return detail;
      if (detail) return JSON.stringify(detail);
    } catch {
      // Ignore
    }
    return `${fallback} (${error.response.status})`;
  }
  return error instanceof Error ? error.message : fallback;
};

// WORKSPACE PAGE

const WorkspacePage = () => {
  const { token } = useAuthStore();
  
  const {
    treeData,            
    setTreeData,         
    selectedFile,
    reviewResult,
    patchResult,
    setSelectedFile,
    setReviewResult,
    setPatchResult,
    setSelectedFinding,
    clearReviewState
  } = useWorkspaceStore();

  // Initialize loading to false if we already have the tree cached
  const [isLoading, setIsLoading] = useState(!treeData); 
  const [treeError, setTreeError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [isReviewing, setIsReviewing] = useState(false);
  const [isGeneratingPatch, setIsGeneratingPatch] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // LOAD WORKSPACE TREE

  useEffect(() => {
    let cancelled = false;

    // Skip fetch if we already have data and this isn't an explicit refresh
    if (treeData && reloadKey === 0) {
      setIsLoading(false);
      return;
    }

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
        if (!cancelled) setTreeData(data);
      } catch (error) {
        console.error("Failed to load workspace tree:", error);
        if (!cancelled) {
          setTreeData(null);
          setTreeError("Couldn't load your workspaces. Check your backend and login session.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchTree();
    return () => { cancelled = true; };
    
  }, [token, reloadKey]); 

  // FILE SELECTION

  const handleSelectFile = (file: FileNode | null) => {
    if (file?.is_dir) return;
    setSelectedFile(file);
  };

  // INITIATE CODE REVIEW

  const handleLaunchReview = async () => {
    if (!selectedFile || !token) return;
    if (!selectedFile.workspace_root || !selectedFile.relative_path) {
      toast.error("The selected file has invalid workspace metadata.");
      return;
    }

    const loadingToast = toast.loading(`Analyzing ${selectedFile.name}...`);
    setIsReviewing(true);

    try {
      const response = await InitiateCodeReview(token, {
        workspace_root: selectedFile.workspace_root,
        relative_path: selectedFile.relative_path,
        review_mode: "general",
      });

      setReviewResult(response);
      setPatchResult(null);
      toast.success("Code review completed.", { id: loadingToast });
    } catch (error: unknown) {
      const message = await getErrorMessage(error, "Code review failed");
      toast.error(message, { id: loadingToast, duration: 7000 });
    } finally {
      setIsReviewing(false);
    }
  };

  // GENERATE PATCH FOR A FINDING

  const handleGeneratePatch = async (finding: ReviewFinding) => {
    if (!selectedFile || !reviewResult || !token) return;
    if (!finding.suggested_fix?.trim()) {
      toast.error("No suggested fix is available for this finding.");
      return;
    }
    if (!selectedFile.workspace_root) {
      toast.error("Workspace information is missing.");
      return;
    }

    setIsGeneratingPatch(true);
    setSelectedFinding(finding);
    const loadingToast = toast.loading("Generating proposed code fix...");

    try {
      const response = await GenerateCodePatch(token, {
        workspace_root: selectedFile.workspace_root,
        relative_path: reviewResult.relative_path,
        expected_sha256: reviewResult.sha256,
        finding_title: finding.title,
        finding_evidence: finding.evidence,
        finding_explanation: finding.explanation,
        suggested_fix: finding.suggested_fix,
      });

      setPatchResult(response);
      toast.success("Patch proposal generated.", { id: loadingToast });
    } catch (error: unknown) {
      const message = await getErrorMessage(error, "Patch generation failed");
      toast.error(message, { id: loadingToast, duration: 7000 });
      setSelectedFinding(null);
    } finally {
      setIsGeneratingPatch(false);
    }
  };

  // APPROVE AND APPLY PATCH

  const handleApprovePatch = async () => {
    if (!patchResult || !selectedFile || !token || isApplying) return;
    if (!selectedFile.workspace_root) {
      toast.error("Workspace information is missing.");
      return;
    }

    setIsApplying(true);
    const loadingToast = toast.loading("Applying patch and creating backup...");

    try {
      const response = await ApplyCodePatch(token, {
        workspace_root: selectedFile.workspace_root,
        relative_path: patchResult.relative_path,
        expected_sha256: patchResult.original_sha256,
        proposed_sha256: patchResult.proposed_sha256,
        proposed_code: patchResult.proposed_code,
        approval: "apply",
      });

      if (!response.patch_applied) throw new Error("The backend did not confirm patch application.");

      toast.success(`Patch applied! Backup ID: ${response.backup_id}`, { id: loadingToast, duration: 8000 });
      clearReviewState();
      setReloadKey((key) => key + 1);
    } catch (error: unknown) {
      const message = await getErrorMessage(error, "Patch application failed");
      toast.error(message, { id: loadingToast, duration: 8000 });
    } finally {
      setIsApplying(false);
    }
  };

  // DECLINE PATCH

  const handleDeclinePatch = () => {
    if (isApplying) return;
    setPatchResult(null);
    setSelectedFinding(null);
    toast.success("Patch declined. The original file was not changed.");
  };

  return (
    <div className="relative w-full h-full flex-1 min-h-0 overflow-hidden bg-app-bg text-app-text animate-in fade-in duration-300">
      <div className="absolute inset-0 flex flex-row md:p-8 md:gap-8 bg-app-bg">
        <WorkspaceSidebar 
          selectedFile={selectedFile}
          isLoading={isLoading}
          treeError={treeError}
          treeData={treeData}
          onRefresh={() => setReloadKey((key) => key + 1)}
          onSelectFile={handleSelectFile}
        />
        
        <WorkspaceMainContent 
          isReviewing={isReviewing}
          isGeneratingPatch={isGeneratingPatch}
          isApplying={isApplying}
          onLaunchReview={handleLaunchReview}
          onGeneratePatch={handleGeneratePatch}
          onApprovePatch={handleApprovePatch}
          onDeclinePatch={handleDeclinePatch}
        />
      </div>
    </div>
  );
};

export default WorkspacePage;
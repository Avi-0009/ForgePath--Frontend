import { create } from 'zustand';
import type { FileNode } from '../Api/Workspace';
import type { CodeReviewFileResponse, CodePatchResponse, ReviewFinding } from '../Api/Review';

interface WorkspaceState {
  sessionVersion: number;
  treeData: FileNode | null;
  selectedFile: FileNode | null;
  reviewResult: CodeReviewFileResponse | null;
  patchResult: CodePatchResponse | null;
  selectedFinding: ReviewFinding | null;
  
  setTreeData: (data: FileNode | null) => void;
  setSelectedFile: (file: FileNode | null) => void;
  setReviewResult: (result: CodeReviewFileResponse | null) => void;
  setPatchResult: (result: CodePatchResponse | null) => void;
  setSelectedFinding: (finding: ReviewFinding | null) => void;
  
  clearReviewState: () => void;
  clearAllState: () => void;
}

// Discard the legacy, unowned cache. Private source results now live in memory only.
try {
  sessionStorage.removeItem('forgepath-workspace');
} catch {
  // Storage may be unavailable; never hydrate private data from it.
}

export const useWorkspaceStore = create<WorkspaceState>()(
    (set) => ({
      sessionVersion: 0,
      treeData: null,
      selectedFile: null,
      reviewResult: null,
      patchResult: null,
      selectedFinding: null,

      setTreeData: (data) => set({ treeData: data }),
      setSelectedFile: (file) => set({ 
        selectedFile: file, 
        reviewResult: null, 
        patchResult: null, 
        selectedFinding: null 
      }),
      setReviewResult: (result) => set({ reviewResult: result }),
      setPatchResult: (result) => set({ patchResult: result }),
      setSelectedFinding: (finding) => set({ selectedFinding: finding }),

      clearReviewState: () => set({ 
        reviewResult: null, 
        patchResult: null, 
        selectedFinding: null 
      }),
      clearAllState: () => set((state) => ({
        sessionVersion: state.sessionVersion + 1,
        treeData: null,
        selectedFile: null, 
        reviewResult: null, 
        patchResult: null, 
        selectedFinding: null 
      })),
    }),
);

/** Capture before awaiting a request; logout/account changes invalidate its result. */
export const createWorkspaceRequestGuard = () => {
  const version = useWorkspaceStore.getState().sessionVersion;
  return () => useWorkspaceStore.getState().sessionVersion === version;
};

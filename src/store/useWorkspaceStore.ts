import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FileNode } from '../Api/Workspace';
import type { CodeReviewFileResponse, CodePatchResponse, ReviewFinding } from '../Api/Review';

interface WorkspaceState {
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

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
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
      clearAllState: () => set({ 
        treeData: null,
        selectedFile: null, 
        reviewResult: null, 
        patchResult: null, 
        selectedFinding: null 
      }),
    }),
    {
      name: 'forgepath-workspace',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
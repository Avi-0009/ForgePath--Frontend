import { useEffect, useState } from "react";
import { Loader2, Play, FolderKanban, ArrowLeft } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { GetWorkspaceTree } from "../Api/Workspace";
import { InitiateCodeReview, ApplyCodePatch } from "../Api/Review";
import type { FileNode } from "../Api/Workspace";
import type { CodeReviewResponse } from "../Api/Review";
import FileTree from "../components/workspace/FileTree";
import DiffViewer from "../components/workspace/DiffViewer";
import toast from "react-hot-toast";

const MOCK_WORKSPACE: FileNode = {
  name: "forgepath",
  path: "/workspace/forgepath",
  is_dir: true,
  children: [
    {
      name: "src",
      path: "/workspace/forgepath/src",
      is_dir: true,
      children: [
        {
          name: "components",
          path: "/workspace/forgepath/src/components",
          is_dir: true,
          children: [
            { name: "Button.tsx", path: "/workspace/forgepath/src/components/Button.tsx", is_dir: false },
            { name: "Sidebar.tsx", path: "/workspace/forgepath/src/components/Sidebar.tsx", is_dir: false },
          ],
        },
        { name: "App.tsx", path: "/workspace/forgepath/src/App.tsx", is_dir: false },
        { name: "main.ts", path: "/workspace/forgepath/src/main.ts", is_dir: false },
      ],
    },
    {
      name: "backend",
      path: "/workspace/forgepath/backend",
      is_dir: true,
      children: [
        { name: "main.py", path: "/workspace/forgepath/backend/main.py", is_dir: false },
        { name: "models.py", path: "/workspace/forgepath/backend/models.py", is_dir: false },
      ],
    },
    { name: "docker-compose.yml", path: "/workspace/forgepath/docker-compose.yml", is_dir: false },
    { name: "README.md", path: "/workspace/forgepath/README.md", is_dir: false },
  ],
};

const WorkspacePage = () => {
  const { token } = useAuthStore();
  const [treeData, setTreeData] = useState<FileNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const [isReviewing, setIsReviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [reviewResult, setReviewResult] = useState<CodeReviewResponse | null>(null);

  useEffect(() => {
    const fetchTree = async () => {
      if (!token) return;
      try {
        const data = await GetWorkspaceTree(token);
        setTreeData(data);
      } catch (error) {
        console.warn("Backend tree fetch failed, loading mock data.");
        setTreeData(MOCK_WORKSPACE);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTree();
  }, [token]);

  const handleSelectFile = (path: string) => {
    setSelectedFile(path);
    setReviewResult(null);
  };

  const handleLaunchReview = async () => {
    if (!selectedFile || !token) return;
    
    setIsReviewing(true);
    toast.success(`Analyzing ${selectedFile.split('/').pop()}...`);
    
    try {
      const response = await InitiateCodeReview(token, { file_path: selectedFile });
      setReviewResult(response);
      toast.success("Code review complete");
    } catch (error) {
      console.warn("Real API failed, injecting mock review data for testing.");
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setReviewResult({
        id: "mock_rev_123",
        file_path: selectedFile,
        original_content: `function calculateTotal(items) {\n  let total = 0;\n  for(let i=0; i<items.length; i++) {\n    total += items[i].price;\n  }\n  return total;\n}`,
        reviewed_content: `function calculateTotal(items: { price: number }[]): number {\n  // Refactored to use reduce for cleaner functional approach\n  return items.reduce((total, item) => total + item.price, 0);\n}`,
        diff_patch: "", 
        status: "completed",
        created_at: new Date().toISOString()
      });
      toast.success("Mock review generated");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleApprovePatch = async () => {
    if (!reviewResult || !token) return;
    
    setIsApplying(true);
    try {
      await ApplyCodePatch(token, reviewResult.id);
      toast.success("Patch applied successfully!");
      setReviewResult(null); 
    } catch (error) {
      toast.error("Failed to apply patch.");
    } finally {
      setIsApplying(false);
    }
  };

  const handleRejectPatch = () => {
    setReviewResult(null); 
    toast.success("Patch rejected");
  };

  return (
    <div className="flex h-full w-full bg-app-bg text-app-text animate-in fade-in duration-300">
      
      <div className={`${selectedFile ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r border-app-line bg-[#141719]`}>
        <div className="p-4 border-b border-app-line flex items-center gap-2 shrink-0">
          <FolderKanban className="w-5 h-5 text-app-accent" />
          <h2 className="font-bold text-sm uppercase tracking-wider text-app-dim">Workspace</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-app-dim" />
            </div>
          ) : treeData ? (
            <FileTree 
              node={treeData} 
              onSelectFile={handleSelectFile} 
            />
          ) : (
            <div className="text-center text-sm text-app-muted mt-10">
              No workspace detected.
            </div>
          )}
        </div>
      </div>

      <div className={`${!selectedFile ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#1c2124] relative overflow-hidden`}>
        
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
            <div className="md:hidden p-4 mb-6">
              <button 
                onClick={() => handleSelectFile("")}
                className="flex items-center gap-2 text-sm font-medium text-app-muted hover:text-app-text transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to files
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-4">
              {selectedFile ? (
                <div className="max-w-md w-full bg-[#141719] border border-app-line rounded-xl p-6 text-center animate-in zoom-in-95 duration-200 shadow-xl">
                  <h3 className="text-lg font-bold mb-2 break-all">{selectedFile.split('/').pop()}</h3>
                  <p className="text-xs text-app-muted mb-6 break-all">{selectedFile}</p>
                  
                  <button 
                    onClick={handleLaunchReview}
                    disabled={isReviewing}
                    className="w-full btn btn-primary flex items-center justify-center gap-2 h-10 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isReviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    {isReviewing ? "Analyzing Code..." : "Launch Code Review"}
                  </button>
                </div>
              ) : (
                <div className="text-app-dim flex flex-col items-center gap-3">
                  <FolderKanban className="w-12 h-12 opacity-20" />
                  <p className="text-sm font-medium">Select a file from the explorer to begin.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
    </div>
  );
};

export default WorkspacePage;
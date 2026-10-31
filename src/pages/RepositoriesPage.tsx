import { useState, useEffect } from "react";
import { Database, FolderGit2, AlertTriangle, ShieldBan, Loader2, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { GetRepositories, AddRepository, TriggerIndexing } from "../Api/Repositories";
import type { Repository } from "../Api/Repositories";
import toast from "react-hot-toast";

const RepositoriesPage = () => {
  const { token } = useAuthStore();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRepoPath, setNewRepoPath] = useState("");
  const [sourceType, setSourceType] = useState<"local" | "git">("local");
  const [isAdding, setIsAdding] = useState(false);

  const fetchRepos = async () => {
    if (!token) return;
    try {
      const data = await GetRepositories(token);
      setRepositories(data);
    } catch (error: any) {
      toast.error("Failed to load repositories. Verify backend connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, [token]);

  const extractErrorMessage = async (error: any, defaultMsg: string) => {
    if (error.response) {
      try {
        const errData = await error.response.json();
        return errData.detail || defaultMsg;
      } catch (_) {
        return defaultMsg;
      }
    }
    return defaultMsg;
  };

  const handleAddRepository = async () => {
    if (!newRepoPath.trim() || !token) return;
    
    setIsAdding(true);
    toast.loading("Validating path and permissions...", { id: "add-repo" });
    
    try {
      await AddRepository(token, newRepoPath, sourceType);
      toast.success("Repository added successfully!", { id: "add-repo" });
      setIsModalOpen(false);
      setNewRepoPath("");
      fetchRepos();
    } catch (error: any) {
      const errMsg = await extractErrorMessage(error, "Failed to add repository. Check path validity.");
      toast.error(errMsg, { id: "add-repo" });
    } finally {
      setIsAdding(false);
    }
  };

  const handleReindex = async (repoId: string) => {
    if (!token) return;
    toast.loading("Queuing index job and applying exclusions...", { id: `index-${repoId}` });
    
    try {
      await TriggerIndexing(token, repoId);
      toast.success("Indexing started. Files are being processed.", { id: `index-${repoId}` });
      fetchRepos(); 
    } catch (error: any) {
      const errMsg = await extractErrorMessage(error, "Failed to trigger indexing.");
      toast.error(errMsg, { id: `index-${repoId}` });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 animate-in fade-in duration-300">
      <div className="max-w-app mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1">
            <div className="text-micro tracking-eyebrow uppercase text-app-dim font-bold mb-1">
              WORKSPACE / SOURCE CONTROL
            </div>
            <h1 className="font-manrope text-2xl md:text-[28px] tracking-[-0.045em] font-[750] m-0 mb-1.5 text-app-text">
              Repositories
            </h1>
            <p className="text-[13px] text-app-muted m-0 max-w-170">
              Connect a local checkout or clone a repository into a controlled workspace. Indexing never grants permission to push changes.
            </p>
          </div>
          <div className="flex items-center justify-start md:justify-end w-full md:w-auto">
            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary font-semibold">
              ＋ Add repository
            </button>
          </div>
        </div>

        <div className="p-[13px_15px] border border-[#354a60] bg-[#1b242d] text-[#b9cce0] rounded-micro flex gap-2.75 text-2.75">
          <span className="shrink-0 text-base leading-none">ⓘ</span>
          <div>
            <strong className="text-callout-strong">Read-only until you approve. </strong> 
            Repository access is used to inspect code. Write access is a separate, explicit step.
          </div>
        </div>

        <article className="bg-app-panel border border-app-line rounded-panel shadow-panel overflow-hidden min-h-75">
          <div className="flex items-center justify-between p-4 border-b border-app-line">
            <div>
              <div className="text-[13px] font-bold text-app-text">Your codebases</div>
              <div className="text-2.75 text-app-muted mt-1">Index health and local source configuration</div>
            </div>
            <div className="flex items-center gap-2 bg-[#1a1e21] border border-app-line rounded-lg px-3 min-h-9 w-55">
              <span className="text-app-muted">⌕</span>
              <input type="text" placeholder="Filter repositories..." className="bg-transparent border-0 outline-none text-app-text w-full text-[12px]" />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap border-collapse">
              <thead>
                <tr>
                  <th className="text-micro uppercase tracking-[0.08em] font-bold text-app-table-head p-[12px_16px] border-b border-app-line">Repository</th>
                  <th className="text-micro uppercase tracking-[0.08em] font-bold text-app-table-head p-[12px_16px] border-b border-app-line">Source</th>
                  <th className="text-micro uppercase tracking-[0.08em] font-bold text-app-table-head p-[12px_16px] border-b border-app-line">Files</th>
                  <th className="text-micro uppercase tracking-[0.08em] font-bold text-app-table-head p-[12px_16px] border-b border-app-line">Index status</th>
                  <th className="text-micro uppercase tracking-[0.08em] font-bold text-app-table-head p-[12px_16px] border-b border-app-line">Last indexed</th>
                  <th className="p-[12px_16px] border-b border-app-line"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center">
                      <Loader2 className="w-5 h-5 animate-spin text-app-dim mx-auto" />
                    </td>
                  </tr>
                ) : repositories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-app-muted text-sm">
                      No repositories connected.
                    </td>
                  </tr>
                ) : (
                  repositories.map(repo => (
                    <tr key={repo.id} className="hover:bg-app-row-hover transition-colors">
                      <td className="p-[14px_16px] border-b border-app-line-soft">
                        <div className="flex items-center gap-3">
                          <div className="w-[30px] h-[30px] border border-app-line bg-[#252a2e] rounded-lg flex items-center justify-center text-[13px] text-app-muted shrink-0">
                            {repo.source_type === 'git' ? <FolderGit2 className="w-4 h-4" /> : <Database className="w-4 h-4" />}
                          </div>
                          <div>
                            <strong className="block text-[12px] text-app-text">{repo.name}</strong>
                            <span className="text-micro text-app-muted">{(repo.tech_stack || []).join(" · ") || "Unscanned"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-[14px_16px] border-b border-app-line-soft font-mono text-[12px] text-app-text">{repo.path}</td>
                      <td className="p-[14px_16px] border-b border-app-line-soft text-[12px] text-app-text">{repo.file_count || 0}</td>
                      <td className="p-[14px_16px] border-b border-app-line-soft">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 border rounded-md text-micro whitespace-nowrap before:content-[''] before:w-[5px] before:h-[5px] before:bg-current before:rounded-full ${
                          repo.status === 'indexed' ? 'border-[#3c5b46] bg-[#1d2c23] text-status-green' :
                          repo.status === 'indexing' ? 'border-[#344a63] bg-[#1c2938] text-status-blue' :
                          'border-[#5a4b32] bg-[#30291d] text-status-amber'
                        }`}>
                          {repo.status.charAt(0).toUpperCase() + repo.status.slice(1).replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-[14px_16px] border-b border-app-line-soft text-[12px] text-app-text">{repo.last_indexed || "Never"}</td>
                      <td className="p-[14px_16px] border-b border-app-line-soft text-right">
                        <button 
                          onClick={() => handleReindex(repo.id)} 
                          className="btn btn-ghost px-2 py-1 text-2.75 min-h-[30px]"
                          disabled={repo.status === 'indexing'}
                        >
                          Re-index
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_0.9fr] gap-4 items-start">
          <article className="bg-app-panel border border-app-line rounded-panel shadow-panel overflow-hidden">
            <div className="p-4 border-b border-app-line">
              <div className="text-[13px] font-bold text-app-text">Index exclusions</div>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="flex gap-3 pb-3 border-b border-[#2b3034]">
                <div className="w-[27px] h-[27px] rounded-lg bg-[#2a3034] text-app-muted flex items-center justify-center shrink-0">
                  <ShieldBan className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-2.75 font-semibold text-app-text block mb-1">Secrets and environment files</strong>
                  <p className="text-2.75 text-app-muted m-0 font-mono">.env, *.pem, *.key, credentials.*</p>
                </div>
              </div>
              <div className="flex gap-3 pb-3 border-b border-[#2b3034]">
                <div className="w-[27px] h-[27px] rounded-lg bg-[#2a3034] text-app-muted flex items-center justify-center shrink-0">
                  <ShieldBan className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-2.75 font-semibold text-app-text block mb-1">Generated artifacts</strong>
                  <p className="text-2.75 text-app-muted m-0 font-mono">node_modules, dist, build, vendor, .git</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-[27px] h-[27px] rounded-lg bg-[#2a3034] text-app-muted flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-2.75 font-semibold text-app-text block mb-1">Large and binary files</strong>
                  <p className="text-2.75 text-app-muted m-0">Files over 1MB and non-text MIME types are automatically skipped.</p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#070808]/70 backdrop-blur-sm z-50 flex items-center justify-center p-5 animate-in fade-in duration-200">
          <div className="w-full max-w-[540px] bg-[#1b1f22] border border-[#41494f] rounded-[15px] shadow-[0_30px_90px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between p-5 border-b border-app-line">
              <div>
                <h2 className="text-[17px] tracking-[-0.03em] font-bold m-0 mb-1 text-app-text">Add repository</h2>
                <p className="text-2.75 text-app-muted m-0">Choose a local checkout or a Git URL to import into a controlled workspace.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-app-muted hover:text-app-text text-xl">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="flex flex-col gap-[7px]">
                <label className="text-2.75 text-[#d5d9dc] font-semibold">Source type</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="border border-app-line rounded-[9px] p-3 bg-[#171a1d] cursor-pointer transition-colors has-[:checked]:border-[#829f57] has-[:checked]:bg-[#20291b]">
                    <input type="radio" name="source" value="local" checked={sourceType === 'local'} onChange={() => setSourceType('local')} className="accent-app-accent" />
                    <strong className="text-2.75 block mt-1.5 text-app-text">Local directory</strong>
                    <span className="text-micro text-app-muted block mt-0.5">Path on this machine</span>
                  </label>
                  <label className="border border-app-line rounded-[9px] p-3 bg-[#171a1d] cursor-pointer transition-colors has-[:checked]:border-[#829f57] has-[:checked]:bg-[#20291b]">
                    <input type="radio" name="source" value="git" checked={sourceType === 'git'} onChange={() => setSourceType('git')} className="accent-app-accent" />
                    <strong className="text-2.75 block mt-1.5 text-app-text">Git repository</strong>
                    <span className="text-micro text-app-muted block mt-0.5">Clone from a URL</span>
                  </label>
                </div>
              </div>
              
              <div className="flex flex-col gap-[7px]">
                <label className="text-2.75 text-[#d5d9dc] font-semibold">Local path or Git URL</label>
                <input 
                  type="text" 
                  value={newRepoPath}
                  onChange={(e) => setNewRepoPath(e.target.value)}
                  placeholder={sourceType === 'local' ? "C:\\Users\\you\\projects\\my-repo" : "https://github.com/owner/repo"}
                  className="w-full border border-[#3a4248] bg-[#141719] text-app-text rounded-lg px-3 py-2.5 text-[12px] focus:outline-none focus:border-app-accent" 
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-app-line bg-[#171a1c]">
              <button onClick={() => setIsModalOpen(false)} className="btn btn-ghost px-4 h-9 text-xs" disabled={isAdding}>Cancel</button>
              <button onClick={handleAddRepository} className="btn btn-primary px-4 h-9 text-xs" disabled={isAdding || !newRepoPath.trim()}>
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isAdding ? "Validating & Adding..." : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepositoriesPage;
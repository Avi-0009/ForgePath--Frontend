import { useState, useEffect } from "react";
import { Database, FolderGit2, AlertTriangle, CheckCircle2, ShieldBan, Activity } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { GetRepositories, AddRepository, TriggerIndexing } from "../Api/Repositories";
import type { Repository } from "../Api/Repositories";
import toast from "react-hot-toast";

const RepositoriesPage = () => {
  const { token } = useAuthStore();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for initial UI testing if backend is not yet ready for this route
  useEffect(() => {
    const fetchRepos = async () => {
      if (!token) return;
      try {
        const data = await GetRepositories(token);
        setRepositories(data);
      } catch (error) {
        // Fallback to mock data so you can see the UI while building the backend
        setRepositories([
          {
            id: "repo_1",
            name: "ForgePath-Backend",
            source_type: "local",
            path: "C:/Users/prakh/Desktop/ForgePath/ForgePath-Backend",
            file_count: 612,
            status: "indexed",
            last_indexed: "Just now",
            tech_stack: ["Go", "Gin", "PostgreSQL"]
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRepos();
  }, [token]);

  const handleAddRepository = async () => {
    // In a full implementation, this would open a modal to accept a path
    const mockPath = "/path/to/new/project";
    toast.loading("Validating path and checking permissions...", { id: "add-repo" });
    
    setTimeout(() => {
      toast.error("Backend integration required to add repositories.", { id: "add-repo" });
    }, 1500);
  };

  const handleReindex = (repoId: string) => {
    toast.success("Indexing job queued. Applying exclusion rules...");
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 animate-in fade-in duration-300">
      <div className="max-w-[1550px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1">
            <div className="text-[10px] tracking-[0.13em] uppercase text-app-dim font-bold mb-1">
              WORKSPACE / SOURCE CONTROL
            </div>
            <h1 className="font-manrope text-2xl md:text-[28px] tracking-[-0.045em] font-[750] m-0 mb-1.5 text-app-text">
              Repositories
            </h1>
            <p className="text-[13px] text-app-muted m-0 max-w-[680px]">
              Connect a local checkout or clone a repository into a controlled workspace. Indexing never grants permission to push changes.
            </p>
          </div>
          <div className="flex items-center justify-start md:justify-end w-full md:w-auto">
            <button onClick={handleAddRepository} className="btn btn-primary font-semibold">
              ＋ Add repository
            </button>
          </div>
        </div>

        {/* Info Callout */}
        <div className="p-[13px_15px] border border-[#354a60] bg-[#1b242d] text-[#b9cce0] rounded-[10px] flex gap-[11px] text-[11px]">
          <span className="shrink-0 text-base leading-none">ⓘ</span>
          <div>
            <strong className="text-[#eff8e6]">Read-only until you approve. </strong> 
            Repository access is used to inspect code. Write access is a separate, explicit step.
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-4">
          <article className="bg-app-panel border border-app-line rounded-[14px] p-4 shadow-panel">
            <div className="text-[11px] text-app-muted mb-2">Connected repositories</div>
            <div className="font-manrope text-[26px] font-[750] tracking-[-0.04em] text-app-text mb-1">{repositories.length}</div>
            <div className="text-[10px] text-app-muted">Local instances</div>
          </article>
          <article className="bg-app-panel border border-app-line rounded-[14px] p-4 shadow-panel">
            <div className="text-[11px] text-app-muted mb-2">Files indexed</div>
            <div className="font-manrope text-[26px] font-[750] tracking-[-0.04em] text-app-text mb-1">612</div>
            <div className="text-[10px] text-app-muted">Excluded build artifacts</div>
          </article>
          <article className="bg-app-panel border border-app-line rounded-[14px] p-4 shadow-panel">
            <div className="text-[11px] text-app-muted mb-2">Code chunks</div>
            <div className="font-manrope text-[26px] font-[750] tracking-[-0.04em] text-app-text mb-1">4,203</div>
            <div className="text-[10px] text-app-muted">Function and block-aware splits</div>
          </article>
          <article className="bg-app-panel border border-app-line rounded-[14px] p-4 shadow-panel">
            <div className="text-[11px] text-app-muted mb-2">Index freshness</div>
            <div className="font-manrope text-[26px] font-[750] tracking-[-0.04em] text-app-text mb-1">100<span className="text-[15px]">%</span></div>
            <div className="text-[10px] text-app-muted"><span className="text-status-green">Synced</span> recently</div>
          </article>
        </div>

        {/* Repositories Table */}
        <article className="bg-app-panel border border-app-line rounded-[14px] shadow-panel overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-app-line">
            <div>
              <div className="text-[13px] font-bold text-app-text">Your codebases</div>
              <div className="text-[11px] text-app-muted mt-1">Index health and local source configuration</div>
            </div>
            <div className="flex items-center gap-2 bg-[#1a1e21] border border-app-line rounded-lg px-3 min-h-[36px] w-[220px]">
              <span className="text-app-muted">⌕</span>
              <input type="text" placeholder="Filter repositories..." className="bg-transparent border-0 outline-none text-app-text w-full text-[12px]" />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap border-collapse">
              <thead>
                <tr>
                  <th className="text-[10px] uppercase tracking-[0.08em] font-bold text-app-table-head p-[12px_16px] border-b border-app-line">Repository</th>
                  <th className="text-[10px] uppercase tracking-[0.08em] font-bold text-app-table-head p-[12px_16px] border-b border-app-line">Source</th>
                  <th className="text-[10px] uppercase tracking-[0.08em] font-bold text-app-table-head p-[12px_16px] border-b border-app-line">Files</th>
                  <th className="text-[10px] uppercase tracking-[0.08em] font-bold text-app-table-head p-[12px_16px] border-b border-app-line">Index status</th>
                  <th className="text-[10px] uppercase tracking-[0.08em] font-bold text-app-table-head p-[12px_16px] border-b border-app-line">Last indexed</th>
                  <th className="p-[12px_16px] border-b border-app-line"></th>
                </tr>
              </thead>
              <tbody>
                {repositories.map(repo => (
                  <tr key={repo.id} className="hover:bg-app-row-hover transition-colors">
                    <td className="p-[14px_16px] border-b border-app-line-soft">
                      <div className="flex items-center gap-3">
                        <div className="w-[30px] h-[30px] border border-app-line bg-[#252a2e] rounded-lg flex items-center justify-center text-[13px] text-app-muted shrink-0">
                          <Database className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="block text-[12px] text-app-text">{repo.name}</strong>
                          <span className="text-[10px] text-app-muted">{repo.tech_stack.join(" · ")}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-[14px_16px] border-b border-app-line-soft font-mono text-[12px] text-app-text">{repo.path}</td>
                    <td className="p-[14px_16px] border-b border-app-line-soft text-[12px] text-app-text">{repo.file_count}</td>
                    <td className="p-[14px_16px] border-b border-app-line-soft">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 border border-[#3c5b46] bg-[#1d2c23] rounded-md text-[10px] text-status-green whitespace-nowrap before:content-[''] before:w-[5px] before:h-[5px] before:bg-current before:rounded-full">
                        Indexed
                      </span>
                    </td>
                    <td className="p-[14px_16px] border-b border-app-line-soft text-[12px] text-app-text">{repo.last_indexed}</td>
                    <td className="p-[14px_16px] border-b border-app-line-soft text-right">
                      <button onClick={() => handleReindex(repo.id)} className="btn btn-ghost px-2 py-1 text-[11px] min-h-[30px]">Re-index</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        {/* Milestone 3: Ingestion Policies & Rules */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_0.9fr] gap-4 items-start">
          <article className="bg-app-panel border border-app-line rounded-[14px] shadow-panel overflow-hidden">
            <div className="p-4 border-b border-app-line">
              <div className="text-[13px] font-bold text-app-text">Index exclusions</div>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="flex gap-3 pb-3 border-b border-[#2b3034]">
                <div className="w-[27px] h-[27px] rounded-lg bg-[#2a3034] text-app-muted flex items-center justify-center shrink-0">
                  <ShieldBan className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-[11px] font-semibold text-app-text block mb-1">Secrets and environment files</strong>
                  <p className="text-[11px] text-app-muted m-0 font-mono">.env, *.pem, *.key, credentials.*</p>
                </div>
              </div>
              <div className="flex gap-3 pb-3 border-b border-[#2b3034]">
                <div className="w-[27px] h-[27px] rounded-lg bg-[#2a3034] text-app-muted flex items-center justify-center shrink-0">
                  <ShieldBan className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-[11px] font-semibold text-app-text block mb-1">Generated artifacts</strong>
                  <p className="text-[11px] text-app-muted m-0 font-mono">node_modules, dist, build, vendor, .git</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-[27px] h-[27px] rounded-lg bg-[#2a3034] text-app-muted flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-[11px] font-semibold text-app-text block mb-1">Large and binary files</strong>
                  <p className="text-[11px] text-app-muted m-0">Files over 1MB and non-text MIME types are automatically skipped.</p>
                </div>
              </div>
            </div>
          </article>

          <article className="bg-app-panel border border-app-line rounded-[14px] shadow-panel overflow-hidden">
            <div className="p-4 border-b border-app-line">
              <div className="text-[13px] font-bold text-app-text">Index health</div>
            </div>
            <div className="p-5">
              <div className="flex justify-between text-[10px] text-app-muted mb-2">
                <span>Coverage across allowed source files</span>
                <strong className="text-app-text">100%</strong>
              </div>
              <div className="h-[5px] bg-[#30363a] rounded-lg overflow-hidden mb-3">
                <div className="h-full bg-app-accent rounded-lg w-full"></div>
              </div>
              <p className="text-[11px] text-app-muted mb-4">
                Excluded files are intentionally not indexed; source coverage is measured against eligible files.
              </p>
              <button className="btn btn-ghost w-full">Inspect index</button>
            </div>
          </article>
        </div>

      </div>
    </div>
  );
};

export default RepositoriesPage;
import { useState } from "react";
import toast from "react-hot-toast";

type Tab = "general" | "model" | "security" | "limits" | "storage";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>("general");

  const handleSave = () => {
    toast.success("Settings saved for this preview session only.");
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 animate-in fade-in duration-300">
      <div className="max-w-app mx-auto">
        
        <div className="flex flex-col md:flex-row md:items-start gap-4 mb-6">
          <div className="flex-1">
            <div className="text-micro tracking-eyebrow uppercase text-app-dim font-bold mb-1">
              SYSTEM / CONFIGURATION
            </div>
            <h1 className="font-manrope text-2xl md:text-[28px] tracking-[-0.045em] font-[750] m-0 mb-1.5 text-app-text">
              Settings
            </h1>
            <p className="text-3.25 text-app-muted m-0 max-w-170">
              Manage model provider, local security boundaries, run budgets, and storage. Secrets never belong in the frontend.
            </p>
          </div>
          <div className="flex items-center justify-start md:justify-end w-full md:w-auto">
            <button onClick={handleSave} className="btn btn-primary">
              Save settings
            </button>
          </div>
        </div>

        <div className="p-[13px_15px] border border-[#354a60] bg-[#1b242d] text-[#b9cce0] rounded-micro flex gap-2.75 text-2.75 mb-4">
          <span className="shrink-0 text-base leading-none">ⓘ</span>
          <div>
            <strong className="text-callout-strong">Local-only assumption. </strong> 
            Prototype values are illustrative. Store API keys in a backend environment variable or OS secret store, never localStorage or frontend source.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[210px_minmax(0,1fr)] items-start gap-4 mt-6">
          
          <aside className="bg-app-panel border border-app-line rounded-panel p-2 flex md:flex-col overflow-x-auto shadow-panel gap-1">
            {[
              { id: "general", label: "General" },
              { id: "model", label: "Model provider" },
              { id: "security", label: "Security & privacy" },
              { id: "limits", label: "Run limits" },
              { id: "storage", label: "Storage" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`w-auto md:w-full px-3 py-2.5 border-0 text-left rounded-1.75 text-2.75 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-[#2b302a] text-app-accent font-semibold"
                    : "bg-transparent text-app-muted hover:bg-app-row-hover"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </aside>

          <article className="bg-app-panel border border-app-line rounded-panel shadow-panel overflow-hidden">
            
            {activeTab === "general" && (
              <div className="animate-in fade-in duration-200">
                <div className="p-5.5">
                  <h3 className="text-3.25 font-bold m-0 mb-1">Workspace preferences</h3>
                  <p className="text-2.75 text-app-muted m-0 mb-5">How the local DevPilot instance behaves.</p>
                  
                  <div className="flex flex-col gap-1.75 mb-3.75">
                    <label className="text-2.75 text-[#d5d9dc] font-semibold">Workspace label</label>
                    <input type="text" defaultValue="Personal workspace" className="w-full border border-[#3a4248] bg-[#141719] text-app-text rounded-lg px-3 py-2.5 text-[12px] focus:outline-none focus:border-app-accent" />
                  </div>
                  
                  <div className="flex flex-col gap-1.75 mb-3.75">
                    <label className="text-2.75 text-[#d5d9dc] font-semibold">Default repository</label>
                    <select className="w-full border border-[#3a4248] bg-[#141719] text-app-text rounded-lg px-3 py-2.5 text-[12px] focus:outline-none focus:border-app-accent appearance-none">
                      <option>InstantWicket-backend</option>
                      <option>InstantWicket-frontend</option>
                      <option>langGraph</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-4.5 py-3.25 border-t border-[#2c3135]">
                    <div className="flex-1">
                      <strong className="text-2.75 block font-bold text-app-text">Confirm before destructive actions</strong>
                      <span className="text-micro text-app-muted block mt-0.75">Always require explicit confirmation.</span>
                    </div>
                    <ToggleSwitch defaultChecked />
                  </div>

                  <div className="flex items-center gap-4.5 py-3.25 border-t border-[#2c3135]">
                    <div className="flex-1">
                      <strong className="text-2.75 block font-bold text-app-text">Reduced motion</strong>
                      <span className="text-micro text-app-muted block mt-0.75">Respect system accessibility preferences.</span>
                    </div>
                    <ToggleSwitch />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "model" && (
              <div className="animate-in fade-in duration-200">
                <div className="p-5.5">
                  <h3 className="text-3.25 font-bold m-0 mb-1">Language model provider</h3>
                  <p className="text-2.75 text-app-muted m-0 mb-5">LLM calls are made by the backend. Submitted source context may be transmitted to the selected hosted provider.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="border border-app-line rounded-[9px] p-3 bg-app-auth-panel cursor-pointer transition-colors has-checked:border-[#829f57] has-checked:bg-[#20291b]">
                      <input type="radio" name="provider" value="openai" defaultChecked className="accent-app-accent" />
                      <strong className="text-2.75 block mt-1.5 text-app-text">OpenAI API</strong>
                      <span className="text-micro text-app-muted block mt-0.5">Hosted inference · API key required</span>
                    </label>
                    <label className="border border-app-line rounded-[9px] p-3 bg-app-auth-panel cursor-pointer transition-colors has-checked:border-[#829f57] has-checked:bg-[#20291b]">
                      <input type="radio" name="provider" value="local" className="accent-app-accent" />
                      <strong className="text-2.75 block mt-1.5 text-app-text">Local model</strong>
                      <span className="text-micro text-app-muted block mt-0.5">Local inference · hardware dependent</span>
                    </label>
                  </div>

                  <div className="flex flex-col gap-1.75 mt-3.75 mb-3.75">
                    <label className="text-2.75 text-[#d5d9dc] font-semibold">Model identifier</label>
                    <input type="text" defaultValue="gpt-4o-mini" className="w-full border border-[#3a4248] bg-[#141719] text-app-text rounded-lg px-3 py-2.5 text-[12px] focus:outline-none focus:border-app-accent" />
                    <div className="text-micro text-[#869098]">Use a currently supported model identifier; this value is not verified by this static demo.</div>
                  </div>

                  <div className="flex flex-col gap-1.75">
                    <label className="text-2.75 text-[#d5d9dc] font-semibold">API key status</label>
                    <div className="p-[13px_15px] border border-callout-line bg-callout-bg text-callout-text rounded-micro flex gap-2.75 text-2.75">
                      <span className="shrink-0 text-base leading-none text-status-green">✓</span>
                      <div>
                        <strong className="text-callout-strong block mb-1">Loaded by backend environment</strong>
                        Key value intentionally hidden from this UI.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="animate-in fade-in duration-200">
                <div className="p-5.5">
                  <h3 className="text-3.25 font-bold m-0 mb-1">Privacy & execution boundaries</h3>
                  <p className="text-2.75 text-app-muted m-0 mb-5">These settings are intended to map to backend enforcement—not just visual preferences.</p>
                  
                  <div className="flex items-center gap-4.5 py-3.25 border-t border-[#2c3135]">
                    <div className="flex-1">
                      <strong className="text-2.75 block font-bold text-app-text">Bind API to loopback only</strong>
                      <span className="text-micro text-app-muted block mt-0.75">Listen on 127.0.0.1; do not use 0.0.0.0.</span>
                    </div>
                    <ToggleSwitch defaultChecked disabled />
                  </div>

                  <div className="flex items-center gap-4.5 py-3.25 border-t border-[#2c3135]">
                    <div className="flex-1">
                      <strong className="text-2.75 block font-bold text-app-text">Sandbox networking disabled</strong>
                      <span className="text-micro text-app-muted block mt-0.75">Default-deny network egress for repository code.</span>
                    </div>
                    <ToggleSwitch defaultChecked />
                  </div>

                  <div className="flex items-center gap-4.5 py-3.25 border-t border-[#2c3135]">
                    <div className="flex-1">
                      <strong className="text-2.75 block font-bold text-app-text">Human approval for repository writes</strong>
                      <span className="text-micro text-app-muted block mt-0.75">Patch review, sandbox approval, and write approval are separate.</span>
                    </div>
                    <ToggleSwitch defaultChecked disabled />
                  </div>

                  <div className="flex items-center gap-4.5 py-3.25 border-t border-[#2c3135]">
                    <div className="flex-1">
                      <strong className="text-2.75 block font-bold text-app-text">Redact secrets from logs</strong>
                      <span className="text-micro text-app-muted block mt-0.75">Never record API tokens or refresh-token values.</span>
                    </div>
                    <ToggleSwitch defaultChecked disabled />
                  </div>

                  <div className="flex items-center gap-4.5 py-3.25 border-t border-[#2c3135]">
                    <div className="flex-1">
                      <strong className="text-2.75 block font-bold text-app-text">First-user bootstrap mode</strong>
                      <span className="text-micro text-app-muted block mt-0.75">Disable open public registration for this single-user installation.</span>
                    </div>
                    <ToggleSwitch defaultChecked />
                  </div>
                </div>
              </div>
            )}

            {/* Run Limits Tab */}
            {activeTab === "limits" && (
              <div className="animate-in fade-in duration-200">
                <div className="p-5.5">
                  <h3 className="text-3.25 font-bold m-0 mb-1">Per-run budgets</h3>
                  <p className="text-2.75 text-app-muted m-0 mb-5">Bound token spend and prevent runaway agent loops.</p>
                  
                  <div className="flex flex-col gap-1.75 mb-3.75">
                    <label className="text-2.75 text-[#d5d9dc] font-semibold">Maximum model calls per run</label>
                    <input type="number" defaultValue="12" min="1" max="100" className="w-full border border-[#3a4248] bg-[#141719] text-app-text rounded-lg px-3 py-2.5 text-[12px] focus:outline-none focus:border-app-accent" />
                  </div>

                  <div className="flex flex-col gap-1.75 mb-3.75">
                    <label className="text-2.75 text-[#d5d9dc] font-semibold">Maximum repair attempts</label>
                    <input type="number" defaultValue="2" min="0" max="5" className="w-full border border-[#3a4248] bg-[#141719] text-app-text rounded-lg px-3 py-2.5 text-[12px] focus:outline-none focus:border-app-accent" />
                  </div>

                  <div className="flex flex-col gap-1.75 mb-3.75">
                    <label className="text-2.75 text-[#d5d9dc] font-semibold">Sandbox timeout (seconds)</label>
                    <input type="number" defaultValue="120" min="10" max="900" className="w-full border border-[#3a4248] bg-[#141719] text-app-text rounded-lg px-3 py-2.5 text-[12px] focus:outline-none focus:border-app-accent" />
                  </div>

                  <div className="flex items-center gap-4.5 py-3.25 border-t border-[#2c3135]">
                    <div className="flex-1">
                      <strong className="text-2.75 block font-bold text-app-text">Stop at budget limit</strong>
                      <span className="text-micro text-app-muted block mt-0.75">Pause and explain when a cap is reached.</span>
                    </div>
                    <ToggleSwitch defaultChecked />
                  </div>
                </div>
              </div>
            )}

            {/* Storage Tab */}
            {activeTab === "storage" && (
              <div className="animate-in fade-in duration-200">
                <div className="p-5.5">
                  <h3 className="text-3.25 font-bold m-0 mb-1">Persistence</h3>
                  <p className="text-2.75 text-app-muted m-0 mb-5">Keep app state, code index, LangGraph checkpoints, and repository files conceptually separate.</p>
                  
                  <div className="flex items-center gap-4.5 py-3.25 border-t border-[#2c3135]">
                    <div className="flex-1">
                      <strong className="text-2.75 block font-bold text-app-text">Application database</strong>
                      <span className="text-micro text-app-muted block mt-0.75">SQLite · ./data/forgepath.db</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 border border-status-green-line bg-status-green-bg rounded-md text-micro text-status-green whitespace-nowrap before:content-[''] before:w-1.25 before:h-1.25 before:bg-current before:rounded-full">Connected</span>
                  </div>

                  <div className="flex items-center gap-4.5 py-3.25 border-t border-[#2c3135]">
                    <div className="flex-1">
                      <strong className="text-2.75 block font-bold text-app-text">Vector index</strong>
                      <span className="text-micro text-app-muted block mt-0.75">Local persistent vector store · ./data/index</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 border border-status-green-line bg-status-green-bg rounded-md text-micro text-status-green whitespace-nowrap before:content-[''] before:w-1.25 before:h-1.25 before:bg-current before:rounded-full">Indexed</span>
                  </div>

                  <div className="flex items-center gap-4.5 py-3.25 border-t border-[#2c3135]">
                    <div className="flex-1">
                      <strong className="text-2.75 block font-bold text-app-text">Workflow checkpoints</strong>
                      <span className="text-micro text-app-muted block mt-0.75">Persisted run state and approval resume tokens.</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 border border-status-green-line bg-status-green-bg rounded-md text-micro text-status-green whitespace-nowrap before:content-[''] before:w-1.25 before:h-1.25 before:bg-current before:rounded-full">Enabled</span>
                  </div>

                  <div className="mt-4 p-[13px_15px] border border-[#354a60] bg-[#1b242d] text-[#b9cce0] rounded-micro flex gap-2.75 text-2.75">
                    <span className="shrink-0 text-base leading-none">ⓘ</span>
                    <div>
                      <strong className="text-callout-strong">PostgreSQL is not mandatory just because of deployment. </strong>
                      SQLite is reasonable for a private, single-user desktop app. Consider PostgreSQL for shared multi-user hosting or higher write concurrency; use migrations and portable schema from day one.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  );
};

const ToggleSwitch = ({ defaultChecked = false, disabled = false }) => (
  <input
    type="checkbox"
    defaultChecked={defaultChecked}
    disabled={disabled}
    className="appearance-none w-8.5 h-5 bg-[#454c51] border border-[#5b6369] rounded-5 relative cursor-pointer shrink-0 transition-colors checked:bg-[#718e4b] checked:border-[#8caf5d] after:content-[''] after:absolute after:w-3 after:h-3 after:rounded-full after:bg-white after:top-0.75 after:left-0.75 checked:after:left-4.25 after:transition-all disabled:opacity-60 disabled:cursor-not-allowed"
  />
);

export default SettingsPage;
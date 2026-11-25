import { useEffect, useState } from "react";
import {
  deleteAIConfiguration,
  getAIConfiguration,
  saveAIConfiguration,
  testAIConfiguration,
  type AIProvider,
} from "../Api/AIConfiguration";
import { useAuthStore } from "../store/useAuthStore";
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Database,
  HardDrive,
  Info,
  KeyRound,
  LockKeyhole,
  Server,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

type Tab = "general" | "model" | "security" | "limits" | "storage";
type CredentialMode = "platform" | "byok";

const tabs = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "model", label: "Model provider", icon: Sparkles },
  { id: "security", label: "Security & privacy", icon: ShieldCheck },
  { id: "limits", label: "Run limits", icon: SlidersHorizontal },
  { id: "storage", label: "Storage", icon: Database },
] as const;

const providers = [
  { value: "nvidia", label: "NVIDIA" },
  { value: "huggingface", label: "Hugging Face" },
  { value: "openai", label: "OpenAI" },
] as const;

const availableModels: Record<string, { id: string; label: string }[]> = {
  nvidia: [{ id: "nvidia/nemotron-3-ultra-550b-a55b", label: "Nemotron 3 Ultra" }],
  huggingface: [{ id: "Qwen/Qwen3-Coder-Next", label: "Qwen3 Coder Next" }],
  openai: [{ id: "gpt-6-luna", label: "GPT-6 Luna" }],
};

const panel =
  "min-w-0 overflow-hidden rounded-panel border " +
  "border-app-line bg-app-panel shadow-panel";

const Field = ({
  label,
  description,
  value,
}: {
  label: string;
  description: string;
  value: string;
}) => (
  <div className="flex flex-col gap-1 border-b border-app-line-faint py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
    <div className="min-w-0 flex-1">
      <p className="text-xs font-semibold text-app-text">
        {label}
      </p>
      <p className="mt-1 text-2xs leading-relaxed text-app-muted">
        {description}
      </p>
    </div>
    <span className="shrink-0 text-xs text-app-muted sm:text-right">
      {value}
    </span>
  </div>
);

const SectionTitle = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="border-b border-app-line px-4 py-4 sm:px-5">
    <h2 className="text-[13px] font-bold text-app-text">
      {title}
    </h2>
    <p className="mt-1 text-2xs leading-relaxed text-app-muted">
      {description}
    </p>
  </div>
);

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [mode, setMode] = useState<CredentialMode>("platform");
  const [provider, setProvider] = useState<AIProvider>("nvidia");
  const [modelId, setModelId] = useState("nvidia/nemotron-3-ultra-550b-a55b");
  const [apiKey, setApiKey] = useState("");
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [savedProvider, setSavedProvider] = useState<AIProvider | null>(null);
  const [savedModelId, setSavedModelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!token) return;
    let active = true;
    getAIConfiguration(token)
      .then((config) => {
        if (!active) return;
        if (config.provider && config.model_identifier) {
          setProvider(config.provider);
          setModelId(config.model_identifier);
          setSavedProvider(config.provider);
          setSavedModelId(config.model_identifier);
          setMode("byok");
        } else {
          setSavedProvider(null);
          setSavedModelId(null);
          setMode("platform");
        }
        setHasSavedKey(config.has_api_key);
      })
      .catch(() => {
        if (active) setMessage("Unable to load your saved AI settings.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [token]);

  const saveSettings = async () => {
    if (!token) { setMessage("Sign in to save your AI settings."); return; }
    const requiresNewKey = !hasSavedKey || provider !== savedProvider;
    if (!modelId.trim() || (requiresNewKey && !apiKey.trim())) {
      setMessage("Enter a model identifier and API key."); return;
    }
    setIsBusy(true);
    setMessage("");
    try {
      const saved = await saveAIConfiguration(token, provider, modelId.trim(), apiKey);
      setHasSavedKey(saved.has_api_key);
      setSavedProvider(saved.provider);
      setSavedModelId(saved.model_identifier);
      setApiKey("");
      setMessage("Saved securely. This model will be used for your AI requests.");
    } catch { setMessage("Could not save. Check the provider, model and API key."); }
    finally { setIsBusy(false); }
  };

  const testSettings = async () => {
    if (!token) return;
    if (!window.confirm(
      "Send a small paid request using your saved provider configuration?"
    )) return;
    setIsBusy(true);
    setMessage("");
    try {
      await testAIConfiguration(token);
      setMessage("Connection successful.");
    } catch { setMessage("Connection failed. Check the saved key and model access."); }
    finally { setIsBusy(false); }
  };

  const removeSettings = async () => {
    if (!token) return;
    if (!window.confirm(
      "Remove your saved personal provider and encrypted API key?"
    )) return;
    setIsBusy(true);
    try {
      await deleteAIConfiguration(token);
      setHasSavedKey(false);
      setSavedProvider(null);
      setSavedModelId(null);
      setApiKey("");
      setMode("platform");
      setMessage("Personal configuration removed. ForgePath AI is now selected.");
    } catch { setMessage("Unable to remove the configuration."); }
    finally { setIsBusy(false); }
  };

  const selectPlatformMode = async () => {
    if (!token || isLoading || isBusy) return;
    if (!hasSavedKey) {
      setMode("platform");
      return;
    }
    if (!window.confirm(
      "Switch to ForgePath AI and remove your saved personal provider key?"
    )) return;

    setIsBusy(true);
    setMessage("");
    try {
      await deleteAIConfiguration(token);
      setHasSavedKey(false);
      setSavedProvider(null);
      setSavedModelId(null);
      setApiKey("");
      setMode("platform");
      setMessage("Personal configuration removed. ForgePath AI is now selected.");
    } catch {
      setMessage("Could not switch to ForgePath AI. Your saved configuration was kept.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="min-w-0 bg-app-bg px-3 py-5 text-app-text sm:px-6 sm:py-7 lg:px-9">
      <div className="mx-auto max-w-app space-y-5">
        <header>
          <p className="mb-1.5 text-micro font-bold uppercase tracking-eyebrow text-app-dim">
            SYSTEM / CONFIGURATION
          </p>

          <h1 className="font-manrope text-[28px] font-extrabold tracking-tight">
            Settings
          </h1>

          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-app-muted">
            Manage your workspace, AI provider, execution boundaries,
            and system configuration.
          </p>
        </header>

        <div className="flex items-start gap-3 rounded-callout border border-status-blue-line bg-status-blue-bg p-4">
          <Info
            size={17}
            className="mt-0.5 shrink-0 text-status-blue"
            aria-hidden="true"
          />
          <div className="text-xs leading-relaxed text-status-blue">
            <strong>Backend-controlled settings.</strong>{" "}
            Personal API keys are encrypted on the server. Only NVIDIA,
            OpenAI, and Hugging Face are currently connected.
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 items-start gap-4 md:grid-cols-[210px_minmax(0,1fr)]">
          <aside
            aria-label="Settings sections"
            className={`${panel} flex gap-1 overflow-x-auto p-2 md:flex-col`}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={selected ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs transition-colors md:w-full ${
                    selected
                      ? "bg-app-panel3 font-semibold text-app-accent"
                      : "text-app-muted hover:bg-app-row-hover hover:text-app-text"
                  }`}
                >
                  <Icon size={15} aria-hidden="true" />
                  <span className="flex-1 whitespace-nowrap">
                    {tab.label}
                  </span>
                  {selected && (
                    <ChevronRight
                      size={13}
                      className="hidden md:block"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </aside>

          <main className={panel}>
            {activeTab === "general" && (
              <>
                <SectionTitle
                  title="Workspace preferences"
                  description="Your current ForgePath workspace configuration."
                />

                <div className="px-4 sm:px-5">
                  <Field
                    label="Workspace"
                    description="Current local-development workspace."
                    value="Personal workspace"
                  />
                  <Field
                    label="Default repository"
                    description="The active project is selected from your private project list."
                    value="Project-scoped"
                  />
                  <Field
                    label="Task creation"
                    description="Tasks can be created from findings in the current project snapshot review."
                    value="Review-driven"
                  />
                  <Field
                    label="Confirmation before actions"
                    description="Execution and workflow decisions require explicit confirmation in their respective screens."
                    value="Required by UI"
                  />
                </div>
              </>
            )}

            {activeTab === "model" && (
              <>
                <SectionTitle
                  title="Language model provider"
                  description="Choose between ForgePath-managed AI and your own provider credentials."
                />

                <div className="space-y-5 p-4 sm:p-5">
                  {isLoading && (
                    <p role="status" className="text-xs text-app-muted">
                      Loading your saved AI configuration...
                    </p>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={isLoading || isBusy}
                      onClick={() => void selectPlatformMode()}
                      aria-pressed={mode === "platform"}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        mode === "platform"
                          ? "border-app-accent bg-app-panel3"
                          : "border-app-line bg-app-bg hover:bg-app-row-hover"
                      }`}
                    >
                      <Server
                        size={20}
                        className="text-app-accent"
                        aria-hidden="true"
                      />
                      <strong className="mt-3 block text-xs">
                        ForgePath AI
                      </strong>
                      <p className="mt-1 text-2xs leading-relaxed text-app-muted">
                        Use the model and API key configured
                        securely on the ForgePath backend.
                      </p>
                      <span className="mt-3 block text-micro text-app-accent">
                        {mode === "platform"
                          ? (hasSavedKey ? "Remove personal settings to activate" : "Selected")
                          : "Select mode"}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isLoading || isBusy}
                      onClick={() => setMode("byok")}
                      aria-pressed={mode === "byok"}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        mode === "byok"
                          ? "border-app-accent bg-app-panel3"
                          : "border-app-line bg-app-bg hover:bg-app-row-hover"
                      }`}
                    >
                      <KeyRound
                        size={20}
                        className="text-app-accent"
                        aria-hidden="true"
                      />
                      <strong className="mt-3 block text-xs">
                        Bring your own API key
                      </strong>
                      <p className="mt-1 text-2xs leading-relaxed text-app-muted">
                        Connect a supported provider using your
                        own account and billing.
                      </p>
                      <span className="mt-3 block text-micro text-app-accent">
                        {mode === "byok"
                          ? "Selected"
                          : "Select mode"}
                      </span>
                    </button>
                  </div>

                  {mode === "platform" ? (
                    <div className="rounded-lg border border-app-line bg-app-panel2 p-4">
                      <div className="flex items-start gap-3">
                        <Server
                          size={18}
                          className="shrink-0 text-app-accent"
                          aria-hidden="true"
                        />

                        <div className="min-w-0">
                          <h3 className="text-xs font-semibold">
                            Server-managed provider
                          </h3>
                          <p className="mt-2 text-2xs leading-relaxed text-app-muted">
                            ForgePath will use the backend's
                            configured credentials. The browser
                            never receives the provider API key.
                          </p>
                          <p className="mt-3 text-2xs text-status-amber">
                            {hasSavedKey
                              ? "A saved personal configuration remains active until you remove it."
                              : "Using the server-managed default model."}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="model-provider"
                          className="mb-2 block text-xs font-semibold"
                        >
                          Provider
                        </label>
                        <select
                          id="model-provider"
                          value={provider}
                          disabled={isLoading || isBusy}
                          onChange={(event) => {
                            const nextProvider = event.target.value as AIProvider;
                            setProvider(nextProvider);
                            setModelId(availableModels[nextProvider]?.[0]?.id ?? "");
                          }}
                          className="w-full rounded-lg border border-app-line bg-app-bg px-3 py-2.5 text-xs text-app-text"
                        >
                          {providers.map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="model-name"
                          className="mb-2 block text-xs font-semibold"
                        >
                          Model identifier
                        </label>
                        <input
                          id="model-name"
                          list="suggested-models"
                          value={modelId}
                          disabled={isLoading || isBusy}
                          onChange={(event) => setModelId(event.target.value)}
                          placeholder="Enter your provider's model identifier"
                          maxLength={200}
                          className="w-full rounded-lg border border-app-line bg-app-bg px-3 py-2.5 text-xs text-app-text"
                        />
                        <datalist id="suggested-models">
                          {(availableModels[provider] ?? []).map((model) => (
                            <option key={model.id} value={model.id}>{model.label}</option>
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <label
                          htmlFor="provider-key"
                          className="mb-2 block text-xs font-semibold"
                        >
                          Provider API key
                        </label>
                        <input
                          id="provider-key"
                          type="password"
                          value={apiKey}
                          disabled={isLoading || isBusy}
                          onChange={(event) => setApiKey(event.target.value)}
                          placeholder={
                            hasSavedKey && provider === savedProvider
                              ? "Saved key hidden — leave blank to keep it"
                              : "Enter a key for this provider"
                          }
                          autoComplete="new-password"
                          spellCheck={false}
                          className="w-full rounded-lg border border-app-line bg-app-bg px-3 py-2.5 text-xs text-app-text"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={isLoading || isBusy}
                          onClick={saveSettings} className="rounded-lg bg-app-accent px-4 py-2 text-xs font-semibold text-app-bg disabled:opacity-50">
                          {isBusy ? "Working…" : "Save configuration"}
                        </button>
                        <button type="button" disabled={
                          isLoading || isBusy || !hasSavedKey ||
                          provider !== savedProvider || modelId.trim() !== savedModelId ||
                          Boolean(apiKey.trim())
                        }
                          onClick={testSettings} className="rounded-lg border border-app-line px-4 py-2 text-xs disabled:opacity-50">
                          Test saved connection
                        </button>
                        <button type="button" disabled={isLoading || isBusy || !hasSavedKey}
                          onClick={removeSettings} className="rounded-lg border border-app-line px-4 py-2 text-xs disabled:opacity-50">
                          Remove personal key
                        </button>
                      </div>
                      <div className="flex items-start gap-2 rounded-lg border border-status-amber-line bg-status-amber-bg p-3">
                        <AlertTriangle
                          size={16}
                          className="shrink-0 text-status-amber"
                          aria-hidden="true"
                        />
                        <p className="text-2xs leading-relaxed text-status-amber">
                          Connection testing sends a small paid request to your provider.
                        </p>
                      </div>
                    </div>
                  )}

                  {message && (
                    <p role="status" className="text-xs text-app-muted">
                      {message}
                    </p>
                  )}

                  <div className="border-t border-app-line pt-4">
                    <div className="flex items-start gap-3">
                      <LockKeyhole
                        size={17}
                        className="shrink-0 text-status-green"
                        aria-hidden="true"
                      />
                      <div>
                        <h3 className="text-xs font-semibold">
                          Secrets stay server-side
                        </h3>
                        <p className="mt-1 text-2xs leading-relaxed text-app-muted">
                          Provider keys must never be saved to
                          localStorage, embedded in frontend
                          environment variables, or returned
                          in settings responses.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-micro text-app-dim">
                    Changes are applied only after saving. Your API key is never returned to this page.
                  </p>
                </div>
              </>
            )}

            {activeTab === "security" && (
              <>
                <SectionTitle
                  title="Security & privacy"
                  description="Execution safeguards and configuration boundaries."
                />

                <div className="px-4 sm:px-5">
                  <Field
                    label="Human approval"
                    description="Workflow patch and test checkpoints require explicit decisions."
                    value="Workflow-controlled"
                  />
                  <Field
                    label="Sandbox execution"
                    description="Runtime isolation and network restrictions are controlled by the backend."
                    value="Backend-controlled"
                  />
                  <Field
                    label="Secret redaction"
                    description="Credentials must not appear in logs, API responses, or workflow output."
                    value="Required"
                  />
                  <Field
                    label="API access"
                    description="Host binding and CORS settings are defined by the backend deployment."
                    value="Deployment setting"
                  />
                  <Field
                    label="Registration policy"
                    description="Public signup restrictions require backend enforcement."
                    value="Not managed here"
                  />
                </div>
              </>
            )}

            {activeTab === "limits" && (
              <>
                <SectionTitle
                  title="Run limits"
                  description="Limits need to be enforced at the execution layer."
                />

                <div className="px-4 sm:px-5">
                  <Field
                    label="Model call budget"
                    description="Maximum AI requests allowed within a run."
                    value="Backend-configured"
                  />
                  <Field
                    label="Repair attempts"
                    description="Maximum automatic repair cycles."
                    value="Backend-configured"
                  />
                  <Field
                    label="Sandbox timeout"
                    description="Maximum permitted test execution duration."
                    value="Backend-enforced"
                  />
                  <Field
                    label="ForgePath AI allowance"
                    description="Per-user sponsored API usage requires quota and billing enforcement."
                    value="Not configured"
                  />
                </div>

                <div className="flex gap-2 border-t border-app-line bg-app-panel2 p-4 text-2xs text-app-muted">
                  <Activity
                    size={15}
                    className="shrink-0"
                    aria-hidden="true"
                  />
                  Limits shown here are informational,
                  not editable settings.
                </div>
              </>
            )}

            {activeTab === "storage" && (
              <>
                <SectionTitle
                  title="Storage"
                  description="Application data, indexes, and workflow checkpoints."
                />

                <div className="px-4 sm:px-5">
                  <Field
                    label="Application database"
                    description="Stores application records and user accounts."
                    value="PostgreSQL"
                  />
                  <Field
                    label="Code index"
                    description="Semantic search data is managed by the backend."
                    value="Backend-managed"
                  />
                  <Field
                    label="Workflow checkpoints"
                    description="Durable agent state and pending decisions."
                    value="Backend-managed"
                  />
                  <Field
                    label="Repository files"
                    description="Uploaded source snapshots are isolated by user, project, and immutable snapshot ID."
                    value="Private snapshots"
                  />
                </div>

                <div className="flex items-start gap-2 border-t border-app-line bg-app-panel2 p-4 text-2xs text-app-muted">
                  <HardDrive
                    size={15}
                    className="shrink-0"
                    aria-hidden="true"
                  />
                  Storage health and capacities require
                  authenticated monitoring endpoints.
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

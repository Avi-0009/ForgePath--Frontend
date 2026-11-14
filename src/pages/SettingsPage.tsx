import { useState } from "react";
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
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google Gemini" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "groq", label: "Groq" },
  { value: "custom", label: "OpenAI-compatible API" },
] as const;

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
  const [provider, setProvider] = useState("openai");

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
            Provider credentials, security boundaries, and run
            limits must be enforced by the server. This page
            does not claim to save settings for which a backend
            API has not yet been connected.
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
                    description="Repository defaults will be available after project-source integration."
                    value="Not configured"
                  />
                  <Field
                    label="Task creation"
                    description="New task creation requires an authorized project source."
                    value="Not yet enabled"
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
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setMode("platform")}
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
                          ? "Selected for preview"
                          : "Select mode"}
                      </span>
                    </button>

                    <button
                      type="button"
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
                          ? "Selected for preview"
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
                            Provider availability and model name
                            have not been verified by a settings API.
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
                          onChange={(event) =>
                            setProvider(event.target.value)
                          }
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
                          type="text"
                          placeholder="Available after backend integration"
                          disabled
                          className="w-full rounded-lg border border-app-line bg-app-bg px-3 py-2.5 text-xs text-app-muted disabled:opacity-60"
                        />
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
                          placeholder="Secure credential storage not connected"
                          disabled
                          autoComplete="off"
                          className="w-full rounded-lg border border-app-line bg-app-bg px-3 py-2.5 text-xs text-app-muted disabled:opacity-60"
                        />
                      </div>

                      <div className="flex items-start gap-2 rounded-lg border border-status-amber-line bg-status-amber-bg p-3">
                        <AlertTriangle
                          size={16}
                          className="shrink-0 text-status-amber"
                          aria-hidden="true"
                        />
                        <p className="text-2xs leading-relaxed text-status-amber">
                          BYOK needs authenticated, per-user
                          encrypted credential storage and a
                          model-routing service. Credentials
                          will not be collected until those
                          backend protections exist.
                        </p>
                      </div>
                    </div>
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
                    These mode selections are not persisted
                    or applied to AI requests yet.
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
                    description="Source code storage and ingestion remain separate from app data."
                    value="Ingestion deferred"
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
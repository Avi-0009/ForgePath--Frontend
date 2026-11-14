import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowUpRight,
  Database,
  FolderGit2,
  Info,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

import {
  getCodebaseSources,
  getCodeIntelligenceError,
  type CodebaseSource,
} from "../Api/CodeIntelligence";
import { useAuthStore } from "../store/useAuthStore";

const panel =
  "min-w-0 overflow-hidden rounded-panel border border-app-line " +
  "bg-app-panel shadow-panel";

const RepositoriesPage = () => {
  const token = useAuthStore((state) => state.token);

  const [sources, setSources] = useState<CodebaseSource[]>([]);
  const [selectedRoot, setSelectedRoot] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!token) {
        setSources([]);
        setSelectedRoot("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const result = await getCodebaseSources(token);

        if (cancelled) return;

        setSources(result);
        setSelectedRoot((current) =>
          result.some((source) => source.workspaceRoot === current)
            ? current
            : (result[0]?.workspaceRoot ?? ""),
        );
      } catch (cause) {
        if (!cancelled) {
          setError(await getCodeIntelligenceError(cause));
          setSources([]);
          setSelectedRoot("");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  const selected = sources.find(
    (source) => source.workspaceRoot === selectedRoot,
  );

  const visibleSources = sources.filter((source) =>
    source.name.toLowerCase().includes(filter.trim().toLowerCase()),
  );

  return (
    <div className="min-w-0 bg-app-bg px-3 py-5 text-app-text sm:px-6 sm:py-7 lg:px-9">
      <div className="mx-auto max-w-app space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1.5 text-micro font-bold uppercase tracking-eyebrow text-app-dim">
              WORKSPACE / SOURCE CONTROL
            </p>

            <h1 className="font-manrope text-[28px] font-extrabold tracking-tight">
              Repositories
            </h1>

            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-app-muted">
              Explore configured local codebases. Remote repository
              connection and indexing will be available after
              the ingestion integration is complete.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            disabled={!token || loading}
            className="btn"
          >
            <RefreshCw
              size={14}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </header>

        <div className="flex items-start gap-3 rounded-callout border border-status-blue-line bg-status-blue-bg p-4">
          <Info
            size={18}
            className="shrink-0 text-status-blue"
          />

          <p className="text-xs leading-relaxed text-status-blue">
            <strong>Local source access only.</strong> These are
            workspace roots permitted by the backend, not
            GitHub repositories connected to your account.
            Selecting one here does not index, clone, or
            modify any files.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-status-amber-line bg-status-amber-bg p-4 text-xs text-status-amber"
          >
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-home">
          <section className={panel}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-line p-4 sm:p-5">
              <div>
                <h2 className="text-[13px] font-bold">
                  Available local codebases
                </h2>
                <p className="mt-1 text-2xs text-app-muted">
                  Backend-configured workspace roots
                </p>
              </div>

              <div className="flex min-w-0 items-center gap-2 rounded-lg border border-app-line bg-app-panel2 px-3">
                <Search
                  size={14}
                  className="shrink-0 text-app-muted"
                />
                <input
                  type="search"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  placeholder="Filter codebases..."
                  aria-label="Filter codebases"
                  className="min-h-9 min-w-0 w-40 bg-transparent text-xs outline-none placeholder:text-app-dim"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 p-12 text-xs text-app-muted">
                <LoaderCircle
                  size={17}
                  className="animate-spin"
                />
                Loading codebases...
              </div>
            ) : sources.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <FolderGit2
                  size={28}
                  className="mx-auto text-app-accent"
                />
                <h3 className="mt-3 text-sm font-semibold">
                  No local codebases available
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-app-muted">
                  Configure an allowed workspace root on the
                  backend to access source files locally.
                  Hosted repository connection remains deferred.
                </p>
              </div>
            ) : visibleSources.length === 0 ? (
              <p className="p-8 text-center text-xs text-app-muted">
                No codebases match your filter.
              </p>
            ) : (
              <div className="divide-y divide-app-line-faint">
                {visibleSources.map((source) => {
                  const active =
                    source.workspaceRoot === selectedRoot;

                  return (
                    <button
                      key={source.workspaceRoot}
                      type="button"
                      onClick={() =>
                        setSelectedRoot(source.workspaceRoot)
                      }
                      aria-pressed={active}
                      className={`flex w-full min-w-0 items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-app-row-hover sm:px-5 ${
                        active ? "bg-app-panel3" : ""
                      }`}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-app-line bg-app-icon-bg">
                        <Database
                          size={17}
                          className={
                            active
                              ? "text-app-accent"
                              : "text-app-muted"
                          }
                        />
                      </span>

                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-xs text-app-text">
                          {source.name}
                        </strong>
                        <span className="mt-1 block break-all font-mono text-micro text-app-dim">
                          {source.workspaceRoot}
                        </span>
                      </div>

                      <span
                        className={`shrink-0 rounded-md border px-2 py-1 text-micro ${
                          active
                            ? "border-status-green-line bg-status-green-bg text-status-green"
                            : "border-app-line text-app-muted"
                        }`}
                      >
                        {active ? "Selected" : "Select"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <aside className={panel}>
            <div className="border-b border-app-line p-4 sm:p-5">
              <h2 className="text-[13px] font-bold">
                Selected codebase
              </h2>
              <p className="mt-1 text-2xs text-app-muted">
                Local workspace inspection
              </p>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              {selected ? (
                <>
                  <div className="flex items-start gap-3">
                    <FolderGit2
                      size={19}
                      className="shrink-0 text-app-accent"
                    />

                    <div className="min-w-0">
                      <h3 className="text-xs font-bold">
                        {selected.name}
                      </h3>
                      <p className="mt-2 break-all font-mono text-micro text-app-muted">
                        {selected.workspaceRoot}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg border border-status-green-line bg-status-green-bg p-3 text-2xs text-status-green">
                    <ShieldCheck
                      size={16}
                      className="shrink-0"
                    />
                    Available for permitted local operations.
                  </div>
                </>
              ) : (
                <p className="text-xs text-app-muted">
                  Select an available codebase to inspect its
                  configured source path.
                </p>
              )}

              <div className="border-t border-app-line pt-4">
                <h3 className="mb-3 text-micro font-bold uppercase tracking-eyebrow text-app-dim">
                  Continue with
                </h3>

                <div className="space-y-2">
                  {[
                    {
                      to: "/intel",
                      label: "Code intelligence",
                    },
                    {
                      to: "/investigation",
                      label: "Investigation",
                    },
                    {
                      to: "/test-lab",
                      label: "Test lab",
                    },
                  ].map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="flex items-center justify-between gap-2 rounded-lg border border-app-line bg-app-panel2 px-3 py-2.5 text-xs font-semibold text-app-text hover:bg-app-panel3"
                    >
                      {item.label}
                      <ArrowUpRight
                        size={14}
                        className="text-app-accent"
                      />
                    </Link>
                  ))}
                </div>

                <p className="mt-3 text-micro leading-relaxed text-app-dim">
                  Each engineering tool currently has its own
                  source selector. This selection is not
                  persisted across pages.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default RepositoriesPage;
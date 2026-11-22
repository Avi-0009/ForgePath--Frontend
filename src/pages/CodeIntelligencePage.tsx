import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Code2,
  FileCode2,
  FolderGit2,
  Info,
  LoaderCircle,
  LockKeyhole,
  Search,
  ShieldAlert,
} from "lucide-react";

import {
  getCodeIntelligenceError,
  searchProjectCodebase,
  getProjectSemanticIndexStatus,
  getProjectSemanticIndexJob,
  getLatestProjectSemanticIndexJob,
  previewProjectSemanticIndex,
  startProjectSemanticIndexJob,
  searchProjectSemanticIndex,
  type SemanticIndexStatus,
  type SemanticIndexPreview,
  type SemanticIndexJob,
  type CodebaseSource,
  type CodeSearchResponse,
  type SearchHit,
} from "../Api/CodeIntelligence";
import { listProjects } from "../Api/ProjectActivation";
import { useAuthStore } from "../store/useAuthStore";
import { useActiveProjectId } from "../store/useActiveProjectId";
import ReferenceIntegrityPanel from "../components/intelligence/ReferenceIntegrityPanel";

const suggestedQuestions = [
  "Where is session expiry checked?",
  "What calls the refresh handler?",
  "Show related tests",
];

const panelClass =
  "min-w-0 overflow-hidden rounded-panel border " +
  "border-app-line bg-app-panel shadow-panel";

const CodeEvidence = ({ hit }: { hit: SearchHit }) => {
  return (
    <article className="border-b border-app-line-faint px-4 py-4 last:border-b-0 sm:px-5">
      <div className="flex flex-wrap items-start gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-app-icon-bg2 text-status-blue">
          <FileCode2 size={15} aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="break-all font-mono text-xs font-semibold text-app-text">
            {hit.relative_path}
          </p>

          <p className="mt-1 font-mono text-micro text-status-blue">
            Lines {hit.start_line}–{hit.end_line}
            {" · "}
            {hit.language || "Unknown language"}
          </p>
        </div>

        <span className="rounded-md border border-app-line px-2 py-1 text-micro text-app-muted">
          Chunk {hit.chunk_index + 1}
        </span>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-app-line bg-app-bg">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-app-line bg-app-panel2 px-3 py-2">
          <span className="font-mono text-micro text-app-muted">
            Source evidence
          </span>

          {hit.distance !== null && (
            <span
              className="font-mono text-micro text-app-dim"
              title="Vector distance; lower typically means closer"
            >
              Distance: {hit.distance.toFixed(4)}
            </span>
          )}
        </div>

        <pre className="max-h-72 overflow-auto whitespace-pre p-3 font-mono text-2xs leading-5 text-app-mono-text">
          <code>{hit.content}</code>
        </pre>
      </div>
    </article>
  );
};

const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="flex items-start justify-between gap-4 py-3">
    <span className="text-2xs text-app-muted">{label}</span>
    <strong className="wrap-break-words text-right text-2xs text-app-text">
      {value}
    </strong>
  </div>
);

const CodeIntelligencePage = () => {
  const token = useAuthStore((state) => state.token);
  const activeProjectId = useActiveProjectId();

  const [sources, setSources] = useState<CodebaseSource[]>([]);
  const [selectedSource, setSelectedSource] = useState("");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<CodeSearchResponse | null>(
    null,
  );

  const [loadingSources, setLoadingSources] = useState(true);
  const [searching, setSearching] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(
    null,
  );
  const [searchError, setSearchError] = useState<string | null>(
    null,
  );
  const [semanticStatus, setSemanticStatus] = useState<SemanticIndexStatus | null>(null);
  const [semanticPreview, setSemanticPreview] = useState<SemanticIndexPreview | null>(null);
  const [semanticJob, setSemanticJob] = useState<SemanticIndexJob | null>(null);
  const [semanticBusy, setSemanticBusy] = useState(false);
  const [semanticError, setSemanticError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<"text" | "semantic">("text");

  useEffect(() => {
    let cancelled = false;

    const loadSources = async () => {
      if (!token) {
        if (!cancelled) {
          setLoadingSources(false);
        }
        return;
      }

      try {
        const { items } = await listProjects(token);
        const availableSources: CodebaseSource[] = items
          .filter((project) => project.status === "ready")
          .map((project) => ({
            name: project.name,
            workspaceRoot: project.id,
          }));

        if (cancelled) return;

        setSources(availableSources);
        setSelectedSource((current) =>
          availableSources.some(
            (source) => source.workspaceRoot === current,
          )
            ? current
            : (availableSources.find((source) => source.workspaceRoot === activeProjectId)
                ?.workspaceRoot ?? availableSources[0]?.workspaceRoot ?? ""),
        );
        setSourceError(null);
      } catch (error) {
        if (cancelled) return;

        setSourceError(await getCodeIntelligenceError(error));
      } finally {
        if (!cancelled) {
          setLoadingSources(false);
        }
      }
    };

    void loadSources();

    return () => {
      cancelled = true;
    };
  }, [token, activeProjectId]);

  useEffect(() => {
    if (!token || !selectedSource) return;
    let cancelled = false;
    void getProjectSemanticIndexStatus(token, selectedSource).then((result) => {
      if (!cancelled) setSemanticStatus(result);
    }).catch(async (cause) => {
      if (!cancelled) setSemanticError(await getCodeIntelligenceError(cause));
    });
    void getLatestProjectSemanticIndexJob(token, selectedSource).then((job) => {
      if (!cancelled) setSemanticJob(job);
    }).catch(() => { /* Semantic jobs may be disabled on the backend. */ });
    return () => { cancelled = true; };
  }, [token, selectedSource]);

  useEffect(() => {
    if (!token || !selectedSource || semanticJob?.project_id !== selectedSource ||
        (semanticJob.status !== "queued" && semanticJob.status !== "running")) return;
    let cancelled = false;
    let polling = false;
    const poll = async () => {
      if (polling) return;
      polling = true;
      try {
        const latest = await getProjectSemanticIndexJob(token, selectedSource, semanticJob.job_id);
        if (cancelled) return;
        setSemanticJob(latest);
        if (latest.status === "completed") {
          setSemanticStatus(await getProjectSemanticIndexStatus(token, selectedSource));
        }
      } catch (cause) {
        if (!cancelled) setSemanticError(await getCodeIntelligenceError(cause));
      } finally {
        polling = false;
      }
    };
    const timer = window.setInterval(() => { void poll(); }, 1500);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [token, selectedSource, semanticJob?.job_id, semanticJob?.project_id, semanticJob?.status]);

  const handleSourceChange = (workspaceRoot: string) => {
    setSelectedSource(workspaceRoot);
    setResult(null);
    setSearchError(null);
    setSemanticStatus(null);
    setSemanticPreview(null);
    setSemanticJob(null);
    setSemanticError(null);
    setSearchMode("text");
  };

  const previewIndex = async () => {
    if (!token || !selectedSource) return;
    setSemanticBusy(true);
    setSemanticError(null);
    try {
      setSemanticPreview(await previewProjectSemanticIndex(token, selectedSource));
    } catch (cause) {
      setSemanticError(await getCodeIntelligenceError(cause));
    } finally {
      setSemanticBusy(false);
    }
  };

  const buildIndex = async () => {
    if (!token || !selectedSource || !semanticPreview?.within_limit) return;
    setSemanticBusy(true);
    setSemanticError(null);
    try {
      const job = await startProjectSemanticIndexJob(token, selectedSource, semanticPreview.snapshot_id);
      setSemanticJob(job);
      setSemanticPreview(null);
    } catch (cause) {
      setSemanticError(await getCodeIntelligenceError(cause));
    } finally {
      setSemanticBusy(false);
    }
  };

  const handleSearch = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const query = question.trim();

    if (!token || !selectedSource || !query || searching) {
      return;
    }

    // Reject values not obtained from the backend's source list.
    if (
      !sources.some(
        (source) => source.workspaceRoot === selectedSource,
      )
    ) {
      setSearchError("Select an available codebase.");
      return;
    }

    setSearching(true);
    setSearchError(null);
    setResult(null);

    try {
      const response = searchMode === "semantic"
        ? await searchProjectSemanticIndex(token, selectedSource, query, 6)
        : await searchProjectCodebase(token, selectedSource, query, 6);

      setResult(response);
    } catch (error) {
      setSearchError(await getCodeIntelligenceError(error));
    } finally {
      setSearching(false);
    }
  };

  const selectedSourceName =
    sources.find(
      (source) => source.workspaceRoot === selectedSource,
    )?.name ?? "No codebase selected";

  return (
    <div className="min-w-0 bg-app-bg px-3 py-5 text-app-text sm:px-6 sm:py-7 lg:px-9">
      <div className="mx-auto max-w-app space-y-5">
        {/* Prototype heading */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <p className="mb-1.5 text-micro font-bold uppercase tracking-eyebrow text-app-dim">
              CODE INTELLIGENCE / RETRIEVAL
            </p>

            <h1 className="font-manrope text-[28px] font-extrabold tracking-tight">
              Ask your codebase.
            </h1>

            <p className="mt-1 max-w-170 text-[13px] leading-relaxed text-app-muted">
              Search the selected project's saved code snapshot and inspect
              exact supporting excerpts with file paths and line ranges.
            </p>
          </div>

          <Link
            to="/repositories"
            className="btn shrink-0 self-start"
          >
            <FolderGit2 size={15} aria-hidden="true" />
            Manage sources
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </header>

        <ReferenceIntegrityPanel
          key={selectedSource}
          token={token}
          projectId={selectedSource}
          projectName={selectedSourceName}
        />

        <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-home">
          {/* Main query panel */}
          <section className={panelClass}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-line px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-[13px] font-bold">
                  Codebase query
                </h2>

                <p className="mt-1 text-2xs text-app-muted">
                  Snapshot text search with source evidence
                </p>
              </div>

              <span className="rounded-md border border-app-line px-2 py-1 text-micro text-app-muted">
                {result ? "Results ready" : "Search"}
              </span>
            </div>

            <div className="p-4 sm:p-5">
              {!token && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-status-amber-line bg-status-amber-bg p-3 text-xs text-status-amber">
                  <AlertCircle size={16} className="shrink-0" />
                  Sign in to search available codebases.
                </div>
              )}

              {sourceError && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded-lg border border-status-amber-line bg-status-amber-bg p-3 text-xs text-status-amber"
                >
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{sourceError}</span>
                </div>
              )}

              <form onSubmit={handleSearch}>
                <div className="mb-4">
                  <label
                    htmlFor="intel-source"
                    className="mb-2 block text-2xs font-semibold text-app-text"
                  >
                    Repository
                  </label>

                  <select
                    id="intel-source"
                    value={selectedSource}
                    onChange={(event) =>
                      handleSourceChange(event.target.value)
                    }
                    disabled={
                      loadingSources || sources.length === 0
                    }
                    className="w-full min-w-0 rounded-lg border border-app-line bg-app-bg px-3 py-2.5 text-xs text-app-text outline-none focus-visible:border-app-accent disabled:opacity-50"
                  >
                    {sources.length === 0 && (
                      <option value="">
                        {loadingSources
                          ? "Loading codebases..."
                          : "No configured codebases"}
                      </option>
                    )}

                    {sources.map((source) => (
                      <option
                        key={source.workspaceRoot}
                        value={source.workspaceRoot}
                      >
                        {source.name}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-micro text-app-dim">
                    Only saved projects owned by your account can be selected.
                  </p>
                </div>

                <div className="mb-4 rounded-lg border border-app-line bg-app-panel2 p-4">
                  <p className="text-xs font-bold">Project semantic index</p>
                  <p className="mt-1 text-2xs text-app-muted">
                    {semanticStatus?.status === "ready"
                      ? `Indexed snapshot ready · ${semanticStatus.embedding_model}`
                      : semanticStatus?.status === "disabled"
                        ? (semanticStatus.message ?? "Embedding provider is disabled on the backend.")
                        : "This snapshot has not been semantically indexed."}
                  </p>
                  {semanticStatus?.status === "not_indexed" &&
                    semanticJob?.status !== "queued" && semanticJob?.status !== "running" && (
                    <button
                      type="button"
                      onClick={() => void previewIndex()}
                      disabled={semanticBusy}
                      className="btn mt-3"
                    >
                      {semanticBusy ? "Checking indexing size..." : "Preview embedding cost and size"}
                    </button>
                  )}
                  {semanticJob?.project_id === selectedSource && (
                    <div className="mt-3 rounded-lg border border-app-line bg-app-panel3 p-3 text-2xs" role="status" aria-live="polite">
                      <p className="font-semibold">{semanticJob.message}</p>
                      <p className="mt-1 text-app-muted">
                        {semanticJob.files_done} / {semanticJob.total_files} files processed
                        {" · "}{semanticJob.chunks_embedded} chunks embedded
                      </p>
                      <progress
                        className="mt-2 h-2 w-full accent-app-accent"
                        value={semanticJob.files_done}
                        max={Math.max(1, semanticJob.total_files)}
                        aria-label="Semantic indexing progress"
                      />
                      {(semanticJob.status === "failed" || semanticJob.status === "interrupted") && (
                        <p className="mt-2 text-status-amber">Preview and confirm again to retry. Completed batches may be reused.</p>
                      )}
                    </div>
                  )}
                  {semanticPreview && (
                    <div className="mt-3 rounded-lg border border-status-amber-line bg-status-amber-bg p-3 text-2xs text-status-amber">
                      <p>
                        {semanticPreview.file_count} files · {semanticPreview.estimated_chunks} estimated chunks
                        · model: {semanticPreview.embedding_model}
                      </p>
                      <p className="mt-1">
                        Embedding these chunks sends source excerpts to the configured provider and may incur charges.
                        The exact price is not estimated here. No indexing has started.
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary mt-3"
                        onClick={() => void buildIndex()}
                        disabled={semanticBusy || !semanticPreview.within_limit}
                      >
                        {semanticBusy ? "Starting job..." : "Confirm and start background indexing"}
                      </button>
                      {!semanticPreview.within_limit && (
                        <p className="mt-2">This snapshot exceeds the {semanticPreview.max_chunks}-chunk limit.</p>
                      )}
                    </div>
                  )}
                  {semanticError && <p role="alert" className="mt-2 text-xs text-status-red">{semanticError}</p>}
                </div>

                <div className="mb-4">
                  <label htmlFor="intel-mode" className="mb-2 block text-2xs font-semibold">Search mode</label>
                  <select
                    id="intel-mode"
                    value={searchMode}
                    onChange={(event) => { setSearchMode(event.target.value as "text" | "semantic"); setResult(null); }}
                    className="w-full rounded-lg border border-app-line bg-app-bg p-2.5 text-xs"
                  >
                    <option value="text">Snapshot text search (no AI calls)</option>
                    <option value="semantic" disabled={semanticStatus?.status !== "ready"}>
                      Semantic vector search (requires current index; query uses embeddings)
                    </option>
                  </select>
                </div>

                <div className="mb-4">
                  <label
                    htmlFor="intel-question"
                    className="mb-2 block text-2xs font-semibold text-app-text"
                  >
                    What do you want to understand?
                  </label>

                  <textarea
                    id="intel-question"
                    value={question}
                    onChange={(event) =>
                      setQuestion(event.target.value)
                    }
                    maxLength={4000}
                    rows={5}
                    placeholder="e.g. Trace how a session refresh request is validated and persisted."
                    className="w-full resize-y rounded-lg border border-app-line bg-app-bg px-3 py-3 text-xs leading-relaxed text-app-text outline-none placeholder:text-app-dim focus-visible:border-app-accent"
                  />

                  <p className="mt-2 text-micro leading-relaxed text-app-muted">
                    Results are retrieved code excerpts, not
                    AI-generated conclusions.
                  </p>
                </div>

                <div className="mb-4">
                  <p className="mb-2 text-micro text-app-muted">
                    Suggested questions
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setQuestion(suggestion)}
                        className="btn px-2.5 py-1.5 text-micro"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    searching ||
                    !token ||
                    !selectedSource ||
                    !question.trim()
                  }
                  className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {searching ? (
                    <LoaderCircle
                      size={15}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Search size={15} aria-hidden="true" />
                  )}

                  {searching
                    ? "Searching..."
                    : "Search codebase"}
                </button>
              </form>

              {searchError && (
                <div
                  role="alert"
                  className="mt-5 flex items-start gap-2 rounded-lg border border-status-amber-line bg-status-amber-bg p-3 text-xs text-status-amber"
                >
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{searchError}</span>
                </div>
              )}

              {result && (
                <section
                  aria-label="Code search results"
                  className="mt-6 overflow-hidden rounded-lg border border-app-line"
                >
                  <div className="border-b border-app-line bg-app-panel2 px-4 py-3">
                    <p className="text-micro font-bold uppercase tracking-eyebrow text-app-dim">
                      SEARCH RESULTS · SOURCE EVIDENCE
                    </p>

                    <h3 className="mt-1 text-sm font-semibold">
                      {result.result_count === 0
                        ? "No matching code found"
                        : `${result.result_count} matching source ${
                            result.result_count === 1
                              ? "chunk"
                              : "chunks"
                          }`}
                    </h3>

                    <p className="mt-1 wrap-break-words text-2xs text-app-muted">
                      {result.query}
                    </p>
                  </div>

                  {result.results.length === 0 ? (
                    <div className="px-5 py-9 text-center">
                      <Search
                        size={24}
                        className="mx-auto text-app-muted"
                        aria-hidden="true"
                      />

                      <p className="mt-3 text-xs font-semibold">
                        No indexed evidence matched this query.
                      </p>

                      <p className="mt-2 text-2xs text-app-muted">
                        Try a more specific question or select
                        another indexed codebase.
                      </p>
                    </div>
                  ) : (
                    result.results.map((hit) => (
                      <CodeEvidence
                        key={`${hit.relative_path}:${hit.chunk_index}`}
                        hit={hit}
                      />
                    ))
                  )}
                </section>
              )}
            </div>
          </section>

          {/* Prototype retrieval details panel */}
          <aside className={panelClass}>
            <div className="border-b border-app-line px-5 py-4">
              <h2 className="text-[13px] font-bold">
                Retrieval details
              </h2>
            </div>

            <div className="px-5 py-2">
              <div className="divide-y divide-app-line-faint">
                <DetailRow
                  label="Evidence chunks"
                  value={
                    result
                      ? String(result.result_count)
                      : "—"
                  }
                />

                <DetailRow
                  label="Codebase"
                  value={selectedSourceName}
                />

                <DetailRow
                  label="Retrieval mode"
                  value="Semantic search"
                />

                <DetailRow
                  label="Index version"
                  value="Not exposed by API"
                />
              </div>

              <div className="mt-4 border-t border-app-line pt-5">
                <p className="mb-3 text-micro font-bold uppercase tracking-eyebrow text-app-dim">
                  Evidence hygiene
                </p>

                <div className="space-y-4 pb-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      size={17}
                      className="mt-0.5 shrink-0 text-status-green"
                      aria-hidden="true"
                    />

                    <div>
                      <h3 className="text-2xs font-semibold">
                        File path attached
                      </h3>
                      <p className="mt-1 text-2xs leading-relaxed text-app-muted">
                        Each result includes a source path
                        and line range.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <LockKeyhole
                      size={17}
                      className="mt-0.5 shrink-0 text-status-green"
                      aria-hidden="true"
                    />

                    <div>
                      <h3 className="text-2xs font-semibold">
                        Sensitive files excluded
                      </h3>
                      <p className="mt-1 text-2xs leading-relaxed text-app-muted">
                        Backend ingestion applies configured
                        file eligibility and exclusion rules.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <ShieldAlert
                      size={17}
                      className="mt-0.5 shrink-0 text-status-amber"
                      aria-hidden="true"
                    />

                    <div>
                      <h3 className="text-2xs font-semibold">
                        Repository is untrusted input
                      </h3>
                      <p className="mt-1 text-2xs leading-relaxed text-app-muted">
                        Retrieved code and comments are evidence,
                        not instructions to the agent.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4 flex items-start gap-2 rounded-lg border border-status-blue-line bg-status-blue-bg p-3">
                <Info
                  size={16}
                  className="mt-0.5 shrink-0 text-status-blue"
                  aria-hidden="true"
                />

                <p className="text-2xs leading-relaxed text-status-blue">
                  Source retrieval is available. Full
                  conversational answers with citations
                  will require a separate backend feature.
                </p>
              </div>

              <div className="flex items-center gap-2 border-t border-app-line pb-4 pt-4 text-micro text-app-dim">
                <Code2 size={14} aria-hidden="true" />
                Read-only code investigation
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CodeIntelligencePage;
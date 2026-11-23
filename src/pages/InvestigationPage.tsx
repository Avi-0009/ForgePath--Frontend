import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { HTTPError } from "ky";
import {
  AlertCircle,
  CheckCircle2,
  FileCode2,
  FileSearch,
  FolderGit2,
  Info,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";

import {
  GetProjectInvestigationFiles,
  InvestigateProjectFile,
  PreviewContextInvestigation,
  RunContextInvestigation,
  type ContextInvestigationPreview,
  type ContextInvestigationReport,
  type CodeReviewFileResponse,
  type ReviewFinding,
} from "../Api/Review";
import { listProjects, type ActivatedProject } from "../Api/ProjectActivation";
import { getTaskHistory } from "../Api/Tasks";
import { useAuthStore } from "../store/useAuthStore";
import { useActiveProjectId } from "../store/useActiveProjectId";
import ActiveProjectReview from "../components/reviews/ActiveProjectReview";
import ProjectConversationPanel from "../components/investigation/ProjectConversationPanel";

type Severity = ReviewFinding["severity"];
type SeverityFilter = "all" | Severity;

type SourceFile = {
  key: string;
  relativePath: string;
  name: string;
};

const panelClass =
  "min-w-0 overflow-hidden rounded-panel border border-app-line " +
  "bg-app-panel shadow-panel";

const severityOrder: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

const severityClasses: Record<Severity, string> = {
  critical:
    "border-status-red/40 bg-status-red/10 text-status-red",
  high:
    "border-status-red/40 bg-status-red/10 text-status-red",
  medium:
    "border-status-amber-line bg-status-amber-bg text-status-amber",
  low:
    "border-status-green-line bg-status-green-bg text-status-green",
  info:
    "border-status-blue-line bg-status-blue-bg text-status-blue",
};

const getErrorMessage = async (
  error: unknown,
  fallback: string,
): Promise<string> => {
  if (error instanceof HTTPError) {
    if (error.response.status === 401) {
      return "Your session could not be verified. Please sign in again.";
    }

    if (error.response.status === 403) {
      return "Access to this source file is not permitted.";
    }

    try {
      const payload: unknown = await error.response.clone().json();

      if (
        typeof payload === "object" &&
        payload !== null &&
        "detail" in payload &&
        typeof payload.detail === "string"
      ) {
        return payload.detail;
      }
    } catch {
      // Keep the fallback message.
    }

    if (error.response.status === 502) {
      return "The AI provider returned an invalid response or failed to complete this review. No unsupported findings were accepted.";
    }

    return `${fallback} (HTTP ${error.response.status}).`;
  }

  return error instanceof Error ? error.message : fallback;
};

const withAuthentication = async <T,>(
  token: string,
  action: (accessToken: string) => Promise<T>,
): Promise<T> => {
  const initialToken = useAuthStore.getState().token || token;

  try {
    return await action(initialToken);
  } catch (error) {
    if (
      !(error instanceof HTTPError) ||
      error.response.status !== 401
    ) {
      throw error;
    }

    const currentToken = useAuthStore.getState().token;

    if (currentToken && currentToken !== initialToken) {
      return action(currentToken);
    }

    // Reuse existing session refresh behavior.
    await getTaskHistory(initialToken, 0, 1);

    const refreshedToken = useAuthStore.getState().token;
    if (!refreshedToken) throw error;

    return action(refreshedToken);
  }
};

const InvestigationPage = () => {
  const token = useAuthStore((state) => state.token);
  const activeProjectId = useActiveProjectId();
  const [projects, setProjects] = useState<ActivatedProject[]>([]);
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [sourceRoot, setSourceRoot] = useState("");
  const [fileKey, setFileKey] = useState("");
  const [fileSearch, setFileSearch] = useState("");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [reviewMode, setReviewMode] = useState<
    "general" | "bug_hunt" | "security" | "quality"
  >("general");

  const [review, setReview] =
    useState<CodeReviewFileResponse | null>(null);
  const [loadingSources, setLoadingSources] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [question, setQuestion] = useState("");
  const [maxFiles, setMaxFiles] = useState(5);
  const [useSemanticIndex, setUseSemanticIndex] = useState(false);
  const [preview, setPreview] = useState<ContextInvestigationPreview | null>(null);
  const [questionReport, setQuestionReport] = useState<ContextInvestigationReport | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [investigatingQuestion, setInvestigatingQuestion] = useState(false);
  const investigationVersion = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      if (!token) {
        setLoadingSources(false);
        return;
      }

      try {
        const result = await withAuthentication(token, (accessToken) => listProjects(accessToken));
        if (cancelled) return;
        const ready = result.items.filter((item) => item.status === "ready");
        setProjects(ready);
        setSourceRoot((current) => ready.some((item) => item.id === current)
          ? current
          : (ready.find((item) => item.id === activeProjectId)?.id ?? ready[0]?.id ?? ""));
        setError(null);
      } catch (cause) {
        if (cancelled) return;
        setError(await getErrorMessage(cause, "Could not load projects"));
      } finally {
        if (!cancelled) setLoadingSources(false);
      }
    };

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [token, reloadKey, activeProjectId]);

  useEffect(() => {
    if (!token || !sourceRoot) return;
    let cancelled = false;
    const loadFiles = async () => {
      try {
        const result = await withAuthentication(token, (accessToken) =>
          GetProjectInvestigationFiles(accessToken, sourceRoot));
        if (cancelled) return;
        setSources(result.files.map((path) => ({
          key: `${sourceRoot}:${path}`,
          relativePath: path,
          name: path.split("/").at(-1) ?? path,
        })));
      } catch (cause) {
        if (cancelled) return;
        setSources([]);
        setError(await getErrorMessage(cause, "Could not load snapshot files"));
      }
    };
    void loadFiles();
    return () => { cancelled = true; };
  }, [token, sourceRoot, reloadKey]);

  const filteredFiles = useMemo(() => {
    const query = fileSearch.trim().toLowerCase();

    return sources
      .filter(
        (file) =>
          !query ||
          file.relativePath.toLowerCase().includes(query),
      );
  }, [sources, fileSearch]);

  const selectedFile =
    sources.find((file) => file.key === fileKey) ?? null;

  const findings = useMemo(
    () =>
      [...(review?.review.findings ?? [])]
        .filter(
          (finding) =>
            severity === "all" ||
            finding.severity === severity,
        )
        .sort(
          (a, b) =>
            severityOrder[a.severity] -
            severityOrder[b.severity],
        ),
    [review, severity],
  );

  const referencedFiles = review ? 1 : 0;

  const resetReview = () => {
    setReview(null);
    setSeverity("all");
    setError(null);
  };

  const invalidateContext = () => {
    investigationVersion.current += 1;
    setPreview(null);
    setQuestionReport(null);
  };

  const handleSourceChange = (root: string) => {
    setSourceRoot(root);
    setSources([]);
    setFileKey("");
    setFileSearch("");
    resetReview();
    invalidateContext();
  };

  const handleFileChange = (key: string) => {
    setFileKey(key);
    resetReview();
  };

  const refreshSources = () => {
    setLoadingSources(true);
    setError(null);
    setSources([]);
    setFileKey("");
    resetReview();
    invalidateContext();
    setReloadKey((value) => value + 1);
  };

  const previewQuestion = async () => {
    if (!token || !sourceRoot || question.trim().length < 3) return;
    const version = ++investigationVersion.current;
    setPreviewing(true);
    setError(null);
    setPreview(null);
    setQuestionReport(null);
    try {
      const result = await withAuthentication(token, (accessToken) =>
        PreviewContextInvestigation(accessToken, sourceRoot, question.trim(), maxFiles));
      if (version === investigationVersion.current) setPreview(result);
    } catch (cause) {
      const message = await getErrorMessage(cause, "Could not select relevant files");
      if (version === investigationVersion.current) setError(message);
    } finally {
      setPreviewing(false);
    }
  };

  const investigateQuestion = async () => {
    if (!token || !sourceRoot || !preview || preview.project_id !== sourceRoot || investigatingQuestion) return;
    const version = investigationVersion.current;
    setInvestigatingQuestion(true);
    setError(null);
    try {
      const result = await withAuthentication(token, (accessToken) =>
        RunContextInvestigation(
          accessToken, sourceRoot, question.trim(), maxFiles,
          preview.snapshot_id, useSemanticIndex,
        ));
      if (version === investigationVersion.current) setQuestionReport(result);
    } catch (cause) {
      const message = await getErrorMessage(cause, "Investigation failed");
      if (version === investigationVersion.current) setError(message);
    } finally {
      setInvestigatingQuestion(false);
    }
  };

  const startReview = async () => {
    if (!token || !sourceRoot || !selectedFile || reviewing) return;

    setReviewing(true);
    setError(null);
    setReview(null);

    try {
      const result = await withAuthentication(token, (accessToken) =>
        InvestigateProjectFile(accessToken, sourceRoot, {
          relative_path: selectedFile.relativePath,
          review_mode: reviewMode,
        }),
      );
      setReview(result);
    } catch (cause) {
      setError(await getErrorMessage(cause, "Review failed"));
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="min-w-0 bg-app-bg px-3 py-5 text-app-text sm:px-6 sm:py-7 lg:px-9">
      <div className="mx-auto max-w-app space-y-5">
        {/* Prototype heading */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <p className="mb-1.5 text-micro font-bold uppercase tracking-eyebrow text-app-dim">
              INVESTIGATION / CODE REVIEW
            </p>
            <h1 className="font-manrope text-[28px] font-extrabold tracking-tight">
              Investigation report
            </h1>
            <p className="mt-1 max-w-170 text-[13px] leading-relaxed text-app-muted">
              Findings should be specific, traceable, and supported
              by source evidence—not just plausible-sounding model output.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/runs" className="btn">
              View run
            </Link>
          </div>
        </header>

        <section className={panelClass}>
          <div className="border-b border-app-line px-4 py-4 sm:px-5">
            <h2 className="text-base font-bold">Context-aware investigation</h2>
            <p className="mt-1 text-xs text-app-muted">
              Ask a question about the whole project. ForgePath traces relevant source files and their import relationships before asking AI. Preview is free; running requires confirmation.
            </p>
          </div>
          <div className="space-y-4 p-4 sm:p-5">
            <label className="block text-xs font-semibold">
              Project
              <select
                value={sourceRoot}
                onChange={(event) => handleSourceChange(event.target.value)}
                disabled={investigatingQuestion || previewing || reviewing}
                className="mt-2 w-full rounded-lg border border-app-line bg-app-panel2 p-2.5 text-xs text-app-text"
              >
                <option value="">Choose a saved project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold">
              What should ForgePath investigate?
              <textarea
                value={question}
                onChange={(event) => { setQuestion(event.target.value); invalidateContext(); }}
                placeholder="Example: Why are expired access tokens causing failures in task creation? Check the API route, auth handling and relevant tests."
                maxLength={2000}
                rows={3}
                disabled={investigatingQuestion}
                className="mt-2 w-full rounded-lg border border-app-line bg-app-panel2 p-3 text-xs text-app-text"
              />
            </label>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-semibold">
              Files to inspect (max 10)
                <select
                  value={maxFiles}
                  onChange={(event) => { setMaxFiles(Number(event.target.value)); invalidateContext(); }}
                  disabled={investigatingQuestion}
                  className="mt-2 block rounded-lg border border-app-line bg-app-panel2 p-2.5 text-xs"
                >
                  {[3, 5, 6, 8, 10].map((count) => <option key={count} value={count}>{count}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-app-line bg-app-panel2 px-3 py-2.5 text-xs text-app-text">
                <input
                  type="checkbox"
                  checked={useSemanticIndex}
                  onChange={(event) => { setUseSemanticIndex(event.target.checked); invalidateContext(); }}
                  disabled={investigatingQuestion || previewing}
                  className="accent-app-accent"
                />
                Include semantic vector matches (+1 embedding query)
              </label>
              <button
                type="button"
                className="btn"
                onClick={() => void previewQuestion()}
                disabled={!sourceRoot || question.trim().length < 3 || previewing || investigatingQuestion}
              >
                {previewing ? "Finding relevant files..." : "Find relevant files (free)"}
              </button>
            </div>
            {preview && preview.project_id === sourceRoot && (
              <div className="rounded-lg border border-app-line bg-app-panel2 p-4">
                <p className="text-xs font-bold">
                  Selected {preview.selected_files.length} of {preview.total_files} snapshot files
                </p>
                <p className="mt-1 text-2xs text-app-muted">
                  {preview.candidate_files} relevant candidates · {preview.graph_edges} import links in project · ~{preview.estimated_tokens.toLocaleString()} source tokens · {preview.ai_calls} AI calls so far.
                </p>
                <p className="mt-2 text-2xs text-app-muted">
                  {useSemanticIndex
                    ? "Semantic retrieval will run after you confirm. It can change the final file selection; the current preview uses local relevance and source links."
                    : "Selection uses local relevance, imports, and callers. Candidates are not proof of a problem."}
                </p>
                <ul className="mt-3 space-y-2 text-2xs text-app-muted">
                  {preview.selected_files.map((item) => (
                    <li key={item.path} className="rounded-md border border-app-line/60 bg-app-bg p-2.5">
                      <p className="wrap-break-words font-mono text-app-text">{item.path} · L{item.start_line}–{item.end_line}</p>
                      <p className="mt-1">{item.reason} · {item.excerpt_chars} excerpt characters</p>
                    </li>
                  ))}
                </ul>
                {preview.selected_files.length === 0 && (
                  <p className="mt-2 text-xs text-app-muted">
                    No relevant files were found. Try using a function name, error message, API route, or subsystem name.
                  </p>
                )}
                <button
                  type="button"
                  className="btn btn-primary mt-4"
                  onClick={() => void investigateQuestion()}
                  disabled={investigatingQuestion || preview.selected_files.length === 0}
                >
                  {investigatingQuestion
                    ? "Investigating..."
                    : `Run context investigation (${useSemanticIndex ? "1 completion + 1 embedding query" : "1 AI call"})`}
                </button>
              </div>
            )}
            {questionReport && questionReport.project_id === sourceRoot && (
              <div className="space-y-3 rounded-lg border border-app-line bg-app-panel2 p-4">
                <h3 className="text-sm font-bold">Investigation results</h3>
                <p className="text-2xs text-app-muted">
                  AI examined verified excerpts from {questionReport.selected_files.length} of {questionReport.total_files} project files.
                  {` ${questionReport.completion_calls} completion call${questionReport.completion_calls === 1 ? "" : "s"}`}
                  {questionReport.embedding_query_calls > 0 && " · 1 embedding query"}.
                  Findings are unverified; unselected files were not read by the AI.
                </p>
                <p className="whitespace-pre-wrap text-xs text-app-text">{questionReport.summary}</p>
                {questionReport.context_files.length > 0 && (
                  <details className="rounded-md border border-app-line p-3 text-2xs">
                    <summary className="cursor-pointer font-semibold">Files actually read by AI ({questionReport.context_files.length})</summary>
                    <ul className="mt-2 space-y-1 font-mono text-app-muted">
                      {questionReport.context_files.map((item) => (
                        <li key={item.path} className="wrap-break-words">{item.path} · L{item.start_line}–{item.end_line} · {item.reason}</li>
                      ))}
                    </ul>
                  </details>
                )}
                {questionReport.evidence_links.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold">Verified source quotes ({questionReport.evidence_links.length})</h4>
                    {questionReport.evidence_links.map((item, index) => (
                      <article key={`${item.path}-${index}`} className="rounded-lg border border-status-blue-line bg-status-blue-bg/20 p-3">
                        <p className="wrap-break-words font-mono text-2xs text-status-blue">{item.path} · L{item.start_line}–{item.end_line}</p>
                        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap wrap-break-words text-2xs">{item.quote}</pre>
                        <p className="mt-2 text-xs text-app-muted">{item.explanation}</p>
                        <p className="mt-1 text-micro text-status-blue">Quote matched the saved snapshot excerpt; interpretation remains unverified.</p>
                      </article>
                    ))}
                  </div>
                )}
                {questionReport.findings.map((finding, index) => (
                  <article key={`${finding.path}-${index}`} className="rounded-lg border border-app-line p-3">
                    <p className="text-xs font-semibold">{finding.title} · {finding.severity}</p>
                    <p className="mt-1 break-all font-mono text-2xs text-status-blue">{finding.path}</p>
                    <p className="mt-2 text-xs text-app-muted">{finding.explanation}</p>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-app-bg p-2 text-2xs">{finding.evidence}</pre>
                  </article>
                ))}
                {questionReport.findings.length === 0 && (
                  <p className="rounded-md border border-app-line p-3 text-xs text-app-muted">No source-supported issues were proposed. This does not mean the codebase is free of issues.</p>
                )}
                {questionReport.gaps.length > 0 && (
                  <div className="rounded-md border border-status-amber-line bg-status-amber-bg p-3">
                    <p className="text-xs font-bold text-status-amber">What remains unknown</p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-app-muted">
                      {questionReport.gaps.map((gap, index) => <li key={index}>{gap}</li>)}
                    </ul>
                  </div>
                )}
                {questionReport.follow_up_questions.length > 0 && (
                  <div className="rounded-md border border-app-line p-3">
                    <p className="text-xs font-bold">Suggested follow-up investigations</p>
                    <ul className="mt-2 space-y-2 text-xs text-app-muted">
                      {questionReport.follow_up_questions.map((next, index) => (
                        <li key={index} className="flex flex-wrap items-center justify-between gap-2">
                          <span className="min-w-0 flex-1">{next}</span>
                          <button type="button" className="btn" onClick={() => { setQuestion(next); invalidateContext(); }}>Use question</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <ProjectConversationPanel key={sourceRoot} token={token ?? ""} projectId={sourceRoot} />

        <details className="rounded-panel border border-app-line bg-app-panel p-4">
          <summary className="cursor-pointer text-xs font-semibold">Initial automated review (limited first-pass report)</summary>
          <div className="mt-4"><ActiveProjectReview detailed /></div>
        </details>

        {/* Evidence-first callout */}
        <div className="flex items-start gap-3 rounded-callout border border-status-blue-line bg-status-blue-bg p-3.5">
          <Info
            size={17}
            className="mt-0.5 shrink-0 text-status-blue"
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed text-status-blue">
            <strong>Evidence first.</strong> Findings are generated
            by AI. Validate paths, line numbers, and actual behavior
            before accepting any suggested changes.
          </p>
        </div>

        {/* Source selection */}
        <section className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-line px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-[13px] font-bold">
                Select source file
              </h2>
              <p className="mt-1 text-2xs text-app-muted">
                Review a file from a saved, private project snapshot
              </p>
            </div>

            <button
              type="button"
              onClick={refreshSources}
              disabled={!token || loadingSources}
              className="btn"
            >
              <RefreshCw
                size={14}
                className={loadingSources ? "animate-spin" : ""}
                aria-hidden="true"
              />
              Refresh
            </button>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
            <label className="min-w-0">
              <span className="mb-2 block text-2xs font-semibold">
                Codebase
              </span>
              <select
                value={sourceRoot}
                onChange={(event) =>
                  handleSourceChange(event.target.value)
                }
                disabled={loadingSources || reviewing}
                className="w-full rounded-lg border border-app-line bg-app-panel2 p-2.5 text-xs text-app-text"
              >
                <option value="">
                  {loadingSources
                    ? "Loading codebases..."
                    : "Choose a codebase"}
                </option>

                {projects.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0">
              <span className="mb-2 block text-2xs font-semibold">
                Review mode
              </span>
              <select
                value={reviewMode}
                onChange={(event) => {
                  setReviewMode(
                    event.target.value as typeof reviewMode,
                  );
                  resetReview();
                }}
                disabled={reviewing}
                className="w-full rounded-lg border border-app-line bg-app-panel2 p-2.5 text-xs text-app-text"
              >
                <option value="general">General</option>
                <option value="bug_hunt">Bug investigation</option>
                <option value="security">Security</option>
                <option value="quality">Code quality</option>
              </select>
            </label>

            <div className="min-w-0 sm:col-span-2">
              <label
                htmlFor="investigation-file-search"
                className="mb-2 block text-2xs font-semibold"
              >
                Source file
              </label>

              <div className="mb-2 flex items-center gap-2 rounded-lg border border-app-line bg-app-panel2 px-3">
                <Search
                  size={15}
                  className="text-app-muted"
                  aria-hidden="true"
                />
                <input
                  id="investigation-file-search"
                  value={fileSearch}
                  onChange={(event) =>
                    setFileSearch(event.target.value)
                  }
                  placeholder="Filter source files..."
                  disabled={!sourceRoot || reviewing}
                  className="min-h-9 min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-app-dim"
                />
              </div>

              <select
                value={fileKey}
                onChange={(event) =>
                  handleFileChange(event.target.value)
                }
                disabled={!sourceRoot || reviewing}
                aria-label="Choose file to review"
                className="w-full rounded-lg border border-app-line bg-app-panel2 p-2.5 font-mono text-xs text-app-text"
              >
                <option value="">
                  {sourceRoot
                    ? "Choose a file"
                    : "Choose a codebase first"}
                </option>

                {filteredFiles.map((file) => (
                  <option key={file.key} value={file.key}>
                    {file.relativePath}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
              <p className="text-micro text-app-dim">
                {sourceRoot
                  ? `${filteredFiles.length} matching files`
                  : "No source selected"}
              </p>

              <button
                type="button"
                onClick={startReview}
                disabled={!token || !selectedFile || reviewing}
                className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reviewing ? (
                  <LoaderCircle
                    size={15}
                    className="animate-spin"
                  />
                ) : (
                  <FileSearch size={15} />
                )}
                {reviewing ? "Investigating..." : "Run investigation"}
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-status-red/40 bg-status-red/10 p-4 text-xs text-status-red"
          >
            <AlertCircle size={16} className="shrink-0" />
            <p className="wrap-break-words">{error}</p>
          </div>
        )}

        {/* Prototype's two-column report */}
        <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-home">
          <section className={panelClass}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-line px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-[13px] font-bold">
                  Findings{" "}
                  <span className="font-normal text-app-muted">
                    ({review?.review.findings.length ?? 0})
                  </span>
                </h2>
                <p className="mt-1 text-2xs text-app-muted">
                  Sorted by severity
                </p>
              </div>

              <select
                value={severity}
                onChange={(event) =>
                  setSeverity(event.target.value as SeverityFilter)
                }
                aria-label="Filter finding severity"
                className="rounded-lg border border-app-line bg-app-panel2 px-3 py-2 text-xs text-app-text"
              >
                <option value="all">All severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="info">Info</option>
              </select>
            </div>

            {!review ? (
              <div className="px-5 py-14 text-center">
                <FileSearch
                  size={28}
                  className="mx-auto text-app-accent"
                />
                <h3 className="mt-3 text-sm font-semibold">
                  No investigation report yet
                </h3>
                <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-app-muted">
                  Select an allowed codebase and file, then run a
                  review to inspect evidence-backed findings.
                </p>
              </div>
            ) : (
              <>
                <div className="border-b border-app-line p-4 sm:p-5">
                  <p className="text-2xs font-semibold text-app-text">
                    Overall assessment
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-app-muted">
                    {review.review.summary}
                  </p>
                </div>

                {findings.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <CheckCircle2
                      size={26}
                      className="mx-auto text-status-green"
                    />
                    <p className="mt-3 text-sm font-semibold">
                      {review.review.findings.length === 0
                        ? "No findings reported"
                        : "No findings match this filter"}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-app-line-faint">
                    {findings.map((finding, index) => (
                      <article
                        key={`${finding.title}-${index}`}
                        className="min-w-0 p-4 sm:p-5"
                      >
                        <div className="flex flex-wrap items-start gap-2">
                          <span
                            className={`rounded-md border px-2 py-1 text-micro font-bold uppercase ${severityClasses[finding.severity]}`}
                          >
                            {finding.severity}
                          </span>

                          <h3 className="min-w-0 flex-1 text-xs font-semibold leading-relaxed text-app-text">
                            {finding.title}
                          </h3>
                        </div>

                        <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-app-muted">
                          {finding.explanation}
                        </p>

                        <p className="mt-3 break-all font-mono text-micro text-status-blue">
                          {review.relative_path}
                          {finding.line_start !== null
                            ? ` · lines ${finding.line_start}${
                                finding.line_end &&
                                finding.line_end !== finding.line_start
                                  ? `–${finding.line_end}`
                                  : ""
                              }`
                            : " · line not specified"}
                        </p>

                        <div className="mt-3 overflow-hidden rounded-lg border border-app-line bg-app-bg">
                          <div className="border-b border-app-line bg-app-panel2 px-3 py-2 font-mono text-micro text-app-muted">
                            Finding evidence · model-provided
                          </div>
                          <pre className="max-h-60 overflow-auto whitespace-pre-wrap wrap-break-words p-3 font-mono text-2xs leading-relaxed text-app-mono-text">
                            {finding.evidence}
                          </pre>
                        </div>

                        {finding.suggested_fix && (
                          <div className="mt-3 rounded-lg border border-app-accent/20 bg-app-accent/5 p-3">
                            <p className="text-micro font-bold uppercase text-app-accent">
                              Suggested fix
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-app-muted">
                              {finding.suggested_fix}
                            </p>

                            <p className="mt-3 text-2xs text-app-muted">
                              Read-only snapshot: patch generation for this source is not enabled.
                            </p>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          <aside className={panelClass}>
            <div className="border-b border-app-line px-5 py-4">
              <h2 className="text-[13px] font-bold">
                Evidence summary
              </h2>
            </div>

            <div className="p-5">
              <p className="text-2xs text-app-muted">
                Files referenced in this file review
              </p>
              <p className="mt-1 font-manrope text-2xl font-extrabold">
                {referencedFiles}
              </p>

              <div className="mt-4 space-y-4 border-t border-app-line pt-4">
                <div className="flex items-start gap-3">
                  <FileCode2
                    size={17}
                    className="mt-0.5 shrink-0 text-status-blue"
                  />
                  <div className="min-w-0">
                    <strong className="text-xs">
                      Reviewed source
                    </strong>
                    <p className="mt-1 break-all font-mono text-2xs text-app-muted">
                      {review?.relative_path ??
                        "No source reviewed yet"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Search
                    size={17}
                    className="mt-0.5 shrink-0 text-status-blue"
                  />
                  <div className="min-w-0">
                    <strong className="text-xs">
                      Review findings
                    </strong>
                    <p className="mt-1 text-2xs text-app-muted">
                      {review
                        ? `${review.review.findings.length} reported issues or improvements`
                        : "Awaiting investigation"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FolderGit2
                    size={17}
                    className="mt-0.5 shrink-0 text-status-blue"
                  />
                  <div className="min-w-0">
                    <strong className="text-xs">
                      Source metadata
                    </strong>
                    <p className="mt-1 text-2xs text-app-muted">
                      {review
                        ? `${review.line_count} lines · ${
                            review.language ?? "Unknown language"
                          }`
                        : "No report metadata"}
                    </p>
                  </div>
                </div>
              </div>

              {review?.review.suggested_tests.length ? (
                <div className="mt-5 border-t border-app-line pt-4">
                  <p className="mb-2 text-xs font-semibold">
                    Suggested tests
                  </p>
                  <ul className="space-y-2 text-2xs text-app-muted">
                    {review.review.suggested_tests.map(
                      (test, index) => (
                        <li key={index} className="wrap-break-words">
                          • {test}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ) : null}

              <div className="mt-5 flex items-start gap-2 rounded-lg border border-status-amber-line bg-status-amber-bg p-3">
                <ShieldAlert
                  size={17}
                  className="shrink-0 text-status-amber"
                />
                <p className="text-2xs leading-relaxed text-status-amber">
                  <strong>Not yet verified.</strong> This report is
                  not proof of exploitability. Confirm the source
                  and behavior before approving a patch.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default InvestigationPage;
import { useEffect, useMemo, useState } from "react";
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
  type CodeReviewFileResponse,
  type ReviewFinding,
} from "../Api/Review";
import { listProjects, type ActivatedProject } from "../Api/ProjectActivation";
import { getTaskHistory } from "../Api/Tasks";
import { useAuthStore } from "../store/useAuthStore";
import { useActiveProjectId } from "../store/useActiveProjectId";
import ActiveProjectReview from "../components/reviews/ActiveProjectReview";

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

    if (error.response.status === 502) {
      return "The AI provider could not complete this review.";
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

  const handleSourceChange = (root: string) => {
    setSourceRoot(root);
    setSources([]);
    setFileKey("");
    setFileSearch("");
    resetReview();
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
    setReloadKey((value) => value + 1);
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

        <ActiveProjectReview detailed />

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
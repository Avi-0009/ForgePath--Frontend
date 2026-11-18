import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  FileSearch,
  LoaderCircle,
} from "lucide-react";
import { HTTPError } from "ky";

import {
  getLatestProjectReview,
  getProject,
  type ActivatedProject,
  type ProjectReview,
  type ProjectFinding,
} from "../../Api/ProjectActivation";

import { useAuthStore } from "../../store/useAuthStore";
import { useActiveProjectId } from "../../store/useActiveProjectId";

type Props = {
  detailed?: boolean;
};

const ActiveProjectReview = ({ detailed = false }: Props) => {
  const token = useAuthStore((state) => state.token);
  const projectId = useActiveProjectId();

  const [project, setProject] =
    useState<ActivatedProject | null>(null);

  const [review, setReview] =
    useState<ProjectReview | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"all" | ProjectFinding["severity"]>("all");

  useEffect(() => {
    setProject(null);

    if (!token || !projectId) return;

    let cancelled = false;

    void getProject(token, projectId)
      .then((result) => {
        if (!cancelled) setProject(result);
      })
      .catch(() => {
        if (!cancelled) setProject(null);
      });

    return () => {
      cancelled = true;
    };
  }, [token, projectId]);

  useEffect(() => {
    setReview(null);
    setError("");

    if (!token || !projectId) return;

    let cancelled = false;
    setLoading(true);

    const refresh = async () => {
      try {
        const result = await getLatestProjectReview(
          token,
          projectId,
        );

        if (!cancelled) {
          setReview(result);
          setError("");
        }
      } catch (cause) {
        if (!cancelled) {
          setReview(null);

          setError(
            cause instanceof HTTPError &&
              cause.response.status === 404
              ? "No initial review has been started for this project."
              : "Could not load this project's review.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void refresh();

    const interval = window.setInterval(
      () => void refresh(),
      5000,
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [token, projectId]);

  if (!projectId) {
    return (
      <section className="rounded-panel border border-app-line bg-app-panel p-5">
        <h2 className="text-sm font-bold text-app-text">
          Codebase review
        </h2>

        <p className="mt-2 text-xs text-app-muted">
          Select and confirm a project to begin.
        </p>

        <Link
          to="/repositories"
          className="btn mt-3 inline-flex text-xs"
        >
          Select project
        </Link>
      </section>
    );
  }

  const findings = review?.findings ?? [];

  const visibleFindings =
    severityFilter === "all"
      ? findings
      : findings.filter(
          (finding) => finding.severity === severityFilter,
        );

  return (
    <section className="min-w-0 overflow-hidden rounded-panel border border-app-line bg-app-panel p-4 shadow-panel sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileSearch
              size={16}
              className="text-app-accent"
              aria-hidden="true"
            />

            <h2 className="text-sm font-bold text-app-text">
              Initial codebase review
            </h2>
          </div>

          <p className="mt-1 wrap-break-words text-xs text-app-muted">
            {project?.name ?? "Active project"}

            {review
              ? ` · ${review.files_scanned} inventoried · ${review.files_reviewed} AI-inspected · ${review.ai_calls}/${review.max_ai_calls} model calls`
              : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {loading && !review && (
            <LoaderCircle
              size={15}
              className="animate-spin text-app-muted"
            />
          )}

          {review && (
            <span className="rounded-md border border-app-line px-2 py-1 text-xs capitalize text-app-text">
              {review.status}
            </span>
          )}

          <Link
            to={detailed ? "/repositories" : "/investigation"}
            className="btn text-xs"
          >
            {detailed ? "Repositories" : "Investigate"}
          </Link>
        </div>
      </div>

      {error && (
        <p
          role="status"
          className="mt-3 text-xs text-app-muted"
        >
          {error}
        </p>
      )}

      {review?.error_message && (
        <p
          role="alert"
          className="mt-3 text-xs text-status-amber"
        >
          {review.error_message}
        </p>
      )}

      {review && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-app-line bg-app-panel2 px-3 py-2 text-xs">
          <span className="text-app-text">
            {findings.length} evidence-quoted AI suggestion
            {findings.length === 1 ? "" : "s"}
          </span>

          <span className="text-app-muted">
            Unverified — no fixes applied
          </span>
        </div>
      )}

      {detailed && findings.length > 0 && (
        <div
          className="mt-4 space-y-3"
          aria-label="Structured review findings"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-app-text">
              Suggested findings
            </h3>

            <label className="text-2xs text-app-muted">
              Severity

              <select
                value={severityFilter}
                onChange={(event) =>
                  setSeverityFilter(
                    event.target.value as typeof severityFilter,
                  )
                }
                className="ml-2 rounded-md border border-app-line bg-app-bg px-2 py-1 text-xs text-app-text"
              >
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="info">Info</option>
              </select>
            </label>
          </div>

          {visibleFindings.map((finding, index) => (
            <article
              key={`${finding.path}:${index}`}
              className="min-w-0 rounded-lg border border-app-line bg-app-bg p-3 sm:p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-status-amber-line bg-status-amber-bg px-2 py-1 text-micro font-semibold text-status-amber">
                  {finding.severity.toUpperCase()} · suggested
                </span>

                <span className="text-micro text-app-muted">
                  Unverified
                </span>
              </div>

              <h4 className="mt-2 wrap-break-words text-sm font-semibold text-app-text">
                {finding.title}
              </h4>

              <p className="mt-1 wrap-break-words font-mono text-2xs text-app-accent">
                {finding.path}
              </p>

              <p className="mt-3 whitespace-pre-wrap wrap-break-word text-xs leading-relaxed text-app-text">
                {finding.explanation}
              </p>

              <p className="mt-3 text-2xs font-semibold text-app-muted">
                Quoted source evidence
              </p>

              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap wrap-break-word rounded-md border border-app-line bg-app-panel2 p-2 font-mono text-2xs text-app-text">
                {finding.evidence}
              </pre>

              <p className="mt-2 text-2xs text-app-muted">
                Verify this suggestion against the source before
                creating a task or patch.
              </p>
            </article>
          ))}

          {visibleFindings.length === 0 && (
            <p className="text-xs text-app-muted">
              No suggestions match this severity.
            </p>
          )}
        </div>
      )}

      {review?.result_text && (
        <div className="mt-4 min-w-0">
          <div className="mb-2 flex items-start gap-2 text-2xs text-status-amber">
            <AlertTriangle
              size={14}
              className="shrink-0"
              aria-hidden="true"
            />

            AI-generated suggestions. Confirm findings
            against source before taking action.
          </div>

          {detailed && findings.length > 0 ? (
            <details className="rounded-lg border border-app-line bg-app-bg">
              <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-app-text">
                View full AI review report
              </summary>

              <pre className="max-h-160 overflow-auto whitespace-pre-wrap wrap-break-word border-t border-app-line p-4 font-mono text-xs leading-relaxed text-app-text">
                {review.result_text}
              </pre>
            </details>
          ) : detailed ? (
            <pre className="max-h-160 overflow-auto whitespace-pre-wrap wrap-break-word rounded-lg border border-app-line bg-app-bg p-4 font-mono text-xs leading-relaxed text-app-text">
              {review.result_text}
            </pre>
          ) : (
            <p className="line-clamp-4 whitespace-pre-wrap wrap-break-word text-xs leading-relaxed text-app-muted">
              {review.result_text}
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export default ActiveProjectReview;
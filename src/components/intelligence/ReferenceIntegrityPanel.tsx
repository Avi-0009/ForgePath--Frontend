import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, GitBranch, LoaderCircle, SearchCheck } from "lucide-react";

import {
  getCodeIntelligenceError,
  getProjectReferenceReport,
  type ProjectReferenceReport,
} from "../../Api/CodeIntelligence";

type Props = {
  token: string | null;
  projectId: string;
  projectName: string;
};

const ReferenceIntegrityPanel = ({ token, projectId, projectName }: Props) => {
  const [report, setReport] = useState<ProjectReferenceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  useEffect(() => () => { requestVersion.current += 1; }, []);

  const checkReferences = async () => {
    if (!token || !projectId || loading) return;
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const result = await getProjectReferenceReport(token, projectId);
      if (version === requestVersion.current) setReport(result);
    } catch (cause) {
      if (version === requestVersion.current) {
        setError(await getCodeIntelligenceError(cause));
      }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-panel border border-app-line bg-app-panel shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-line px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-app-icon-bg2 text-app-accent">
            <GitBranch size={17} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[13px] font-bold">Reference integrity</h2>
            <p className="mt-1 text-2xs leading-relaxed text-app-muted">
              {projectName} · Check imports and SVG paths in the saved snapshot. Read-only, no AI calls.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => void checkReferences()}
          disabled={!token || !projectId || loading}
        >
          {loading ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <SearchCheck size={15} aria-hidden="true" />}
          {loading ? "Checking references..." : report ? "Check again" : "Check references"}
        </button>
      </div>

      {error && (
        <p role="alert" className="m-4 rounded-lg border border-status-amber-line bg-status-amber-bg p-3 text-xs text-status-amber">
          {error}
        </p>
      )}

      {report && (
        <div className="p-4 sm:p-5" role="status" aria-live="polite">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Files inventoried", report.files_in_snapshot],
              ["References checked", report.references_checked],
              ["Resolved", report.references_resolved],
              ["Potential issues", report.references_unresolved],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-app-line bg-app-panel2 p-3">
                <p className="text-micro text-app-muted">{label}</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-app-text">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-2xs text-app-muted">
            {report.svg_paths_in_manifest} SVG paths in snapshot · version {report.snapshot_id.slice(0, 8)}
          </p>

          {report.references_unresolved === 0 ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-status-blue-line bg-status-blue-bg p-3 text-xs text-status-blue">
              <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" />
              No unresolved candidates among the supported static references. This is not proof that every import works.
            </div>
          ) : (
            <div className="mt-5">
              <h3 className="flex items-center gap-2 text-xs font-bold text-app-text">
                <AlertTriangle size={15} className="text-status-amber" aria-hidden="true" />
                Potential missing-file references
              </h3>
              <p className="mt-1 text-2xs text-app-muted">
                Review these candidates before changing code; custom loaders or build settings may resolve them.
              </p>
              <ul className="mt-3 divide-y divide-app-line-faint overflow-hidden rounded-lg border border-app-line">
                {report.missing_candidates.map((issue, index) => (
                  <li key={`${issue.source_path}:${issue.line}:${index}`} className="p-3 sm:p-4">
                    <p className="break-all font-mono text-2xs font-semibold text-app-text">
                      {issue.source_path}:{issue.line}
                    </p>
                    <p className="mt-1 break-all font-mono text-2xs text-status-amber">
                      {issue.specifier}
                    </p>
                    <details className="mt-2 text-2xs text-app-muted">
                      <summary className="cursor-pointer">Possible target paths</summary>
                      <ul className="mt-2 space-y-1 pl-4 font-mono">
                        {issue.candidate_paths.map((candidate) => (
                          <li className="break-all" key={candidate}>{candidate}</li>
                        ))}
                      </ul>
                    </details>
                  </li>
                ))}
              </ul>
              {report.results_truncated && (
                <p className="mt-3 text-2xs text-status-amber">
                  Only the first {report.missing_candidates.length} candidates are shown; the total count is above.
                </p>
              )}
            </div>
          )}
          <p className="mt-4 border-t border-app-line pt-3 text-micro leading-relaxed text-app-dim">
            {report.limitations}
          </p>
        </div>
      )}
    </section>
  );
};

export default ReferenceIntegrityPanel;
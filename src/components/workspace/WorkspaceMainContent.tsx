import { Loader2, Play, FolderKanban, ArrowLeft, Check, X, Sparkles } from "lucide-react";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import type { ReviewFinding } from "../../Api/Review";

const severityStyles: Record<ReviewFinding["severity"], string> = {
  critical: "border-red-500/40 bg-red-500/10 text-red-400",
  high: "border-orange-500/40 bg-orange-500/10 text-orange-400",
  medium: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
  low: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  info: "border-app-line bg-app-panel2 text-app-muted",
};

interface WorkspaceMainContentProps {
  isReviewing: boolean;
  isGeneratingPatch: boolean;
  isApplying: boolean;
  onLaunchReview: () => void;
  onGeneratePatch: (finding: ReviewFinding) => void;
  onApprovePatch: () => void;
  onDeclinePatch: () => void;
}

const WorkspaceMainContent = ({
  isReviewing,
  isGeneratingPatch,
  isApplying,
  onLaunchReview,
  onGeneratePatch,
  onApprovePatch,
  onDeclinePatch,
}: WorkspaceMainContentProps) => {
  const {
    selectedFile,
    reviewResult,
    patchResult,
    selectedFinding,
    setSelectedFile,
    clearReviewState,
  } = useWorkspaceStore();

  const fileName = selectedFile?.name ?? null;

  return (
    <main
      className={`${
        !selectedFile ? "hidden md:flex" : "flex"
      } flex-col flex-1 min-w-0 h-full overflow-hidden bg-[#1c2124]`}
    >
      {selectedFile && (
        <div className="flex shrink-0 border-b border-app-line p-3 md:hidden">
          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            className="flex items-center gap-2 text-sm font-medium text-app-muted transition-colors hover:text-app-text"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to files
          </button>
        </div>
      )}

      {patchResult ? (
        <section className="flex flex-col flex-1 h-full overflow-hidden min-h-0">
          <div className="flex shrink-0 flex-col gap-3 border-b border-app-line bg-[#141719] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-app-accent" />
                <h2 className="text-sm font-bold uppercase tracking-wider">Proposed Patch</h2>
              </div>
              <p className="mt-1 break-all text-xs text-app-muted">{patchResult.relative_path}</p>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={onDeclinePatch}
                disabled={isApplying}
                className="flex items-center justify-center gap-2 rounded-lg border border-status-red px-3 py-2 text-sm font-semibold text-status-red transition-colors hover:bg-status-red/10 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Decline
              </button>

              <button
                type="button"
                onClick={onApprovePatch}
                disabled={isApplying}
                className="btn btn-primary flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {isApplying ? "Applying..." : "Approve & Apply"}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0">
            <div className="mb-5 rounded-xl border border-app-line bg-[#141719] p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-app-dim">Patch summary</p>
              <p className="text-sm leading-6 text-app-text">{patchResult.summary}</p>
              {selectedFinding && (
                <div className="mt-4 border-t border-app-line pt-3">
                  <p className="text-xs font-semibold text-app-muted">Fixing finding</p>
                  <p className="mt-1 text-sm font-medium text-app-text">{selectedFinding.title}</p>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-app-line bg-[#111416]">
              <div className="flex items-center justify-between border-b border-app-line px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-app-dim">Unified diff</p>
                <span className="text-xs text-app-muted">
                  {patchResult.original_line_count} → {patchResult.proposed_line_count} lines
                </span>
              </div>

              <div className="overflow-x-auto p-3 sm:p-4">
                <div className="min-w-max font-mono text-xs leading-6">
                  {patchResult.diff.split(/\r?\n/).map((line, index) => {
                    let lineClass = "text-app-muted";
                    if (line.startsWith("+++") || line.startsWith("---")) lineClass = "font-bold text-app-text";
                    else if (line.startsWith("+")) lineClass = "bg-emerald-500/10 text-emerald-400";
                    else if (line.startsWith("-")) lineClass = "bg-red-500/10 text-red-400";
                    else if (line.startsWith("@@")) lineClass = "text-sky-400";

                    return (
                      <div key={index} className={`whitespace-pre px-2 ${lineClass}`}>
                        {line || " "}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-app-muted">
              The original file has not been modified. Approving this proposal will create a backup before applying the change. Declining it leaves the original file untouched.
            </p>
          </div>
        </section>
      ) : reviewResult ? (
        <section className="flex flex-col flex-1 h-full overflow-hidden min-h-0">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-app-line bg-[#141719] p-4">
            <div className="min-w-0">
              <h2 className="text-sm font-bold uppercase tracking-wider">Code Review Results</h2>
              <p className="mt-1 truncate text-xs text-app-muted">{reviewResult.relative_path}</p>
            </div>

            <button
              type="button"
              onClick={clearReviewState}
              className="shrink-0 rounded-lg border border-app-line px-3 py-2 text-xs font-semibold text-app-muted transition-colors hover:bg-app-line/50 hover:text-app-text"
            >
              Close Review
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-5 p-4 md:p-6 min-h-0 scrollbar-thumb-app-btn-hover">
            <div className="rounded-xl border border-app-line bg-[#141719] p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-app-dim">Overall assessment</p>
              <p className="text-sm leading-6 text-app-text">{reviewResult.review.summary}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-app-muted">
                <span>{reviewResult.review.findings.length} findings</span>
                <span>{reviewResult.line_count} lines</span>
                <span>{reviewResult.language ?? "Unknown language"}</span>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider">Findings</h3>
                <span className="text-xs text-app-muted">Generate a patch for an individual finding</span>
              </div>

              {reviewResult.review.findings.length === 0 ? (
                <div className="rounded-xl border border-app-line bg-[#141719] p-6 text-center">
                  <Check className="mx-auto mb-2 h-7 w-7 text-emerald-400" />
                  <p className="text-sm font-semibold">No issues identified</p>
                  <p className="mt-1 text-xs text-app-muted">The reviewer did not find actionable problems in this file.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviewResult.review.findings.map((finding, index) => (
                    <article key={`${finding.title}-${index}`} className="rounded-xl border border-app-line bg-[#141719] p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-md border px-2 py-1 text-micro font-bold uppercase tracking-wider ${severityStyles[finding.severity]}`}>
                          {finding.severity}
                        </span>
                        <span className="text-xs text-app-muted">{finding.category}</span>
                        {finding.line_start && (
                          <span className="text-xs text-app-dim">
                            Line {finding.line_start}
                            {finding.line_end && finding.line_end !== finding.line_start ? `–${finding.line_end}` : ""}
                          </span>
                        )}
                      </div>
                      <h4 className="mt-3 text-sm font-bold text-app-text">{finding.title}</h4>
                      <p className="mt-2 text-sm leading-6 text-app-muted">{finding.explanation}</p>

                      <div className="mt-3 rounded-lg border border-app-line bg-[#1c2124] p-3">
                        <p className="mb-1 text-micro font-bold uppercase tracking-wider text-app-dim">Evidence</p>
                        <p className="whitespace-pre-wrap wrap-break-word font-mono text-xs leading-5 text-app-muted">{finding.evidence}</p>
                      </div>

                      {finding.suggested_fix && (
                        <div className="mt-3 rounded-lg border border-app-accent/20 bg-app-accent/5 p-3">
                          <p className="mb-1 text-micro font-bold uppercase tracking-wider text-app-accent">Suggested fix</p>
                          <p className="text-xs leading-5 text-app-text">{finding.suggested_fix}</p>
                        </div>
                      )}

                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onGeneratePatch(finding)}
                          disabled={isGeneratingPatch || isApplying || !finding.suggested_fix?.trim()}
                          className="btn btn-primary flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isGeneratingPatch && selectedFinding?.title === finding.title ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          {isGeneratingPatch && selectedFinding?.title === finding.title ? "Generating..." : "Generate Patch"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {reviewResult.review.strengths.length > 0 && (
              <div className="rounded-xl border border-app-line bg-[#141719] p-4">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider">Strengths</h3>
                <ul className="space-y-2">
                  {reviewResult.review.strengths.map((strength, index) => (
                    <li key={index} className="flex gap-2 text-sm leading-5 text-app-muted">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {reviewResult.review.suggested_tests.length > 0 && (
              <div className="rounded-xl border border-app-line bg-[#141719] p-4">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider">Suggested Tests</h3>
                <ul className="list-inside list-disc space-y-2 text-sm leading-5 text-app-muted">
                  {reviewResult.review.suggested_tests.map((test, index) => (
                    <li key={index}>{test}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      ) : (
        <div className="flex flex-col flex-1 items-center justify-center p-4 md:p-8 overflow-y-auto min-h-0">
          {selectedFile ? (
            <div className="w-full max-w-md animate-in zoom-in-95 rounded-xl border border-app-line bg-[#141719] p-6 text-center shadow-xl duration-200">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-app-line bg-[#1c2124]">
                <FolderKanban className="h-5 w-5 text-app-accent" />
              </div>
              <h3 className="mb-2 break-all text-lg font-bold">{fileName}</h3>
              <p className="break-all text-xs text-app-muted">{selectedFile.relative_path}</p>
              <p className="mb-6 mt-2 break-all text-2xs text-app-dim">{selectedFile.workspace_root}</p>
              <button
                type="button"
                onClick={onLaunchReview}
                disabled={isReviewing}
                className="btn btn-primary flex h-10 w-full items-center justify-center gap-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isReviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {isReviewing ? "Analyzing code..." : "Launch Code Review"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center text-app-dim">
              <FolderKanban className="h-12 w-12 opacity-20" />
              <p className="text-sm font-medium">Select a file from the explorer to begin.</p>
              <p className="max-w-xs text-xs leading-5 text-app-muted">
                Choose a file inside one of your configured workspaces.
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
};

export default WorkspaceMainContent;
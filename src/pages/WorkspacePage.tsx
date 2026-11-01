
import { useEffect, useState } from "react";
import {
  Loader2,
  Play,
  FolderKanban,
  ArrowLeft,
  RefreshCw,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { HTTPError } from "ky";

import { useAuthStore } from "../store/useAuthStore";
import { GetWorkspaceTree } from "../Api/Workspace";
import type { FileNode } from "../Api/Workspace";

import {
  InitiateCodeReview,
  GenerateCodePatch,
  ApplyCodePatch,
} from "../Api/Review";

import type {
  CodeReviewFileResponse,
  CodePatchResponse,
  ReviewFinding,
} from "../Api/Review";

import FileTree from "../components/workspace/FileTree";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const getErrorMessage = async (
  error: unknown,
  fallback: string
): Promise<string> => {
  if (error instanceof HTTPError) {
    try {
      const errorData = await error.response.clone().json() as {
        detail?: unknown;
        message?: unknown;
      };

      const detail = errorData.detail ?? errorData.message;

      if (typeof detail === "string") {
        return detail;
      }

      if (detail) {
        return JSON.stringify(detail);
      }
    } catch {
      // Use the HTTP status when the response isn't JSON.
    }

    return `${fallback} (${error.response.status})`;
  }

  return error instanceof Error ? error.message : fallback;
};

const severityStyles: Record<ReviewFinding["severity"], string> = {
  critical: "border-red-500/40 bg-red-500/10 text-red-400",
  high: "border-orange-500/40 bg-orange-500/10 text-orange-400",
  medium: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
  low: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  info: "border-app-line bg-app-panel2 text-app-muted",
};

// ─────────────────────────────────────────────
// WORKSPACE PAGE
// ─────────────────────────────────────────────

const WorkspacePage = () => {
  const { token } = useAuthStore();

  const [treeData, setTreeData] = useState<FileNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);

  const [isReviewing, setIsReviewing] = useState(false);
  const [isGeneratingPatch, setIsGeneratingPatch] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const [reviewResult, setReviewResult] =
    useState<CodeReviewFileResponse | null>(null);

  const [patchResult, setPatchResult] =
    useState<CodePatchResponse | null>(null);

  const [selectedFinding, setSelectedFinding] =
    useState<ReviewFinding | null>(null);

  // ───────────────────────────────────────────
  // LOAD WORKSPACE TREE
  // ───────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const fetchTree = async () => {
      setIsLoading(true);
      setTreeError(null);

      if (!token) {
        setTreeData(null);
        setTreeError("Please sign in to access your workspaces.");
        setIsLoading(false);
        return;
      }

      try {
        const data = await GetWorkspaceTree(token);

        if (!cancelled) {
          setTreeData(data);
        }
      } catch (error) {
        console.error("Failed to load workspace tree:", error);

        if (!cancelled) {
          setTreeData(null);
          setTreeError(
            "Couldn't load your workspaces. Check your backend and login session."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchTree();

    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  // ───────────────────────────────────────────
  // FILE SELECTION
  // ───────────────────────────────────────────

  const handleSelectFile = (file: FileNode | null) => {
    if (file?.is_dir) return;

    setSelectedFile(file);
    setReviewResult(null);
    setPatchResult(null);
    setSelectedFinding(null);
  };

  // ───────────────────────────────────────────
  // INITIATE CODE REVIEW
  // ───────────────────────────────────────────

  const handleLaunchReview = async () => {
    if (!selectedFile || !token) return;

    if (
      !selectedFile.workspace_root ||
      !selectedFile.relative_path
    ) {
      toast.error("The selected file has invalid workspace metadata.");
      return;
    }

    const loadingToast = toast.loading(
      `Analyzing ${selectedFile.name}...`
    );

    setIsReviewing(true);

    try {
      const response = await InitiateCodeReview(token, {
        workspace_root: selectedFile.workspace_root,
        relative_path: selectedFile.relative_path,
        review_mode: "general",
      });

      setReviewResult(response);
      setPatchResult(null);

      toast.success("Code review completed.", {
        id: loadingToast,
      });
    } catch (error: unknown) {
      console.error("Code review failed:", error);

      const message = await getErrorMessage(
        error,
        "Code review failed"
      );

      toast.error(message, {
        id: loadingToast,
        duration: 7000,
      });
    } finally {
      setIsReviewing(false);
    }
  };

  // ───────────────────────────────────────────
  // GENERATE PATCH FOR A FINDING
  // ───────────────────────────────────────────

  const handleGeneratePatch = async (finding: ReviewFinding) => {
    if (!selectedFile || !reviewResult || !token) return;

    if (!finding.suggested_fix?.trim()) {
      toast.error("No suggested fix is available for this finding.");
      return;
    }

    if (!selectedFile.workspace_root) {
      toast.error("Workspace information is missing.");
      return;
    }

    setIsGeneratingPatch(true);
    setSelectedFinding(finding);

    const loadingToast = toast.loading(
      "Generating proposed code fix..."
    );

    try {
      const response = await GenerateCodePatch(token, {
        workspace_root: selectedFile.workspace_root,
        relative_path: reviewResult.relative_path,
        expected_sha256: reviewResult.sha256,

        finding_title: finding.title,
        finding_evidence: finding.evidence,
        finding_explanation: finding.explanation,
        suggested_fix: finding.suggested_fix,
      });

      setPatchResult(response);

      toast.success("Patch proposal generated.", {
        id: loadingToast,
      });
    } catch (error: unknown) {
      console.error("Patch generation failed:", error);

      const message = await getErrorMessage(
        error,
        "Patch generation failed"
      );

      toast.error(message, {
        id: loadingToast,
        duration: 7000,
      });

      setSelectedFinding(null);
    } finally {
      setIsGeneratingPatch(false);
    }
  };

  // ───────────────────────────────────────────
  // APPROVE AND APPLY PATCH
  // ───────────────────────────────────────────

  const handleApprovePatch = async () => {
    if (!patchResult || !selectedFile || !token || isApplying) {
      return;
    }

    if (!selectedFile.workspace_root) {
      toast.error("Workspace information is missing.");
      return;
    }

    setIsApplying(true);

    const loadingToast = toast.loading(
      "Applying patch and creating backup..."
    );

    try {
      const response = await ApplyCodePatch(token, {
        workspace_root: selectedFile.workspace_root,
        relative_path: patchResult.relative_path,

        expected_sha256: patchResult.original_sha256,
        proposed_sha256: patchResult.proposed_sha256,

        proposed_code: patchResult.proposed_code,

        approval: "apply",
      });

      if (!response.patch_applied) {
        throw new Error("The backend did not confirm patch application.");
      }

      toast.success(
        `Patch applied! Backup ID: ${response.backup_id}`,
        {
          id: loadingToast,
          duration: 8000,
        }
      );

      // Remove the old review and proposal because the file has changed.
      setPatchResult(null);
      setSelectedFinding(null);
      setReviewResult(null);

      // Refresh the workspace tree.
      setReloadKey((key) => key + 1);
    } catch (error: unknown) {
      console.error("Patch application failed:", error);

      const message = await getErrorMessage(
        error,
        "Patch application failed"
      );

      toast.error(message, {
        id: loadingToast,
        duration: 8000,
      });
    } finally {
      setIsApplying(false);
    }
  };

  // ───────────────────────────────────────────
  // DECLINE PATCH
  // ───────────────────────────────────────────

  const handleDeclinePatch = () => {
    if (isApplying) return;

    setPatchResult(null);
    setSelectedFinding(null);

    toast.success(
      "Patch declined. The original file was not changed."
    );
  };

  const fileName = selectedFile?.name ?? null;

  // ───────────────────────────────────────────
  // UI
  // ───────────────────────────────────────────

  return (
    <div className="flex h-full min-h-125 w-full animate-in fade-in duration-300 bg-app-bg text-app-text">

      {/* WORKSPACE SIDEBAR */}

      <aside
        className={`${
          selectedFile ? "hidden md:flex" : "flex"
        } w-full shrink-0 flex-col border-r border-app-line bg-[#141719] md:w-80`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-app-line p-4">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-app-accent" />

            <h2 className="text-sm font-bold uppercase tracking-wider text-app-dim">
              Workspace
            </h2>
          </div>

          <button
            type="button"
            aria-label="Refresh workspaces"
            title="Refresh workspaces"
            disabled={isLoading}
            onClick={() => setReloadKey((key) => key + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-app-muted transition-colors hover:bg-app-line/50 hover:text-app-text disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isLoading ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 text-app-muted">
              <Loader2 className="h-5 w-5 animate-spin text-app-accent" />
              <p className="text-xs">Loading workspaces...</p>
            </div>
          ) : treeError ? (
            <div className="mx-2 mt-8 rounded-xl border border-app-line bg-[#1c2124] p-4 text-center">
              <FolderKanban className="mx-auto mb-3 h-8 w-8 text-app-dim" />

              <p className="text-sm font-medium text-app-text">
                Workspace unavailable
              </p>

              <p className="mt-2 text-xs leading-5 text-app-muted">
                {treeError}
              </p>

              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-app-line px-3 text-xs font-semibold text-app-text transition-colors hover:bg-app-line/50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </button>
            </div>
          ) : treeData?.children?.length ? (
            <>
              <FileTree
                node={treeData}
                onSelectFile={handleSelectFile}
              />

              {treeData.truncated && (
                <p className="px-3 py-3 text-xs leading-5 text-app-muted">
                  The workspace tree was limited. Some entries may be omitted.
                </p>
              )}
            </>
          ) : (
            <div className="px-4 py-10 text-center">
              <FolderKanban className="mx-auto mb-3 h-8 w-8 text-app-dim" />

              <p className="text-sm font-medium text-app-text">
                No workspaces found
              </p>

              <p className="mt-2 text-xs leading-5 text-app-muted">
                Configure workspace roots in the backend environment and refresh this view.
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}

      <main
        className={`${
          !selectedFile ? "hidden md:flex" : "flex"
        } relative min-w-0 flex-1 flex-col overflow-hidden bg-[#1c2124]`}
      >

        {/* MOBILE BACK BUTTON */}

        {selectedFile && (
          <div className="shrink-0 border-b border-app-line p-3 md:hidden">
            <button
              type="button"
              onClick={() => handleSelectFile(null)}
              className="flex items-center gap-2 text-sm font-medium text-app-muted transition-colors hover:text-app-text"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to files
            </button>
          </div>
        )}

        {/* PATCH PROPOSAL VIEW */}

        {patchResult ? (
          <section className="flex min-h-0 flex-1 flex-col">

            <div className="flex shrink-0 flex-col gap-3 border-b border-app-line bg-[#141719] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-app-accent" />

                  <h2 className="text-sm font-bold uppercase tracking-wider">
                    Proposed Patch
                  </h2>
                </div>

                <p className="mt-1 break-all text-xs text-app-muted">
                  {patchResult.relative_path}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={handleDeclinePatch}
                  disabled={isApplying}
                  className="flex items-center justify-center gap-2 rounded-lg border border-status-red px-3 py-2 text-sm font-semibold text-status-red transition-colors hover:bg-status-red/10 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Decline
                </button>

                <button
                  type="button"
                  onClick={handleApprovePatch}
                  disabled={isApplying}
                  className="btn btn-primary flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isApplying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}

                  {isApplying ? "Applying..." : "Approve & Apply"}
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">

              <div className="mb-5 rounded-xl border border-app-line bg-[#141719] p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-app-dim">
                  Patch summary
                </p>

                <p className="text-sm leading-6 text-app-text">
                  {patchResult.summary}
                </p>

                {selectedFinding && (
                  <div className="mt-4 border-t border-app-line pt-3">
                    <p className="text-xs font-semibold text-app-muted">
                      Fixing finding
                    </p>

                    <p className="mt-1 text-sm font-medium text-app-text">
                      {selectedFinding.title}
                    </p>
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-app-line bg-[#111416]">
                <div className="flex items-center justify-between border-b border-app-line px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-app-dim">
                    Unified diff
                  </p>

                  <span className="text-xs text-app-muted">
                    {patchResult.original_line_count} → {patchResult.proposed_line_count} lines
                  </span>
                </div>

                <div className="overflow-x-auto p-3 sm:p-4">
                  <div className="min-w-max font-mono text-xs leading-6">
                    {patchResult.diff.split(/\r?\n/).map((line, index) => {
                      let lineClass = "text-app-muted";

                      if (
                        line.startsWith("+++") ||
                        line.startsWith("---")
                      ) {
                        lineClass = "font-bold text-app-text";
                      } else if (line.startsWith("+")) {
                        lineClass = "bg-emerald-500/10 text-emerald-400";
                      } else if (line.startsWith("-")) {
                        lineClass = "bg-red-500/10 text-red-400";
                      } else if (line.startsWith("@@")) {
                        lineClass = "text-sky-400";
                      }

                      return (
                        <div
                          key={index}
                          className={`whitespace-pre px-2 ${lineClass}`}
                        >
                          {line || " "}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-app-muted">
                The original file has not been modified. Approving this proposal
                will create a backup before applying the change. Declining it
                leaves the original file untouched.
              </p>
            </div>
          </section>

        ) : reviewResult ? (

          /* CODE REVIEW RESULTS */

          <section className="flex min-h-0 flex-1 flex-col">

            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-app-line bg-[#141719] p-4">
              <div className="min-w-0">
                <h2 className="text-sm font-bold uppercase tracking-wider">
                  Code Review Results
                </h2>

                <p className="mt-1 truncate text-xs text-app-muted">
                  {reviewResult.relative_path}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setReviewResult(null);
                  setPatchResult(null);
                  setSelectedFinding(null);
                }}
                className="shrink-0 rounded-lg border border-app-line px-3 py-2 text-xs font-semibold text-app-muted transition-colors hover:bg-app-line/50 hover:text-app-text"
              >
                Close Review
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 md:p-6">

              {/* SUMMARY */}

              <div className="rounded-xl border border-app-line bg-[#141719] p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-app-dim">
                  Overall assessment
                </p>

                <p className="text-sm leading-6 text-app-text">
                  {reviewResult.review.summary}
                </p>

                <div className="mt-4 flex flex-wrap gap-3 text-xs text-app-muted">
                  <span>
                    {reviewResult.review.findings.length} findings
                  </span>

                  <span>
                    {reviewResult.line_count} lines
                  </span>

                  <span>
                    {reviewResult.language ?? "Unknown language"}
                  </span>
                </div>
              </div>

              {/* FINDINGS */}

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    Findings
                  </h3>

                  <span className="text-xs text-app-muted">
                    Generate a patch for an individual finding
                  </span>
                </div>

                {reviewResult.review.findings.length === 0 ? (
                  <div className="rounded-xl border border-app-line bg-[#141719] p-6 text-center">
                    <Check className="mx-auto mb-2 h-7 w-7 text-emerald-400" />

                    <p className="text-sm font-semibold">
                      No issues identified
                    </p>

                    <p className="mt-1 text-xs text-app-muted">
                      The reviewer did not find actionable problems in this file.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviewResult.review.findings.map((finding, index) => (
                      <article
                        key={`${finding.title}-${index}`}
                        className="rounded-xl border border-app-line bg-[#141719] p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                              severityStyles[finding.severity]
                            }`}
                          >
                            {finding.severity}
                          </span>

                          <span className="text-xs text-app-muted">
                            {finding.category}
                          </span>

                          {finding.line_start && (
                            <span className="text-xs text-app-dim">
                              Line {finding.line_start}
                              {finding.line_end &&
                              finding.line_end !== finding.line_start
                                ? `–${finding.line_end}`
                                : ""}
                            </span>
                          )}
                        </div>

                        <h4 className="mt-3 text-sm font-bold text-app-text">
                          {finding.title}
                        </h4>

                        <p className="mt-2 text-sm leading-6 text-app-muted">
                          {finding.explanation}
                        </p>

                        <div className="mt-3 rounded-lg border border-app-line bg-[#1c2124] p-3">
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-app-dim">
                            Evidence
                          </p>

                          <p className="whitespace-pre-wrap break-words font-mono text-xs leading-5 text-app-muted">
                            {finding.evidence}
                          </p>
                        </div>

                        {finding.suggested_fix && (
                          <div className="mt-3 rounded-lg border border-app-accent/20 bg-app-accent/5 p-3">
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-app-accent">
                              Suggested fix
                            </p>

                            <p className="text-xs leading-5 text-app-text">
                              {finding.suggested_fix}
                            </p>
                          </div>
                        )}

                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleGeneratePatch(finding)}
                            disabled={
                              isGeneratingPatch ||
                              isApplying ||
                              !finding.suggested_fix?.trim()
                            }
                            className="btn btn-primary flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isGeneratingPatch &&
                            selectedFinding?.title === finding.title ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}

                            {isGeneratingPatch &&
                            selectedFinding?.title === finding.title
                              ? "Generating..."
                              : "Generate Patch"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              {/* STRENGTHS */}

              {reviewResult.review.strengths.length > 0 && (
                <div className="rounded-xl border border-app-line bg-[#141719] p-4">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider">
                    Strengths
                  </h3>

                  <ul className="space-y-2">
                    {reviewResult.review.strengths.map((strength, index) => (
                      <li
                        key={index}
                        className="flex gap-2 text-sm leading-5 text-app-muted"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* SUGGESTED TESTS */}

              {reviewResult.review.suggested_tests.length > 0 && (
                <div className="rounded-xl border border-app-line bg-[#141719] p-4">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider">
                    Suggested Tests
                  </h3>

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

          /* FILE SELECTION / REVIEW LAUNCH */

          <div className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
            {selectedFile ? (
              <div className="w-full max-w-md animate-in zoom-in-95 rounded-xl border border-app-line bg-[#141719] p-6 text-center shadow-xl duration-200">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-app-line bg-[#1c2124]">
                  <FolderKanban className="h-5 w-5 text-app-accent" />
                </div>

                <h3 className="mb-2 break-all text-lg font-bold">
                  {fileName}
                </h3>

                <p className="break-all text-xs text-app-muted">
                  {selectedFile.relative_path}
                </p>

                <p className="mb-6 mt-2 break-all text-[11px] text-app-dim">
                  {selectedFile.workspace_root}
                </p>

                <button
                  type="button"
                  onClick={handleLaunchReview}
                  disabled={isReviewing}
                  className="btn btn-primary flex h-10 w-full items-center justify-center gap-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isReviewing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}

                  {isReviewing ? "Analyzing code..." : "Launch Code Review"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center text-app-dim">
                <FolderKanban className="h-12 w-12 opacity-20" />

                <p className="text-sm font-medium">
                  Select a file from the explorer to begin.
                </p>

                <p className="max-w-xs text-xs leading-5 text-app-muted">
                  Choose a file inside one of your configured workspaces.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default WorkspacePage;

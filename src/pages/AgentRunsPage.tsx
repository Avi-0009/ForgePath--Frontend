
import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileCode2,
  FolderGit2,
  GitPullRequest,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  Terminal,
} from "lucide-react";
import { HTTPError } from "ky";

import {
  getAgentRunDetail,
  getAgentRunHistory,
  type TaskHistoryItem,
  type WorkflowDetail,
  type WorkflowStatus,
} from "../Api/AgentRuns";
import { useAuthStore } from "../store/useAuthStore";

const approvalStatuses = new Set<WorkflowStatus>([
  "awaiting_plan_approval",
  "awaiting_file_selection",
  "awaiting_patch_approval",
  "awaiting_test_approval",
  "awaiting_repair_file_selection",
]);

const completedStatuses = new Set<WorkflowStatus>([
  "completed",
  "completed_without_tests",
]);

function getStatusLabel(status: WorkflowStatus): string {
  if (approvalStatuses.has(status)) return "Awaiting action";
  if (completedStatuses.has(status)) return "Completed";
  if (status === "running") return "Running";
  if (status === "tests_failed") return "Tests failed";
  if (status === "cancelled") return "Cancelled";
  return "Failed";
}

function getStatusStyle(status: WorkflowStatus): string {
  if (approvalStatuses.has(status)) {
    return "border-status-amber-line bg-status-amber-bg text-status-amber";
  }

  if (completedStatuses.has(status)) {
    return "border-status-green-line bg-status-green-bg text-status-green";
  }

  if (status === "running") {
    return "border-status-blue-line bg-status-blue-bg text-status-blue";
  }

  return "border-app-line bg-app-panel2 text-status-red";
}

function getSourceName(path: string): string {
  return (
    path.replaceAll("\\", "/").split("/").filter(Boolean).at(-1) ||
    "Unknown source"
  );
}

function getTitle(description: string): string {
  return description.trim().split("\n")[0] || "Untitled run";
}

function formatDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Unknown"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

const panelClass =
  "min-w-0 overflow-hidden rounded-panel border border-app-line " +
  "bg-app-panel shadow-panel";

export default function AgentRunsPage() {
  const token = useAuthStore((state) => state.token);

  const [runs, setRuns] = useState<TaskHistoryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorkflowDetail | null>(null);

  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(
    null,
  );
  const [detailError, setDetailError] = useState<string | null>(
    null,
  );

  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedSelector, setExpandedSelector] = useState(false);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    getAgentRunHistory(token, 0, 50)
      .then((response) => {
        if (cancelled) return;

        setRuns(response.items);
        setHistoryError(null);

        setSelectedId((previous) => {
          if (
            previous &&
            response.items.some(
              (item) => item.thread_id === previous,
            )
          ) {
            return previous;
          }

          return response.items[0]?.thread_id ?? null;
        });
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryError("Unable to load agent run history.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  useEffect(() => {
    if (!selectedId || !token) return;

    let cancelled = false;

    getAgentRunDetail(selectedId, token)
      .then((result) => {
        if (cancelled) return;

        setDetail(result);
        setDetailError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        setDetail(null);

        if (
          error instanceof HTTPError &&
          error.response.status === 503
        ) {
          setDetailError(
            "The agent runtime is currently unavailable. " +
              "Saved run history remains accessible.",
          );
        } else if (
          error instanceof HTTPError &&
          error.response.status === 404
        ) {
          setDetailError(
            "The workflow checkpoint could not be found.",
          );
        } else {
          setDetailError(
            "Unable to retrieve the selected workflow state.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, token, refreshKey]);

  const selectedRun =
    runs.find((run) => run.thread_id === selectedId) ?? null;

  const steps = detail?.plan?.steps ?? [];
  const currentStep = detail?.current_step_number ?? null;
  const completedCount = selectedRun?.completed_steps ?? 0;

  const progress =
    selectedRun && selectedRun.total_steps > 0
      ? Math.min(
          100,
          Math.round(
            (selectedRun.completed_steps /
              selectedRun.total_steps) *
              100,
          ),
        )
      : null;

  function refresh() {
    setLoadingHistory(true);
    setLoadingDetail(true);
    setHistoryError(null);
    setDetailError(null);
    setRefreshKey((current) => current + 1);
  }

  function selectRun(threadId: string) {
    setSelectedId(threadId);
    setDetail(null);
    setDetailError(null);
    setLoadingDetail(true);
    setExpandedSelector(false);
  }

  return (
    <div className="min-w-0 bg-app-bg px-3 py-5 text-app-text sm:px-6 sm:py-7 lg:px-9">
      <div className="mx-auto max-w-app space-y-5">
        {/* Heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="mb-1.5 text-micro font-bold uppercase tracking-eyebrow text-app-dim">
              AGENT RUNS
              {selectedRun
                ? ` / ${selectedRun.thread_id.slice(0, 8)}`
                : ""}
            </p>

            <h1 className="wrap-break-words font-manrope text-2xl font-extrabold tracking-tight md:text-[28px]">
              {selectedRun
                ? getTitle(selectedRun.task_description)
                : "Agent runs"}
            </h1>

            <p className="mt-1 max-w-170 text-[13px] leading-relaxed text-app-muted">
              {selectedRun
                ? selectedRun.task_description
                : "Inspect agent workflows, execution progress, and human checkpoints."}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {selectedRun && (
              <span
                className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-2 text-2xs ${getStatusStyle(
                  selectedRun.status,
                )}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {getStatusLabel(selectedRun.status)}
              </span>
            )}

            <button
              type="button"
              onClick={refresh}
              disabled={!token || loadingHistory}
              className="btn"
            >
              <RefreshCw
                size={14}
                aria-hidden="true"
                className={loadingHistory ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Choose run */}
        <section className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <h2 className="text-xs font-semibold">
                Workflow history
              </h2>
              <p className="mt-1 text-2xs text-app-muted">
                Select a saved agent run to inspect its details.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setExpandedSelector((current) => !current)
              }
              disabled={runs.length === 0}
              aria-expanded={expandedSelector}
              className="btn"
            >
              <Activity size={14} aria-hidden="true" />
              {runs.length} recent runs
              <ChevronDown
                size={14}
                aria-hidden="true"
                className={
                  expandedSelector ? "rotate-180" : ""
                }
              />
            </button>
          </div>

          {expandedSelector && (
            <div className="max-h-64 overflow-y-auto border-t border-app-line p-2">
              {runs.map((run) => (
                <button
                  key={run.thread_id}
                  type="button"
                  onClick={() => selectRun(run.thread_id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg p-3 text-left hover:bg-app-row-hover ${
                    selectedId === run.thread_id
                      ? "bg-app-panel3"
                      : ""
                  }`}
                >
                  <div className="min-w-0">
                    <strong className="block truncate text-xs">
                      {getTitle(run.task_description)}
                    </strong>
                    <span className="mt-1 block text-micro text-app-muted">
                      {formatDate(run.updated_at)}
                    </span>
                  </div>

                  <span className="shrink-0 text-micro text-app-accent">
                    {getStatusLabel(run.status)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {historyError && (
          <div
            role="alert"
            className="rounded-lg border border-app-line bg-app-panel p-4 text-xs text-status-red"
          >
            {historyError}
          </div>
        )}

        {loadingHistory && runs.length === 0 ? (
          <div className={`${panelClass} p-12 text-center`}>
            <LoaderCircle
              size={24}
              className="mx-auto animate-spin text-app-accent"
            />
            <p className="mt-3 text-xs text-app-muted">
              Loading agent runs...
            </p>
          </div>
        ) : !selectedRun ? (
          <div className={`${panelClass} p-12 text-center`}>
            <Activity
              size={26}
              className="mx-auto text-app-accent"
            />
            <h2 className="mt-3 text-sm font-semibold">
              No agent runs yet
            </h2>
            <p className="mt-2 text-xs text-app-muted">
              Workflow executions will appear here once an
              agent run has been created.
            </p>
          </div>
        ) : (
          <>
            <section
              className={`${panelClass} flex flex-wrap items-center gap-4 p-4`}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-app-line bg-app-panel3">
                <FolderGit2
                  size={19}
                  className="text-app-accent"
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[13px] font-semibold">
                  {getSourceName(selectedRun.workspace_root)}
                </h2>

                <p className="mt-1 truncate font-mono text-micro text-app-muted">
                  Run {selectedRun.thread_id.slice(0, 8)} ·{" "}
                  {selectedRun.planning_mode}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-2xs text-app-muted">
                <span>
                  <strong className="text-app-text">
                    {selectedRun.total_steps}
                  </strong>{" "}
                  planned steps
                </span>
                <span>
                  <strong className="text-app-text">
                    {completedCount}
                  </strong>{" "}
                  complete
                </span>
                <span>
                  <strong className="text-app-text">
                    {detail?.applied_patches.length ?? "—"}
                  </strong>{" "}
                  applied patches
                </span>
              </div>
            </section>

            <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.8fr)]">
              <section className={panelClass}>
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-app-line px-5 py-4">
                  <div>
                    <h2 className="text-[13px] font-bold">
                      Run timeline
                    </h2>
                    <p className="mt-1 text-2xs text-app-muted">
                      Steps and checkpoint information from the workflow
                    </p>
                  </div>

                  <span className="rounded-md border border-app-line px-2 py-1 text-micro text-app-muted">
                    {selectedRun.completed_steps} of{" "}
                    {selectedRun.total_steps} complete
                  </span>
                </header>

                {loadingDetail ? (
                  <div className="flex items-center justify-center gap-2 p-10 text-xs text-app-muted">
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                    />
                    Loading checkpoint...
                  </div>
                ) : steps.length > 0 ? (
                  <div className="p-5">
                    {steps.map((step, index) => {
                      const isSkipped =
                        detail?.skipped_steps.includes(
                          step.step_number,
                        ) ?? false;

                      const isCurrent =
                        step.step_number === currentStep;

                      const isFinished =
                        completedStatuses.has(
                          selectedRun.status,
                        ) && !isSkipped;

                      return (
                        <div
                          key={step.step_number}
                          className="relative flex gap-3 pb-6 last:pb-0"
                        >
                          {index < steps.length - 1 && (
                            <span
                              aria-hidden="true"
                              className="absolute bottom-0 left-3.5 top-8 w-px bg-app-line"
                            />
                          )}

                          <span
                            className={`relative z-10 grid h-7.25 w-7.25 shrink-0 place-items-center rounded-full border text-micro ${
                              isFinished
                                ? "border-status-green-line bg-status-green-bg text-status-green"
                                : isCurrent
                                  ? "border-app-accent bg-app-accent text-app-accent-ink"
                                  : "border-app-line bg-app-panel3 text-app-muted"
                            }`}
                          >
                            {isFinished ? (
                              <Check size={14} />
                            ) : (
                              step.step_number
                            )}
                          </span>

                          <div className="min-w-0 flex-1">
                            <h3 className="pt-1 text-xs font-semibold">
                              {step.title}
                            </h3>

                            <p className="mt-1 text-2xs leading-relaxed text-app-muted">
                              {step.description}
                            </p>

                            {isCurrent && (
                              <p className="mt-2 text-micro font-semibold text-app-accent">
                                Current step
                              </p>
                            )}

                            {isSkipped && (
                              <p className="mt-2 text-micro text-app-dim">
                                Skipped
                              </p>
                            )}
                          </div>

                          {isFinished && (
                            <CheckCircle2
                              size={15}
                              className="mt-1 shrink-0 text-status-green"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Clock3
                      size={23}
                      className="mx-auto text-app-muted"
                    />
                    <p className="mt-3 text-xs text-app-muted">
                      {detailError ||
                        "A detailed execution plan is not available for this run."}
                    </p>
                  </div>
                )}

                {detail?.pending_action && (
                  <div className="flex flex-col gap-3 border-t border-status-amber-line bg-status-amber-bg p-4 sm:flex-row sm:items-center">
                    <ShieldAlert
                      size={19}
                      className="shrink-0 text-status-amber"
                    />

                    <div className="min-w-0 flex-1">
                      <strong className="block text-xs text-app-text">
                        Human checkpoint required
                      </strong>
                      <p className="mt-1 text-2xs leading-relaxed text-app-muted">
                        {detail.pending_action.message}
                      </p>
                    </div>

                    <span className="self-start rounded-md border border-status-amber-line px-3 py-2 text-2xs text-status-amber">
                      Review required
                    </span>
                  </div>
                )}
              </section>

              {/* Right column: agent console */}
              <aside className={panelClass}>
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-app-line px-5 py-4">
                  <div>
                    <h2 className="text-[13px] font-bold">
                      Agent console
                    </h2>
                    <p className="mt-1 text-2xs text-app-muted">
                      Available checkpoint state
                    </p>
                  </div>
                  <Terminal
                    size={16}
                    className="text-app-muted"
                    aria-hidden="true"
                  />
                </header>

                <div className="space-y-5 p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-app-accent/30 bg-app-accent/10">
                      <Activity
                        size={19}
                        className="text-app-accent"
                      />
                    </span>

                    <div>
                      <strong className="block text-xs">
                        ForgePath Agent
                      </strong>
                      <span className="text-micro text-app-muted">
                        LangGraph · checkpointed workflow
                      </span>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-auto rounded-lg border border-app-line bg-app-bg p-3 font-mono text-2xs leading-relaxed">
                    <p className="mb-2 text-app-dim">
                      Current workflow state
                    </p>

                    <p className="wrap-break-words text-app-text">
                      {detail?.message ||
                        selectedRun.message ||
                        "No checkpoint message available."}
                    </p>

                    {detail?.error_message && (
                      <p className="mt-3 wrap-break-words text-status-red">
                        {detail.error_message}
                      </p>
                    )}

                    {detail?.pending_action && (
                      <p className="mt-3 wrap-break-words text-status-amber">
                        Pending: {detail.pending_action.kind}
                      </p>
                    )}

                    {!detail && detailError && (
                      <p className="mt-3 text-status-amber">
                        {detailError}
                      </p>
                    )}

                    <p className="mt-4 text-app-dim">
                      Event-by-event logs are not exposed by the
                      backend yet.
                    </p>
                  </div>

                  {progress !== null && (
                    <div>
                      <div className="flex items-center justify-between text-2xs text-app-muted">
                        <span>Workflow completion</span>
                        <strong className="text-app-text">
                          {progress}%
                        </strong>
                      </div>

                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-app-line">
                        <div
                          className="h-full rounded-full bg-app-accent"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="mb-2 text-micro font-bold uppercase tracking-eyebrow text-app-dim">
                      Run details
                    </h3>

                    <div className="divide-y divide-app-line-faint">
                      <div className="flex justify-between gap-3 py-3">
                        <span className="text-2xs text-app-muted">
                          Last updated
                        </span>
                        <span className="text-right text-2xs">
                          {formatDate(selectedRun.updated_at)}
                        </span>
                      </div>

                      <div className="flex justify-between gap-3 py-3">
                        <span className="text-2xs text-app-muted">
                          Repair attempts
                        </span>
                        <span className="text-2xs">
                          {detail
                            ? `${detail.repair_attempts} / ${detail.max_repair_attempts}`
                            : selectedRun.repair_attempts}
                        </span>
                      </div>

                      <div className="flex justify-between gap-3 py-3">
                        <span className="text-2xs text-app-muted">
                          Test runner
                        </span>
                        <span className="text-2xs">
                          {selectedRun.test_runner}
                        </span>
                      </div>

                      <div className="flex justify-between gap-3 py-3">
                        <span className="text-2xs text-app-muted">
                          Test result
                        </span>
                        <span className="text-2xs">
                          {detail?.test_result?.status ??
                            "Not available"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {detail?.patch_proposal && (
                    <div className="rounded-lg border border-app-line bg-app-panel2 p-3">
                      <div className="flex items-center gap-2">
                        <GitPullRequest
                          size={15}
                          className="text-app-accent"
                        />
                        <strong className="text-xs">
                          Patch proposal available
                        </strong>
                      </div>

                      <p className="mt-2 text-2xs leading-relaxed text-app-muted">
                        Review the proposed code changes before
                        approving any write or test action.
                      </p>
                    </div>
                  )}

                  {detail?.pending_action && (
                    <div className="rounded-lg border border-status-amber-line bg-status-amber-bg p-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle
                          size={15}
                          className="text-status-amber"
                        />
                        <strong className="text-xs">
                          Approval is pending
                        </strong>
                      </div>

                      <p className="mt-2 text-2xs leading-relaxed text-app-muted">
                        This page does not approve or apply
                        patches automatically. A full review
                        screen is required first.
                      </p>
                    </div>
                  )}
                </div>
              </aside>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-2xs text-app-dim">
              <FileCode2 size={13} aria-hidden="true" />
              Workflow data belongs to the authenticated user.
              No repository files are modified by this page.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
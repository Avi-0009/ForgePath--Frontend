import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";

import {
  CheckCircle2,
  Download,
  FilePenLine,
  FileText,
  GitCompareArrows,
  History,
  ListTodo,
  LoaderCircle,
  XCircle,
} from "lucide-react";

import {
  createProjectReviewTaskPatch,
  createProjectReviewTaskPlan,
  decideProjectReviewTaskPatch,
  downloadProjectReviewTaskPatch,
  decideProjectReviewTask,
  getProjectReviewTasks,
  type ProjectReviewTask,
} from "../../Api/ProjectReviewTasks";
import { decideProjectPlan } from "../../Api/ProjectWorkflows";
import { applyApprovedPatchToSavedFolder } from "../repositories/LocalPatchApplication";

import { useActiveProjectId } from "../../store/useActiveProjectId";
import { useAuthStore } from "../../store/useAuthStore";


const TASK_PAGE_SIZE = 25;

const ProjectReviewTasksPanel = () => {
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.user?.id);
  const projectId = useActiveProjectId();
  const [showHistory, setShowHistory] = useState(false);

  const [taskData, setTaskData] = useState<{
    userId: string;
    projectId: string;
    items: ProjectReviewTask[];
    nextOffset: number;
    hasMore: boolean;
    includeStale: boolean;
  } | null>(null);

  const tasks =
    token &&
    taskData?.userId === userId &&
    taskData?.projectId === projectId &&
    taskData?.includeStale === showHistory
      ? taskData.items
      : [];

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const listGeneration = useRef(0);

  const [busyTaskId, setBusyTaskId] =
    useState<string | null>(null);
  const [applyingTaskId, setApplyingTaskId] = useState<string | null>(null);

  const [errorData, setErrorData] = useState<{
    projectId: string;
    message: string;
  } | null>(null);

  const error =
    errorData?.projectId === projectId
      ? errorData.message
      : "";

  const [reload, setReload] = useState(0);
  const [successData, setSuccessData] = useState<{
    projectId: string;
    message: string;
  } | null>(null);


  useEffect(() => {
    if (!token || !userId || !projectId) {
      return;
    }

    let cancelled = false;
    const generation = ++listGeneration.current;

    void getProjectReviewTasks(
      token,
      projectId,
      0,
      TASK_PAGE_SIZE,
      showHistory,
    )
      .then((response) => {
        if (
          !cancelled &&
          generation === listGeneration.current
        ) {
          setTaskData({
            userId,
            projectId,
            items: response.items,
            nextOffset: response.items.length,
            hasMore:
              response.items.length === TASK_PAGE_SIZE,
            includeStale: showHistory,
          });

          setErrorData(null);
        }
      })
      .catch(() => {
        if (
          !cancelled &&
          generation === listGeneration.current
        ) {
          setErrorData({
            projectId,
            message: "Could not load project review tasks.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      listGeneration.current += 1;
    };
  }, [token, userId, projectId, reload, showHistory]);

  const loadMore = async () => {
    if (
      !token ||
      !userId ||
      !projectId ||
      loading ||
      loadingMore ||
      !taskData?.hasMore ||
      taskData.userId !== userId ||
      taskData.projectId !== projectId ||
      taskData.includeStale !== showHistory
    ) {
      return;
    }

    const generation = listGeneration.current;
    const offset = taskData.nextOffset;

    setLoadingMore(true);
    setErrorData(null);

    try {
      const response = await getProjectReviewTasks(
        token,
        projectId,
        offset,
        TASK_PAGE_SIZE,
        showHistory,
      );

      if (generation !== listGeneration.current) {
        return;
      }

      setTaskData((previous) => {
        if (
          previous?.userId !== userId ||
          previous.projectId !== projectId ||
          previous.includeStale !== showHistory ||
          previous.nextOffset !== offset
        ) {
          return previous;
        }

        const existingIds = new Set(
          previous.items.map((item) => item.id)
        );

        return {
          ...previous,

          items: [
            ...previous.items,
            ...response.items.filter(
              (item) => !existingIds.has(item.id)
            ),
          ],

          nextOffset:
            offset + response.items.length,

          hasMore:
            response.items.length === TASK_PAGE_SIZE,
        };
      });
    } catch {
      if (generation === listGeneration.current) {
        setErrorData({
          projectId,
          message: "Could not load more tasks.",
        });
      }
    } finally {
      setLoadingMore(false);
    }
  };


  const decide = async (
    task: ProjectReviewTask,
    status: "approved" | "dismissed",
  ) => {
    if (!token || !projectId || busyTaskId) {
      return;
    }

    setBusyTaskId(task.id);
    setErrorData(null);
    listGeneration.current += 1;

    try {
      const updated = await decideProjectReviewTask(
        token,
        projectId,
        task.id,
        status,
      );

      setTaskData((previous) =>
        previous?.projectId === projectId
          ? {
              ...previous,
              items: previous.items.map((item) =>
                item.id === updated.id ? updated : item
              ),
            }
          : previous
      );
    } catch {
      setErrorData({
        projectId,
        message: "Could not update this task. Please try again.",
      });
    } finally {
      setBusyTaskId(null);
    }
  };

  const createPlan = async (task: ProjectReviewTask) => {
    if (!token || !projectId || busyTaskId) {
      return;
    }

    setBusyTaskId(task.id);
    setErrorData(null);

    try {
      const updated = await createProjectReviewTaskPlan(
        token,
        projectId,
        task,
      );

      setTaskData((previous) =>
        previous?.projectId === projectId
          ? {
              ...previous,
              items: previous.items.map((item) =>
                item.id === updated.id ? updated : item
              ),
            }
          : previous
      );
    } catch {
      setErrorData({
        projectId,
        message:
          "Could not create this plan. Refresh the project and try again.",
      });
    } finally {
      setBusyTaskId(null);
    }
  };

  const decidePlan = async (
    task: ProjectReviewTask,
    status: "approved" | "rejected",
  ) => {
    if (!token || !projectId || busyTaskId || !task.plan ||
        !task.is_current_snapshot || task.plan_decision !== "pending") return;
    if (!window.confirm(
      `Confirm ${status} decision for this saved plan? This does not run code or edit files.`,
    )) return;

    setBusyTaskId(task.id);
    setErrorData(null);
    try {
      const updated = await decideProjectPlan(token, projectId, task, status);
      setTaskData((previous) => previous?.projectId === projectId
        ? {
            ...previous,
            items: previous.items.map((item) => item.id === updated.id ? updated : item),
          }
        : previous);
    } catch {
      setErrorData({
        projectId,
        message: "Plan decision was not saved. Refresh the task and retry.",
      });
    } finally {
      setBusyTaskId(null);
    }
  };

  const createPatch = async (task: ProjectReviewTask) => {
    if (!token || !projectId || busyTaskId || !task.plan ||
        task.plan_decision !== "approved") {
      return;
    }

    setBusyTaskId(task.id);
    setErrorData(null);

    try {
      const updated = await createProjectReviewTaskPatch(
        token,
        projectId,
        task,
      );

      setTaskData((previous) =>
        previous?.projectId === projectId
          ? {
              ...previous,
              items: previous.items.map((item) =>
                item.id === updated.id ? updated : item
              ),
            }
          : previous
      );
    } catch {
      setErrorData({
        projectId,
        message:
          "Could not create this patch proposal. Refresh the project and try again.",
      });
    } finally {
      setBusyTaskId(null);
    }
  };

  const decidePatch = async (
    task: ProjectReviewTask,
    status: "approved" | "rejected",
  ) => {
    if (!token || !projectId || busyTaskId) {
      return;
    }

    setBusyTaskId(task.id);
    setErrorData(null);

    try {
      const updated = await decideProjectReviewTaskPatch(
        token,
        projectId,
        task,
        status,
      );

      setTaskData((previous) =>
        previous?.projectId === projectId
          ? {
              ...previous,
              items: previous.items.map((item) =>
                item.id === updated.id ? updated : item
              ),
            }
          : previous
      );
    } catch {
      setErrorData({
        projectId,
        message: "Could not save the patch decision.",
      });
    } finally {
      setBusyTaskId(null);
    }
  };

  const downloadPatch = async (task: ProjectReviewTask) => {
    if (!token || !projectId || busyTaskId) {
      return;
    }

    setBusyTaskId(task.id);
    setErrorData(null);

    try {
      const blob = await downloadProjectReviewTaskPatch(
        token,
        projectId,
        task.id,
      );
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `forgepath-${task.id}.diff`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch {
      setErrorData({
        projectId,
        message:
          "Could not export this proposal. Refresh the project and verify its snapshot.",
      });
    } finally {
      setBusyTaskId(null);
    }
  };

  const applyPatch = async (task: ProjectReviewTask) => {
    if (!token || !userId || !projectId || busyTaskId || !task.patch ||
        task.patch_status !== "approved" || !task.is_current_snapshot) return;
    if (!window.confirm(
      `Apply the approved change to ${task.path} in your connected local folder? ` +
      "ForgePath will verify the whole folder, replace that one file, and upload a new snapshot. " +
      "This writes to your local source code.",
    )) return;

    setBusyTaskId(task.id);
    setApplyingTaskId(task.id);
    setErrorData(null);
    setSuccessData(null);
    try {
      const receipt = await applyApprovedPatchToSavedFolder(
        token,
        userId,
        projectId,
        task,
      );
      setSuccessData({
        projectId,
        message: `Patch applied and snapshot ${receipt.snapshot_id.slice(0, 8)} uploaded.`,
      });
      setLoading(true);
      setReload((previous) => previous + 1);
    } catch (error) {
      setErrorData({
        projectId,
        message: error instanceof Error ? error.message : "Could not apply this patch safely.",
      });
    } finally {
      setApplyingTaskId(null);
      setBusyTaskId(null);
    }
  };


  if (!projectId) {
    return null;
  }


  return (
    <section className="mb-6 rounded-panel border border-app-line bg-app-panel p-4 shadow-panel sm:p-5">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <ListTodo
            size={18}
            className="mt-0.5 shrink-0 text-app-accent"
            aria-hidden="true"
          />

          <div>
            <h2 className="text-sm font-bold text-app-text">
              Active project review tasks
            </h2>

            <p className="mt-1 text-xs text-app-muted">
              Tasks from your selected snapshot.
              Approval permits planning only—no model
              call or file edit starts automatically.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={showHistory}
            disabled={loading}
            onClick={() => {
              setLoading(true);
              setShowHistory((previous) => !previous);
            }}
            className="btn text-xs disabled:opacity-50"
          >
            <History size={14} aria-hidden="true" />
            {showHistory ? "Current tasks" : "Show history"}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setErrorData(null);
              setLoading(true);
              setReload((previous) => previous + 1);
            }}
            className="btn text-xs disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>


      {/* Error */}
      {error && (
        <p
          role="alert"
          className="mt-3 text-xs text-status-red"
        >
          {error}
        </p>
      )}

      {successData?.projectId === projectId && (
        <p role="status" className="mt-3 text-xs text-status-green">
          {successData.message}
        </p>
      )}


      {/* Loading */}
      {loading && (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 text-xs text-app-muted"
        >
          <LoaderCircle
            size={14}
            className="animate-spin"
          />

          Loading project tasks...
        </p>
      )}


      {/* Empty state */}
      {!loading && !error && tasks.length === 0 && (
        <p className="mt-4 rounded-lg border border-app-line bg-app-panel2 p-3 text-xs text-app-muted">
          No saved findings yet.{" "}

          <Link
            to="/investigation"
            className="text-app-accent hover:underline"
          >
            Open Investigation
          </Link>{" "}

          to review suggestions.
        </p>
      )}


      {/* Task list */}
      {tasks.length > 0 && (
        <div className="mt-4 space-y-2">
          {tasks.map((task) => (
            <article
              key={task.id}
              className="rounded-lg border border-app-line bg-app-panel2 p-3 sm:p-4"
            >

              {/* Task details */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="wrap-break-words text-xs font-semibold text-app-text">
                    {task.title}
                  </h3>

                  <p className="mt-1 wrap-break-words font-mono text-2xs text-app-accent">
                    {task.path}
                  </p>
                </div>

                <span className="rounded-md border border-app-line px-2 py-1 text-micro capitalize text-app-muted">
                  {task.status === "proposed"
                    ? task.is_current_snapshot
                      ? "Needs approval"
                      : "Outdated snapshot"
                    : task.status}
                </span>
              </div>


              {/* Explanation */}
              <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-app-muted">
                {task.explanation}
              </p>


              {/* Approval actions */}
              {task.status === "proposed" && task.is_current_snapshot && (
                <div className="mt-3 flex flex-wrap items-center gap-2">

                  <button
                    type="button"
                    disabled={
                      busyTaskId !== null ||
                      task.planning_status === "planning"
                    }
                    onClick={() =>
                      void decide(task, "approved")
                    }
                    className="btn btn-primary text-xs disabled:opacity-50"
                  >
                    <CheckCircle2
                      size={14}
                      aria-hidden="true"
                    />

                    Approve for planning
                  </button>

                  <button
                    type="button"
                    disabled={busyTaskId !== null}
                    onClick={() =>
                      void decide(task, "dismissed")
                    }
                    className="btn text-xs disabled:opacity-50"
                  >
                    <XCircle
                      size={14}
                      aria-hidden="true"
                    />

                    Dismiss
                  </button>

                </div>
              )}

              {task.status === "approved" && task.is_current_snapshot && !task.plan && (
                <div className="mt-3">
                  <button
                    type="button"
                    disabled={busyTaskId !== null}
                    onClick={() => void createPlan(task)}
                    className="btn btn-primary text-xs disabled:opacity-50"
                  >
                    {busyTaskId === task.id ||
                    task.planning_status === "planning" ? (
                      <LoaderCircle
                        size={14}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <FileText size={14} aria-hidden="true" />
                    )}

                    {busyTaskId === task.id ||
                    task.planning_status === "planning"
                      ? "Creating plan..."
                      : task.planning_status === "failed"
                        ? "Retry plan creation"
                        : "Create implementation plan"}
                  </button>

                  <p className="mt-2 text-micro text-app-dim">
                    This makes one request to your configured AI provider.
                    It cannot edit files or execute code.
                  </p>

                  {task.planning_error && (
                    <p className="mt-2 text-xs text-status-red">
                      {task.planning_error}
                    </p>
                  )}
                </div>
              )}

              {task.plan && (
                <div className="mt-4 rounded-lg border border-app-line bg-app-panel p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-app-text">
                      Implementation plan
                    </h4>
                    <span className="text-micro capitalize text-app-muted">
                      {task.plan.complexity} complexity
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-app-muted">
                    {task.plan.objective}
                  </p>

                  <ol className="mt-3 space-y-2">
                    {task.plan.steps.map((step) => (
                      <li
                        key={step.step_number}
                        className="text-xs text-app-muted"
                      >
                        <span className="font-semibold text-app-text">
                          {step.step_number}. {step.title}
                        </span>
                        <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                          {step.description}
                        </p>
                        {step.candidate_files_to_inspect.length > 0 && (
                          <p className="mt-1 wrap-break-words font-mono text-micro text-app-accent">
                            {step.candidate_files_to_inspect.join(", ")}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {task.plan && task.is_current_snapshot &&
                task.plan_decision === "pending" && (
                <div className="mt-3 rounded-lg border border-status-amber-line bg-status-amber-bg p-3">
                  <p className="text-xs font-semibold text-status-amber">
                    Implementation plan awaiting approval
                  </p>
                  <p className="mt-1 text-2xs text-app-muted">
                    Inspect the saved plan before making an explicit decision.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={busyTaskId !== null}
                      onClick={() => void decidePlan(task, "approved")}
                      className="btn btn-primary text-xs">Approve plan</button>
                    <button type="button" disabled={busyTaskId !== null}
                      onClick={() => void decidePlan(task, "rejected")}
                      className="btn text-xs">Reject plan</button>
                  </div>
                </div>
              )}

              {task.plan && task.plan_decision === "rejected" && (
                <p className="mt-3 text-xs text-status-amber">
                  This implementation plan was rejected; patch generation is disabled.
                </p>
              )}

              {task.plan && task.plan_decision === "approved" &&
               task.is_current_snapshot && !task.patch && (
                <div className="mt-3">
                  <button
                    type="button"
                    disabled={
                      busyTaskId !== null ||
                      task.patch_status === "generating"
                    }
                    onClick={() => void createPatch(task)}
                    className="btn btn-primary text-xs disabled:opacity-50"
                  >
                    {busyTaskId === task.id ||
                    task.patch_status === "generating" ? (
                      <LoaderCircle
                        size={14}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <GitCompareArrows size={14} aria-hidden="true" />
                    )}

                    {busyTaskId === task.id ||
                    task.patch_status === "generating"
                      ? "Creating proposal..."
                      : task.patch_status === "failed"
                        ? "Retry patch proposal"
                        : "Create patch proposal"}
                  </button>

                  <p className="mt-2 text-micro text-app-dim">
                    This makes one AI request and creates a reviewable diff.
                    It does not modify your project files.
                  </p>

                  {task.patch_error && (
                    <p className="mt-2 text-xs text-status-red">
                      {task.patch_error}
                    </p>
                  )}
                </div>
              )}

              {task.patch && (
                <div className="mt-4 overflow-hidden rounded-lg border border-app-line bg-app-panel">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-app-line p-3">
                    <div>
                      <h4 className="text-xs font-semibold text-app-text">
                        Patch proposal
                      </h4>
                      <p className="mt-1 text-xs text-app-muted">
                        {task.patch.summary}
                      </p>
                    </div>
                    <span className="rounded-md border border-app-line px-2 py-1 text-micro capitalize text-app-muted">
                      {task.patch_status}
                    </span>
                  </div>

                  <pre className="max-h-96 overflow-auto whitespace-pre p-3 text-micro leading-relaxed text-app-muted">
                    <code>{task.patch.diff}</code>
                  </pre>

                  {task.patch_status === "ready" && task.is_current_snapshot && (
                    <div className="flex flex-wrap gap-2 border-t border-app-line p-3">
                      <button
                        type="button"
                        disabled={busyTaskId !== null}
                        onClick={() => void decidePatch(task, "approved")}
                        className="btn btn-primary text-xs disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} aria-hidden="true" />
                        Approve proposal
                      </button>

                      <button
                        type="button"
                        disabled={busyTaskId !== null}
                        onClick={() => void decidePatch(task, "rejected")}
                        className="btn text-xs disabled:opacity-50"
                      >
                        <XCircle size={14} aria-hidden="true" />
                        Reject proposal
                      </button>

                      <p className="w-full text-micro text-app-dim">
                        Approval records your decision only. No files are applied.
                      </p>
                    </div>
                  )}

                  {task.patch_status === "approved" && task.is_current_snapshot && (
                    <div className="flex flex-wrap gap-2 border-t border-app-line p-3">
                      <button
                        type="button"
                        disabled={busyTaskId !== null}
                        onClick={() => void applyPatch(task)}
                        className="btn btn-primary text-xs disabled:opacity-50"
                      >
                        {applyingTaskId === task.id ? (
                          <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
                        ) : (
                          <FilePenLine size={14} aria-hidden="true" />
                        )}
                        {applyingTaskId === task.id
                          ? "Verifying and applying..."
                          : "Apply to local folder"}
                      </button>

                      <button
                        type="button"
                        disabled={busyTaskId !== null}
                        onClick={() => void downloadPatch(task)}
                        className="btn text-xs disabled:opacity-50"
                      >
                        {busyTaskId === task.id && applyingTaskId !== task.id ? (
                          <LoaderCircle
                            size={14}
                            className="animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Download size={14} aria-hidden="true" />
                        )}
                        {busyTaskId === task.id && applyingTaskId !== task.id
                          ? "Preparing export..."
                          : "Download approved .diff"}
                      </button>

                      <p className="w-full text-micro text-app-dim">
                        Local apply requires the exact connected folder and explicit browser write access.
                        ForgePath revalidates hashes, writes one existing file, then uploads a new snapshot.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!task.is_current_snapshot && (
                <p className="mt-3 rounded-md border border-app-line bg-app-panel px-3 py-2 text-micro text-app-dim">
                  Historical task from an older snapshot. Actions are disabled.
                </p>
              )}

            </article>
          ))}
        </div>
      )}

      {taskData?.hasMore && tasks.length > 0 && (
        <button
          type="button"
          disabled={loading || loadingMore}
          onClick={() => void loadMore()}
          className="btn mt-4 text-xs disabled:opacity-50"
        >
          {loadingMore
            ? "Loading more..."
            : "Load more tasks"}
        </button>
      )}

    </section>
  );
};


export default ProjectReviewTasksPanel;

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";

import {
  decideProjectReviewTask,
  decideProjectReviewTaskPatch,
  type ProjectReviewTask,
} from "../../Api/ProjectReviewTasks";
import {
  decideProjectPlan,
  getProjectWorkflows,
  type ProjectWorkflow,
} from "../../Api/ProjectWorkflows";
import { useAuthStore } from "../../store/useAuthStore";

type View = "runs" | "approvals";
type Decision = "approved" | "dismissed" | "rejected";
type PendingConfirmation = { item: ProjectWorkflow; decision: Decision };

const PER_PAGE = 30;
const friendlyStage = (stage: string) => stage.replaceAll("_", " ");

const ProjectWorkflowQueueContent = ({ mode, token, userId }: {
  mode: View;
  token: string;
  userId: string;
}) => {
  const [data, setData] = useState<{
    userId: string;
    items: ProjectWorkflow[];
    total: number;
    nextOffset: number;
  } | null>(null);
  const [refreshId, setRefreshId] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setBusy(true);
      setError("");
      try {
        const response = await getProjectWorkflows(
          token, 0, PER_PAGE, mode === "approvals",
        );
        if (!active) return;
        setData({
          userId,
          items: response.items,
          total: response.total,
          nextOffset: response.items.length,
        });
      } catch {
        if (active) {
          setData(null);
          setError("Could not load uploaded-project workflows.");
        }
      } finally {
        if (active) setBusy(false);
      }
    });
    return () => { active = false; };
  }, [token, userId, mode, refreshId]);

  const items = data?.userId === userId ? data.items : [];

  const reload = () => {
    setNotice("");
    setPending(null);
    setRefreshId((value) => value + 1);
  };

  const loadMore = async () => {
    if (!data || busy || loadingMore || data.userId !== userId ||
        data.nextOffset >= data.total) return;
    setLoadingMore(true);
    try {
      const response = await getProjectWorkflows(
        token, data.nextOffset, PER_PAGE, mode === "approvals",
      );
      if (useAuthStore.getState().user?.id !== userId) return;
      setData((before) => {
        if (!before || before.userId !== userId ||
            before.nextOffset !== data.nextOffset) return before;
        const existing = new Set(before.items.map((item) => item.task.id));
        return {
          userId,
          total: response.total,
          nextOffset: before.nextOffset + response.items.length,
          items: [
            ...before.items,
            ...response.items.filter((item) => !existing.has(item.task.id)),
          ],
        };
      });
    } catch {
      setError("Could not load more project workflows.");
    } finally {
      setLoadingMore(false);
    }
  };

  const submitDecision = async () => {
    if (!pending || busy || !pending.item.task.is_current_snapshot) return;
    const { item, decision } = pending;
    setPending(null);
    setBusy(true);
    setError("");
    try {
      const task = item.task;
      let updated: ProjectReviewTask;
      if (item.pending_decision === "finding" &&
          (decision === "approved" || decision === "dismissed")) {
        updated = await decideProjectReviewTask(token, task.project_id, task.id, decision);
      } else if (item.pending_decision === "plan" &&
                 (decision === "approved" || decision === "rejected")) {
        updated = await decideProjectPlan(token, task.project_id, task, decision);
      } else if (item.pending_decision === "patch" &&
                 (decision === "approved" || decision === "rejected")) {
        updated = await decideProjectReviewTaskPatch(
          token, task.project_id, task, decision,
        );
      } else {
        throw new Error("Decision does not match the current checkpoint.");
      }
      if (useAuthStore.getState().user?.id !== userId) return;
      setNotice(`Saved ${decision} decision for ${updated.title}. No files were modified.`);
      setRefreshId((value) => value + 1);
    } catch {
      setError("Decision was not saved. The snapshot or checkpoint may have changed.");
      setBusy(false);
    }
  };

  return (
    <section className="rounded-panel border border-app-line bg-app-panel p-4 shadow-panel sm:p-5"
      aria-label={mode === "approvals" ? "Uploaded project approvals" : "Uploaded project workflows"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-app-text">
            {mode === "approvals" ? "Uploaded project approvals" : "Uploaded project workflows"}
          </h2>
          <p className="mt-1 text-xs text-app-muted">
            {mode === "approvals"
              ? "Snapshot-pinned human decisions across your private projects."
              : "Project task history, separate from legacy filesystem agent runs."}
          </p>
        </div>
        <button className="btn text-xs" type="button" onClick={reload} disabled={busy}>
          <RefreshCw size={14} className={busy ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && <p role="alert" className="mt-3 text-xs text-status-red">{error}</p>}
      {notice && <p role="status" className="mt-3 text-xs text-status-green">{notice}</p>}
      {busy && !data && <p className="mt-3 text-xs text-app-muted">Loading project workflows...</p>}
      {!busy && data && !items.length && (
        <p className="mt-4 text-xs text-app-muted">
          {mode === "approvals" ? "No pending uploaded-project decisions." :
            "No uploaded-project tasks found."}
        </p>
      )}

      <div className="mt-3 space-y-2">
        {items.map((item) => {
          const task = item.task;
          const open = expanded === task.id;
          const checkpoint = item.pending_decision;
          return (
            <article key={task.id} className="rounded-lg border border-app-line bg-app-panel2 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-app-text">{task.title}</p>
                  <p className="mt-1 text-micro text-app-muted">{item.project_name} · {task.path}</p>
                </div>
                <span className="rounded-md border border-app-line px-2 py-1 text-micro capitalize text-app-muted">
                  {task.is_current_snapshot ? friendlyStage(item.stage) : "Outdated snapshot"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-md border border-app-line px-2 py-1 text-micro capitalize text-app-muted">
                  Finding: {task.status}
                </span>
                <span className="rounded-md border border-app-line px-2 py-1 text-micro capitalize text-app-muted">
                  Plan: {task.plan_decision ?? task.planning_status.replaceAll("_", " ")}
                </span>
                <span className="rounded-md border border-app-line px-2 py-1 text-micro capitalize text-app-muted">
                  Patch: {task.patch_status.replaceAll("_", " ")}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="btn text-xs"
                  onClick={() => setExpanded(open ? null : task.id)}>
                  {open ? "Hide details" : "Inspect checkpoint"}
                </button>
                {mode === "runs" && <Link className="btn text-xs" to="/tasks">Open Tasks</Link>}
              </div>
              {open && (
                <div className="mt-3 space-y-3 border-t border-app-line pt-3 text-xs text-app-muted">
                  <p className="whitespace-pre-wrap">{task.explanation}</p>
                  <p><strong className="text-app-text">Evidence:</strong> {task.evidence}</p>
                  {task.plan && (
                    <div className="rounded-md border border-app-line p-3">
                      <h3 className="font-semibold text-app-text">Saved implementation plan</h3>
                      <p className="mt-2">{task.plan.objective}</p>
                      <ol className="mt-2 list-decimal space-y-2 pl-4">
                        {task.plan.steps.map((step) => (
                          <li key={step.step_number}>
                            <strong className="text-app-text">{step.title}</strong> — {step.description}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {task.patch && (
                    <div className="rounded-md border border-app-line p-3">
                      <h3 className="font-semibold text-app-text">Patch proposal</h3>
                      <p className="mt-2">{task.patch.summary}</p>
                      <pre className="mt-2 max-h-72 overflow-auto whitespace-pre bg-app-bg p-3 font-mono text-2xs">
                        {task.patch.diff}
                      </pre>
                    </div>
                  )}
                  <p className="text-micro text-app-dim">ID: {task.id} · Snapshot: {task.snapshot_id}</p>
                </div>
              )}
              {mode === "approvals" && checkpoint && task.is_current_snapshot && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-app-line pt-3">
                  <span className="text-2xs capitalize text-status-amber">
                    {checkpoint} approval required
                  </span>
                  <button type="button" className="btn btn-primary text-xs"
                    title={!open ? "Inspect the checkpoint before approving" : undefined}
                    onClick={() => setPending({ item, decision: "approved" })}
                    disabled={busy || !open || (checkpoint === "patch" && !task.patch?.diff)}>
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button type="button" className="btn text-xs" disabled={busy || !open}
                    title={!open ? "Inspect the checkpoint before deciding" : undefined}
                    onClick={() => setPending({
                      item,
                      decision: checkpoint === "finding" ? "dismissed" : "rejected",
                    })}>
                    <XCircle size={14} /> {checkpoint === "finding" ? "Dismiss" : "Reject"}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {data && data.nextOffset < data.total && (
        <button className="btn mt-3 text-xs" type="button" disabled={busy || loadingMore}
          onClick={() => void loadMore()}>
          {loadingMore ? "Loading..." : "Load more project workflows"}
        </button>
      )}

      {pending && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-app-bg/90 p-4">
          <div role="alertdialog" aria-modal="true" aria-labelledby="project-decision-title"
            className="w-full max-w-md rounded-panel border border-app-line bg-app-panel p-5 shadow-panel">
            <h3 id="project-decision-title" className="text-sm font-bold">
              Confirm {pending.decision} {pending.item.pending_decision} decision
            </h3>
            <p className="mt-3 text-xs text-app-muted">
              Task: {pending.item.task.title}. This records a decision only; it does not
              generate AI output, execute commands, or modify source files.
            </p>
            <p className="mt-2 text-micro text-app-dim">
              Snapshot: {pending.item.task.snapshot_id}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn" onClick={() => setPending(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={busy}
                onClick={() => void submitDecision()}>Confirm decision</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

const ProjectWorkflowQueue = ({ mode }: { mode: View }) => {
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.user?.id);
  if (!token || !userId) return null;
  return <ProjectWorkflowQueueContent key={`${userId}:${mode}`}
    mode={mode} token={token} userId={userId} />;
};

export default ProjectWorkflowQueue;

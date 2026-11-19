import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  CheckCircle2,
  ListTodo,
  LoaderCircle,
  XCircle,
} from "lucide-react";

import {
  decideProjectReviewTask,
  getProjectReviewTasks,
  type ProjectReviewTask,
} from "../../Api/ProjectReviewTasks";

import { useActiveProjectId } from "../../store/useActiveProjectId";
import { useAuthStore } from "../../store/useAuthStore";


const ProjectReviewTasksPanel = () => {
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.user?.id);
  const projectId = useActiveProjectId();

  const [taskData, setTaskData] = useState<{
    userId: string;
    projectId: string;
    items: ProjectReviewTask[];
  } | null>(null);

  const tasks =
    token &&
    taskData?.userId === userId &&
    taskData?.projectId === projectId
      ? taskData.items
      : [];

  const [loading, setLoading] = useState(true);

  const [busyTaskId, setBusyTaskId] =
    useState<string | null>(null);

  const [errorData, setErrorData] = useState<{
    projectId: string;
    message: string;
  } | null>(null);

  const error =
    errorData?.projectId === projectId
      ? errorData.message
      : "";

  const [reload, setReload] = useState(0);


  useEffect(() => {
    if (!token || !userId || !projectId) {
      return;
    }

    let cancelled = false;

    void getProjectReviewTasks(token, projectId)
      .then((response) => {
        if (!cancelled) {
          setTaskData({
            userId,
            projectId,
            items: response.items,
          });

          setErrorData(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
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
    };
  }, [token, userId, projectId, reload]);


  const decide = async (
    task: ProjectReviewTask,
    status: "approved" | "dismissed",
  ) => {
    if (!token || !projectId || busyTaskId) {
      return;
    }

    setBusyTaskId(task.id);
    setErrorData(null);

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


      {/* Error */}
      {error && (
        <p
          role="alert"
          className="mt-3 text-xs text-status-red"
        >
          {error}
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
                    ? "Needs approval"
                    : task.status}
                </span>
              </div>


              {/* Explanation */}
              <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-app-muted">
                {task.explanation}
              </p>


              {/* Approval actions */}
              {task.status === "proposed" && (
                <div className="mt-3 flex flex-wrap items-center gap-2">

                  <button
                    type="button"
                    disabled={busyTaskId !== null}
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

            </article>
          ))}
        </div>
      )}

    </section>
  );
};


export default ProjectReviewTasksPanel;
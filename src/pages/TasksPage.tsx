
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCode2,
  GitPullRequest,
  LayoutList,
  ListFilter,
  ListTodo,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SquareX,
} from "lucide-react";

import {
  getTaskHistory,
  type TaskHistoryItem,
  type WorkflowStatus,
} from "../Api/Tasks";
import { useAuthStore } from "../store/useAuthStore";

type TaskFilter =
  | "all"
  | "approval"
  | "running"
  | "completed"
  | "failed";

type TaskView = "list" | "compact";

const PAGE_SIZE = 20;

const waitingStatuses: WorkflowStatus[] = [
  "awaiting_plan_approval",
  "awaiting_file_selection",
  "awaiting_patch_approval",
  "awaiting_test_approval",
  "awaiting_repair_file_selection",
];

const completedStatuses: WorkflowStatus[] = [
  "completed",
  "completed_without_tests",
];

const failedStatuses: WorkflowStatus[] = [
  "failed",
  "tests_failed",
  "cancelled",
];

function getStatusLabel(status: WorkflowStatus): string {
  if (waitingStatuses.includes(status)) return "Needs approval";
  if (completedStatuses.includes(status)) return "Completed";
  if (status === "running") return "Running";
  if (status === "tests_failed") return "Tests failed";
  if (status === "cancelled") return "Cancelled";
  return "Failed";
}

function getStatusClass(status: WorkflowStatus): string {
  if (waitingStatuses.includes(status)) {
    return "border-status-amber-line bg-status-amber-bg text-status-amber";
  }

  if (completedStatuses.includes(status)) {
    return "border-status-green-line bg-status-green-bg text-status-green";
  }

  if (status === "running") {
    return "border-status-blue-line bg-status-blue-bg text-status-blue";
  }

  return "border-app-line bg-app-panel2 text-status-red";
}

function matchesFilter(
  status: WorkflowStatus,
  filter: TaskFilter,
): boolean {
  switch (filter) {
    case "approval":
      return waitingStatuses.includes(status);
    case "running":
      return status === "running";
    case "completed":
      return completedStatuses.includes(status);
    case "failed":
      return failedStatuses.includes(status);
    default:
      return true;
  }
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getSourceName(workspaceRoot: string): string {
  const parts = workspaceRoot
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean);

  return parts.at(-1) || "Unspecified source";
}

function getTaskTitle(description: string): string {
  const title = description.trim().split("\n")[0];

  if (!title) return "Untitled task";

  return title.length > 110
    ? `${title.slice(0, 107)}...`
    : title;
}

function getProgress(task: TaskHistoryItem): number {
  if (task.total_steps <= 0) return 0;

  return Math.min(
    100,
    Math.round(
      (task.completed_steps / task.total_steps) * 100,
    ),
  );
}

const lifecycle = [
  {
    title: "Understand",
    description:
      "Inspect the codebase, retrieve evidence, and produce findings.",
    icon: Search,
  },
  {
    title: "Propose",
    description:
      "Generate a reviewable patch with a clear explanation.",
    icon: FileCode2,
  },
  {
    title: "Verify",
    description:
      "Run supported tests in an isolated execution environment.",
    icon: ShieldCheck,
  },
  {
    title: "Approve",
    description:
      "Require human approval before consequential code changes.",
    icon: GitPullRequest,
  },
];

export default function TasksPage() {
  const token = useAuthStore((state) => state.token);

  const [tasks, setTasks] = useState<TaskHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [view, setView] = useState<TaskView>("list");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      return;
    }

    getTaskHistory(token, 0, PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;

        setTasks(result.items);
        setTotal(result.total);
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;

        setError("Could not load your task history.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  const visibleTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      if (!matchesFilter(task.status, filter)) {
        return false;
      }

      if (!query) return true;

      return [
        task.task_description,
        getSourceName(task.workspace_root),
        task.thread_id,
        task.status,
        getStatusLabel(task.status),
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [tasks, filter, searchQuery]);

  const canLoadMore = tasks.length < total;

  async function loadMore() {
    if (!token || loadingMore || !canLoadMore) return;

    setLoadingMore(true);

    try {
      const result = await getTaskHistory(
        token,
        tasks.length,
        PAGE_SIZE,
      );

      setTasks((current) => {
        const ids = new Set(
          current.map((task) => task.thread_id),
        );

        return [
          ...current,
          ...result.items.filter(
            (task) => !ids.has(task.thread_id),
          ),
        ];
      });

      setTotal(result.total);
      setError(null);
    } catch {
      setError("Could not load more tasks.");
    } finally {
      setLoadingMore(false);
    }
  }

  function refreshTasks() {
    setLoading(true);
    setError(null);
    setTasks([]);
    setReloadKey((current) => current + 1);
  }

  return (
    <div className="min-w-0 bg-app-bg px-3 py-5 text-app-text sm:px-6 sm:py-7 lg:px-9">
      <div className="mx-auto max-w-app">
        {/* Heading */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-1.5 text-micro font-bold uppercase tracking-eyebrow text-app-dim">
              WORKSPACE / TASKS
            </div>

            <h1 className="font-manrope text-[28px] font-extrabold tracking-tight text-app-text">
              Tasks
            </h1>

            <p className="mt-1 max-w-170 text-[13px] leading-relaxed text-app-muted">
              Every coding request gets its own run history,
              evidence, patch proposals, and approval checkpoints.
            </p>
          </div>

          <button
            type="button"
            disabled
            title="Creating tasks requires a connected project source"
            className="btn btn-primary shrink-0 self-start disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={15} aria-hidden="true" />
            New task
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="flex min-h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-app-line bg-app-panel px-3 text-app-muted sm:w-75">
            <Search
              className="h-4 w-4 shrink-0"
              aria-hidden="true"
            />

            <input
              type="search"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              placeholder="Search tasks, source or ID..."
              aria-label="Search tasks"
              className="min-w-0 flex-1 border-none bg-transparent py-2 text-xs text-app-text outline-none placeholder:text-app-dim"
            />
          </label>

          <label className="relative flex min-h-9 items-center gap-2 rounded-lg border border-app-line bg-app-panel px-3 text-xs text-app-muted">
            <ListFilter
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />

            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as TaskFilter)
              }
              aria-label="Filter task status"
              className="max-w-full cursor-pointer bg-transparent text-xs text-app-text outline-none"
            >
              <option value="all">All statuses</option>
              <option value="approval">Needs approval</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </label>

          <div className="flex items-center gap-1 rounded-lg border border-app-line bg-app-bg p-1">
            <button
              type="button"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={`flex min-h-8 items-center gap-1.5 rounded-md px-3 text-xs transition-colors ${
                view === "list"
                  ? "bg-app-line text-app-text"
                  : "text-app-muted hover:text-app-text"
              }`}
            >
              <LayoutList size={14} aria-hidden="true" />
              List
            </button>

            <button
              type="button"
              aria-pressed={view === "compact"}
              onClick={() => setView("compact")}
              className={`flex min-h-8 items-center gap-1.5 rounded-md px-3 text-xs transition-colors ${
                view === "compact"
                  ? "bg-app-line text-app-text"
                  : "text-app-muted hover:text-app-text"
              }`}
            >
              <SquareX size={14} aria-hidden="true" />
              Compact
            </button>
          </div>

          <button
            type="button"
            onClick={refreshTasks}
            disabled={!token || loading}
            aria-label="Refresh tasks"
            title="Refresh tasks"
            className="flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-app-line bg-app-panel text-app-muted transition-colors hover:text-app-text disabled:opacity-50"
          >
            <RefreshCw size={15} aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
          <section className="min-w-0 overflow-hidden rounded-panel border border-app-line bg-app-panel shadow-panel">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-app-line px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-[13px] font-bold">
                  All tasks{" "}
                  <span className="font-normal text-app-muted">
                    ({total})
                  </span>
                </h2>

                <p className="mt-1 text-2xs text-app-muted">
                  Newest activity first
                </p>
              </div>

              <span className="rounded-md border border-app-line px-2 py-1 text-micro text-app-muted">
                Workflow history
              </span>
            </header>

            {!token ? (
              <div className="px-5 py-12 text-center">
                <AlertCircle
                  size={27}
                  className="mx-auto text-app-muted"
                />

                <p className="mt-3 text-sm font-semibold">
                  Sign in to view tasks
                </p>
              </div>
            ) : loading ? (
              <div
                role="status"
                className="flex items-center justify-center gap-2 px-5 py-16 text-xs text-app-muted"
              >
                <LoaderCircle
                  size={17}
                  className="animate-spin"
                />
                Loading tasks...
              </div>
            ) : error && tasks.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <AlertCircle
                  size={26}
                  className="mx-auto text-status-red"
                />

                <h3 className="mt-3 text-sm font-semibold">
                  Unable to load tasks
                </h3>

                <p className="mt-2 text-xs text-app-muted">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={refreshTasks}
                  className="btn mt-4"
                >
                  Try again
                </button>
              </div>
            ) : visibleTasks.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-app-line bg-app-panel3">
                  <ListTodo
                    size={22}
                    className="text-app-accent"
                    aria-hidden="true"
                  />
                </span>

                <h3 className="mt-4 text-sm font-semibold">
                  {total === 0
                    ? "No tasks yet"
                    : "No tasks match your filters"}
                </h3>

                <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-app-muted">
                  {total === 0
                    ? "Your agent workflow history will appear here when you start using connected codebases."
                    : "Try a different search term or status filter."}
                </p>
              </div>
            ) : (
              <div
                className={
                  view === "compact"
                    ? "grid gap-3 p-3 sm:grid-cols-2"
                    : "divide-y divide-app-line-soft"
                }
              >
                {visibleTasks.map((task) => {
                  const compact = view === "compact";
                  const progress = getProgress(task);
                  const isComplete =
                    completedStatuses.includes(task.status);

                  return (
                    <article
                      key={task.thread_id}
                      className={
                        compact
                          ? "min-w-0 rounded-lg border border-app-line bg-app-panel2 p-3"
                          : "flex min-w-0 gap-3 px-4 py-4 transition-colors hover:bg-app-row-hover sm:px-5"
                      }
                    >
                      <div
                        className={
                          compact
                            ? "mb-3 grid h-9 w-9 place-items-center rounded-lg border border-app-line bg-app-panel3"
                            : "grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-app-line bg-app-panel3"
                        }
                      >
                        {isComplete ? (
                          <CheckCircle2
                            size={17}
                            className="text-status-green"
                            aria-hidden="true"
                          />
                        ) : waitingStatuses.includes(task.status) ? (
                          <Clock3
                            size={17}
                            className="text-status-amber"
                            aria-hidden="true"
                          />
                        ) : (
                          <ListTodo
                            size={17}
                            className="text-app-muted"
                            aria-hidden="true"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div
                          className={`flex gap-3 ${
                            compact
                              ? "flex-col"
                              : "flex-col sm:flex-row sm:items-start sm:justify-between"
                          }`}
                        >
                          <div className="min-w-0">
                            <h3 className="wrap-break-words text-xs font-semibold leading-relaxed text-app-text">
                              {getTaskTitle(
                                task.task_description,
                              )}
                            </h3>

                            <p className="mt-1 line-clamp-2 text-2xs leading-relaxed text-app-muted">
                              {task.message ||
                                "Agent workflow"}
                            </p>
                          </div>

                          <span
                            className={`inline-flex shrink-0 self-start items-center gap-1.5 rounded-md border px-2 py-1 text-micro ${getStatusClass(
                              task.status,
                            )}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {getStatusLabel(task.status)}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-micro text-app-dim">
                          <span
                            title={task.thread_id}
                            className="font-mono"
                          >
                            {task.thread_id.slice(0, 8)}
                          </span>

                          <span className="flex min-w-0 items-center gap-1">
                            <FileCode2
                              size={12}
                              aria-hidden="true"
                            />
                            <span className="max-w-36 truncate">
                              {getSourceName(
                                task.workspace_root,
                              )}
                            </span>
                          </span>

                          <span>
                            {formatDate(task.updated_at)}
                          </span>
                        </div>

                        {task.total_steps > 0 && (
                          <div className="mt-3">
                            <div className="mb-1.5 flex justify-between text-micro text-app-muted">
                              <span>
                                {task.completed_steps} of{" "}
                                {task.total_steps} steps
                              </span>
                              <span>{progress}%</span>
                            </div>

                            <div className="h-1 overflow-hidden rounded-full bg-app-line">
                              <div
                                className="h-full rounded-full bg-app-accent"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {error && tasks.length > 0 && (
              <p
                role="alert"
                className="border-t border-app-line px-5 py-3 text-xs text-status-red"
              >
                {error}
              </p>
            )}

            {!loading && tasks.length > 0 && (
              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-app-line px-4 py-3 sm:px-5">
                <span className="text-2xs text-app-muted">
                  Loaded {tasks.length} of {total} workflows.
                  Search and filters apply to loaded records.
                </span>

                {canLoadMore && (
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={loadMore}
                    className="btn"
                  >
                    {loadingMore
                      ? "Loading..."
                      : "Load more"}
                    <ChevronRight
                      size={14}
                      aria-hidden="true"
                    />
                  </button>
                )}
              </footer>
            )}
          </section>

          <aside className="min-w-0 overflow-hidden rounded-panel border border-app-line bg-app-panel shadow-panel">
            <div className="border-b border-app-line px-5 py-4">
              <h2 className="text-[13px] font-bold text-app-text">
                Task lifecycle
              </h2>
            </div>

            <div className="px-5 py-2">
              {lifecycle.map((step, index) => {
                const Icon = step.icon;

                return (
                  <div
                    key={step.title}
                    className={`flex gap-3 py-4 ${
                      index < lifecycle.length - 1
                        ? "border-b border-app-line-faint"
                        : ""
                    }`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-app-icon-bg2 text-app-accent">
                      <Icon
                        size={16}
                        aria-hidden="true"
                      />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-micro text-app-dim">
                          {index + 1}
                        </span>

                        <h3 className="text-2xs font-semibold text-app-text">
                          {step.title}
                        </h3>

                        {index === lifecycle.length - 1 && (
                          <Check
                            size={13}
                            className="text-app-accent"
                            aria-hidden="true"
                          />
                        )}
                      </div>

                      <p className="mt-1 text-2xs leading-relaxed text-app-muted">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>

        <p className="mt-4 text-2xs text-app-dim">
          New task creation will be enabled when an authorized
          project source is available. Existing workflow
          history is retrieved from ForgePath's backend.
        </p>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FolderGit2,
  ListChecks,
  LoaderCircle,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
} from "lucide-react";

import PageHeader from "../components/home/PageHeader";
import CalloutBanner from "../components/home/CalloutBanner";
import { getTaskHistory, type TaskHistoryItem } from "../Api/Tasks";
import {
  getOverviewTestSummary,
  type OverviewTestSummary,
} from "../Api/Overview";
import { useAuthStore } from "../store/useAuthStore";

const HISTORY_LIMIT = 50;

const waitingStatuses = new Set([
  "awaiting_plan_approval",
  "awaiting_file_selection",
  "awaiting_patch_approval",
  "awaiting_test_approval",
  "awaiting_repair_file_selection",
]);

const finishedStatuses = new Set([
  "completed",
  "completed_without_tests",
  "failed",
  "tests_failed",
  "cancelled",
]);

interface OverviewState {
  tasks: TaskHistoryItem[];
  total: number;
  summary: OverviewTestSummary | null;
  tasksError: boolean;
  summaryError: boolean;
}

const isActive = (task: TaskHistoryItem): boolean => {
  return !finishedStatuses.has(task.status);
}

const getStatus = (task: TaskHistoryItem) => {
  if (waitingStatuses.has(task.status)) {
    return {
      label: "Needs action",
      className:
        "border-status-amber-line bg-status-amber-bg text-status-amber",
    };
  }

  if (
    task.status === "completed" ||
    task.status === "completed_without_tests"
  ) {
    return {
      label: "Completed",
      className:
        "border-status-green-line bg-status-green-bg text-status-green",
    };
  }

  if (task.status === "running") {
    return {
      label: "Running",
      className:
        "border-status-blue-line bg-status-blue-bg text-status-blue",
    };
  }

  return {
    label: task.status === "cancelled" ? "Cancelled" : "Failed",
    className: "border-app-line bg-app-panel2 text-status-red",
  };
}

const getSourceName = (path: string): string => {
  return (
    path.replaceAll("\\", "/").split("/").filter(Boolean).at(-1) ||
    "Unspecified source"
  );
}

const getTitle = (description: string): string => {
  return description.trim().split("\n")[0] || "Untitled task";
}

const formatDate = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const MetricCard = ({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Activity;
}) => {
  return (
    <article className="min-w-0 rounded-panel border border-app-line bg-app-panel p-4 shadow-panel sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xs text-app-muted sm:text-xs">
          {label}
        </span>

        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-app-mark-bg text-app-mark-text">
          <Icon size={15} aria-hidden="true" />
        </span>
      </div>

      <div className="my-2 font-manrope text-2xl font-extrabold tracking-tight text-app-text sm:text-3xl">
        {value}
      </div>

      <p className="text-micro leading-relaxed text-app-muted">
        {detail}
      </p>
    </article>
  );
}

const RecentTasks = ({
  tasks,
  error,
  loading,
}: {
  tasks: TaskHistoryItem[];
  error: boolean;
  loading: boolean;
}) => {
  return (
    <article className="min-w-0 overflow-hidden rounded-panel border border-app-line bg-app-panel shadow-panel">
      <div className="flex items-center justify-between gap-3 border-b border-app-line px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-xs font-bold text-app-text">
            Recent tasks
          </h2>

          <p className="mt-1 text-2xs text-app-muted">
            Your latest investigations and patch runs
          </p>
        </div>

        <Link
          to="/tasks"
          className="btn shrink-0 px-2.5 py-1.5 text-2xs"
        >
          View all
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>

      {loading ? (
        <div
          role="status"
          className="flex items-center justify-center gap-2 p-10 text-xs text-app-muted"
        >
          <LoaderCircle size={16} className="animate-spin" />
          Loading tasks...
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-6 text-xs text-status-red">
          <AlertCircle size={16} />
          Unable to load recent tasks.
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-10 text-center">
          <ListChecks
            className="mx-auto text-app-muted"
            size={24}
          />
          <p className="mt-3 text-xs font-semibold text-app-text">
            No tasks yet
          </p>
          <p className="mt-1 text-2xs text-app-muted">
            Your workflows will appear here.
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-145 border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-app-line text-micro font-bold uppercase tracking-wider text-app-table-head">
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Repository</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-app-line-soft">
              {tasks.map((task) => {
                const status = getStatus(task);

                return (
                  <tr
                    key={task.thread_id}
                    className="transition-colors hover:bg-app-row-hover"
                  >
                    <td className="px-4 py-3.5">
                      <Link
                        to="/runs"
                        className="block max-w-62.5 truncate font-semibold text-app-text hover:text-app-accent"
                        title={task.task_description}
                      >
                        {getTitle(task.task_description)}
                      </Link>

                      <span className="block font-mono text-micro text-app-muted">
                        {task.thread_id.slice(0, 8)}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-2xs text-app-mono-text">
                      {getSourceName(task.workspace_root)}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-micro ${status.className}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {status.label}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5 text-2xs text-app-muted">
                      {formatDate(task.updated_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

const AgentActivity = ({
  tasks,
  error,
  loading,
}: {
  tasks: TaskHistoryItem[];
  error: boolean;
  loading: boolean;
}) => {
  return (
    <article className="min-w-0 overflow-hidden rounded-panel border border-app-line bg-app-panel shadow-panel">
      <div className="flex items-center justify-between gap-3 border-b border-app-line px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-xs font-bold text-app-text">
            Agent activity
          </h2>

          <p className="mt-1 text-2xs text-app-muted">
            Latest workflow updates
          </p>
        </div>

        <span className="rounded-md border border-app-line px-2 py-1 text-micro text-app-muted">
          History
        </span>
      </div>

      <div className="divide-y divide-app-line-faint px-4 sm:px-5">
        {loading ? (
          <p className="py-8 text-center text-xs text-app-muted">
            Loading activity...
          </p>
        ) : error ? (
          <p className="py-8 text-center text-xs text-status-red">
            Unable to load workflow activity.
          </p>
        ) : tasks.length === 0 ? (
          <p className="py-8 text-center text-xs text-app-muted">
            No workflow activity yet.
          </p>
        ) : (
          tasks.map((task) => {
            const status = getStatus(task);

            return (
              <div
                key={task.thread_id}
                className="flex min-w-0 items-start gap-3 py-3.5"
              >
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-app-icon-bg2 text-status-green">
                  {task.status === "running" ? (
                    <Activity size={14} />
                  ) : task.status === "completed" ||
                    task.status === "completed_without_tests" ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <Clock3 size={14} />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <Link
                    to="/runs"
                    className="block wrap-break-words text-xs font-semibold text-app-text hover:text-app-accent"
                  >
                    {getTitle(task.task_description)}
                  </Link>

                  <p className="mt-1 text-2xs text-app-muted">
                    {getSourceName(task.workspace_root)}
                    {" · "}
                    {status.label}
                  </p>

                  <time className="mt-1 block text-micro text-app-dim2">
                    {formatDate(task.updated_at)}
                  </time>
                </div>
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}

const QuickNavigation = () => {
  const items = [
    {
      title: "Ask your codebase",
      description:
        "Search indexed source, retrieve evidence, and get grounded explanations.",
      action: "Code intelligence not connected yet",
      icon: Search,
    },
    {
      title: "Review a patch",
      description:
        "Inspect precise changes, file context, and risk before approval.",
      action: "Patch review not connected yet",
      icon: ArrowLeftRight,
    },
    {
      title: "Inspect test results",
      description:
        "Explore sandbox output, failures, and bounded retry history.",
      action: "Open agent runs",
      icon: ListChecks,
      path: "/runs",
    },
  ];

  return (
    <section className="mt-6">
      <div className="mb-3">
        <h2 className="font-manrope text-base font-bold tracking-tight text-app-text sm:text-lg">
          Continue building
        </h2>

        <p className="mt-1 text-2xs text-app-muted">
          Jump into an engineering surface
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;

          const content = (
            <>
              <span className="mb-3 grid h-9 w-9 place-items-center rounded-lg border border-app-line bg-app-icon-bg">
                <Icon size={16} aria-hidden="true" />
              </span>

              <strong className="mb-1 block text-xs font-semibold">
                {item.title}
              </strong>

              <p className="min-h-10 text-2xs leading-relaxed text-app-muted">
                {item.description}
              </p>

              <span className="mt-4 inline-flex items-center gap-1 text-2xs font-bold text-app-accent">
                {item.action}
                {item.path && (
                  <ArrowUpRight size={13} aria-hidden="true" />
                )}
              </span>
            </>
          );

          const className =
            "block min-w-0 rounded-xl border border-app-line " +
            "bg-app-panel p-4 text-left text-app-text " +
            "transition-colors";

          return item.path ? (
            <Link
              key={item.title}
              to={item.path}
              className={`${className} hover:border-app-accent-line-hover hover:bg-app-accent-soft-hover`}
            >
              {content}
            </Link>
          ) : (
            <div
              key={item.title}
              className={className}
              aria-label={`${item.title}: coming later`}
            >
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function HomePage() {
  const token = useAuthStore((state) => state.token);

  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(Boolean(token));

  const [data, setData] = useState<OverviewState>({
    tasks: [],
    total: 0,
    summary: null,
    tasksError: false,
    summaryError: false,
  });

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function loadOverview() {
      let tasks: TaskHistoryItem[] = [];
      let total = 0;
      let tasksError = false;
      let summaryError = false;
      let summary: OverviewTestSummary | null = null;

      try {
        const result = await getTaskHistory(
          token!,
          0,
          HISTORY_LIMIT,
        );
        tasks = result.items;
        total = result.total;
      } catch {
        tasksError = true;
      }

      try {
        summary = await getOverviewTestSummary(token!);
      } catch {
        summaryError = true;
      }

      if (!cancelled) {
        setData({
          tasks,
          total,
          summary,
          tasksError,
          summaryError,
        });
        setLoading(false);
      }
    }

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  const isLoading = Boolean(token) && loading;

  const activeCount = data.tasks.filter(isActive).length;
  const recentTasks = data.tasks.slice(0, 4);
  const recentActivity = data.tasks.slice(0, 4);

  const testRuns = data.summary;
  const testPassRate =
    testRuns && testRuns.total_test_runs > 0
      ? Math.round(
          (testRuns.passed_test_runs /
            testRuns.total_test_runs) *
            100,
        )
      : null;

  const refreshOverview = () => {
    setLoading(true);
    setReloadKey((current) => current + 1);
  }

  return (
    <div className="min-h-full min-w-0 bg-app-bg font-sans text-app-text">
      <div className="mx-auto max-w-app px-4 pb-16 pt-6 sm:px-6 sm:pt-8 md:px-9">
        <PageHeader />

        <CalloutBanner title="Safe by default.">
          Runs are designed to execute in isolation;
          patches remain proposals until you approve them.
          ForgePath currently supports configured local workspaces.
        </CalloutBanner>

        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={refreshOverview}
            disabled={!token || isLoading}
            className="btn gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={isLoading ? "animate-spin" : ""}
              aria-hidden="true"
            />
            Refresh overview
          </button>
        </div>

        <section
          aria-label="Engineering summary"
          className="mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-4"
        >
          <MetricCard
            label="Active tasks"
            value={
              !token || data.tasksError
                ? "—"
                : isLoading
                  ? "…"
                  : String(activeCount).padStart(2, "0")
            }
            detail={
              !token
                ? "Sign in for your workflow activity"
                : data.tasksError
                  ? "Workflow data unavailable"
                  : `Among ${data.tasks.length} recent workflows`
            }
            icon={TrendingUp}
          />

          <MetricCard
            label="Indexed codebases"
            value="—"
            detail="Index statistics not connected yet"
            icon={FolderGit2}
          />

          <MetricCard
            label="Open findings"
            value="—"
            detail="Findings statistics not connected yet"
            icon={Target}
          />

          <MetricCard
            label="Test runs"
            value={
              !token || data.summaryError
                ? "—"
                : isLoading
                  ? "…"
                  : testRuns
                    ? `${testRuns.passed_test_runs}/${testRuns.total_test_runs}`
                    : "—"
            }
            detail={
              !token
                ? "Sign in to view test runs"
                : data.summaryError
                  ? "Test-run metrics unavailable"
                  : testPassRate === null
                    ? "No recorded test runs"
                    : `${testPassRate}% of recorded runs passed`
            }
            icon={ClipboardCheck}
          />
        </section>

        <div className="mb-6 grid grid-cols-1 items-start gap-3.5 lg:grid-cols-home">
          <RecentTasks
            tasks={recentTasks}
            error={data.tasksError}
            loading={isLoading}
          />

          <AgentActivity
            tasks={recentActivity}
            error={data.tasksError}
            loading={isLoading}
          />
        </div>

        <QuickNavigation />

        {!token && (
          <p className="mt-5 text-2xs text-app-dim">
            Sign in to see your private workflow history
            and execution statistics.
          </p>
        )}

        {token && data.total > HISTORY_LIMIT && (
          <p className="mt-5 text-2xs text-app-dim">
            The dashboard summarizes the latest{" "}
            {HISTORY_LIMIT} workflows. Open Tasks to
            browse additional records.
          </p>
        )}
      </div>
    </div>
  );
}
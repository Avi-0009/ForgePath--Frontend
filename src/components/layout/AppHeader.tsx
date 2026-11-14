import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  Bell,
  BookOpen,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  LoaderCircle,
  Menu,
  RefreshCw,
  ShieldAlert,
  X,
} from "lucide-react";

import {
  getTaskHistory,
  type TaskHistoryItem,
  type WorkflowStatus,
} from "../../Api/Tasks";
import { useAuthStore } from "../../store/useAuthStore";

interface AppHeaderProps {
  onOpenMenu: () => void;
}

type Panel = "help" | "notifications" | null;

const routeTitles: Record<string, string> = {
  "/": "Overview",
  "/tasks": "Tasks",
  "/repositories": "Repositories",
  "/runs": "Agent runs",
  "/intel": "Code intelligence",
  "/investigation": "Investigation",
  "/patch-review": "Patch review",
  "/test-lab": "Test lab",
  "/approvals": "Approvals",
  "/settings": "Settings",
  "/profile": "Profile",
  "/workspace": "Workspace",
};

const pendingStatuses = new Set<WorkflowStatus>([
  "awaiting_plan_approval",
  "awaiting_file_selection",
  "awaiting_patch_approval",
  "awaiting_test_approval",
  "awaiting_repair_file_selection",
]);

const helpContent: Record<
  string,
  { description: string; path: string; action: string }
> = {
  "/": {
    description:
      "Overview summarizes your recent workflows, activity, and available engineering tools.",
    path: "/tasks",
    action: "Explore tasks",
  },
  "/tasks": {
    description:
      "Tasks shows the history and status of your agent workflows.",
    path: "/runs",
    action: "Inspect agent runs",
  },
  "/repositories": {
    description:
      "Repository ingestion is not connected yet. Local workspaces must first be configured on the backend.",
    path: "/intel",
    action: "Explore code intelligence",
  },
  "/runs": {
    description:
      "Agent Runs displays saved workflow state, execution progress, and pending human checkpoints.",
    path: "/approvals",
    action: "Review checkpoints",
  },
  "/intel": {
    description:
      "Search source code indexed by your backend. Results include file paths and line ranges.",
    path: "/investigation",
    action: "Open Investigation",
  },
  "/investigation": {
    description:
      "Review AI-generated findings against an allowed source file. Verify evidence before generating patches.",
    path: "/patch-review",
    action: "Review proposed changes",
  },
  "/patch-review": {
    description:
      "Compare proposed changes in unified or split view. Inspect the diff before any approval.",
    path: "/approvals",
    action: "Open Approvals",
  },
  "/test-lab": {
    description:
      "Run predefined test commands with explicit consent and inspect recorded test output.",
    path: "/runs",
    action: "View agent runs",
  },
  "/approvals": {
    description:
      "Inspect a workflow checkpoint before approving, rejecting, or cancelling an action.",
    path: "/runs",
    action: "Inspect workflows",
  },
  "/settings": {
    description:
      "Review configuration and execution boundaries. Per-user AI provider settings are not yet connected.",
    path: "/profile",
    action: "View profile",
  },
  "/profile": {
    description:
      "Manage your account details and email verification.",
    path: "/settings",
    action: "Open settings",
  },
};

const getPageTitle = (pathname: string) =>
  routeTitles[pathname] ?? "ForgePath";

const getCheckpointLabel = (status: WorkflowStatus) => {
  switch (status) {
    case "awaiting_plan_approval":
      return "Plan approval";
    case "awaiting_file_selection":
      return "File selection";
    case "awaiting_repair_file_selection":
      return "Repair file selection";
    case "awaiting_patch_approval":
      return "Patch approval";
    case "awaiting_test_approval":
      return "Test approval";
    default:
      return "Workflow update";
  }
};

const AppHeader = ({ onOpenMenu }: AppHeaderProps) => {
  const location = useLocation();
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated,
  );

  const [openPanel, setOpenPanel] = useState<Panel>(null);
  const [pending, setPending] = useState<TaskHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const controlsRef = useRef<HTMLDivElement>(null);

  const pageTitle = getPageTitle(location.pathname);
  const help = helpContent[location.pathname];

  useEffect(() => {
    setOpenPanel(null);
  }, [location.pathname]);

  useEffect(() => {
    if (!openPanel) return;

    const onOutsideClick = (event: PointerEvent) => {
      if (
        controlsRef.current &&
        !controlsRef.current.contains(event.target as Node)
      ) {
        setOpenPanel(null);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenPanel(null);
      }
    };

    document.addEventListener("pointerdown", onOutsideClick);
    window.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("pointerdown", onOutsideClick);
      window.removeEventListener("keydown", onEscape);
    };
  }, [openPanel]);

  useEffect(() => {
    if (
      openPanel !== "notifications" ||
      !isAuthenticated ||
      !token
    ) {
      return;
    }

    let cancelled = false;

    const loadNotifications = async () => {
      setLoading(true);
      setNotificationError("");

      try {
        const response = await getTaskHistory(token, 0, 100);

        if (cancelled) return;

        setPending(
          response.items.filter((item) =>
            pendingStatuses.has(item.status),
          ),
        );
        setHasMore(
          response.total > response.offset + response.items.length,
        );
      } catch {
        if (!cancelled) {
          setNotificationError(
            "Unable to load workflow notifications.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [openPanel, isAuthenticated, token, refreshKey]);

  const togglePanel = (panel: Exclude<Panel, null>) => {
    setOpenPanel((current) =>
      current === panel ? null : panel,
    );
  };

  const refreshNotifications = () => {
    setRefreshKey((value) => value + 1);
  };

  const controlClass =
    "flex h-9 w-9 shrink-0 items-center justify-center " +
    "rounded-lg border border-app-line bg-transparent " +
    "text-app-muted transition-colors hover:bg-app-btn " +
    "hover:text-app-text focus-visible:outline-2 " +
    "focus-visible:outline-offset-2 " +
    "focus-visible:outline-app-accent";

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center gap-3 border-b border-app-line bg-app-bg px-4 sm:px-6 lg:px-9">
      <button
        type="button"
        aria-label="Open navigation"
        aria-controls="forgepath-sidebar"
        onClick={onOpenMenu}
        className={`${controlClass} md:hidden`}
      >
        <Menu size={18} aria-hidden="true" />
      </button>

      <nav
        aria-label="Breadcrumb"
        className="hidden min-w-0 items-center gap-1.5 text-xs sm:flex"
      >
        <span className="text-app-muted">Workspace</span>
        <span className="text-app-dim">/</span>
        <span
          className="truncate font-semibold text-app-text"
          aria-current="page"
        >
          {pageTitle}
        </span>
      </nav>

      <div className="min-w-0 flex-1" />

      <div
        ref={controlsRef}
        className="relative flex shrink-0 items-center gap-2.5"
      >
        <div className="flex h-8 shrink-0 items-center gap-2 rounded-lg border border-app-line px-2.5 text-2xs text-app-muted sm:px-3">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-app-accent"
          />
          <span className="whitespace-nowrap">
            Running locally
          </span>
        </div>

        <button
          type="button"
          aria-label="Help"
          aria-haspopup="dialog"
          aria-expanded={openPanel === "help"}
          onClick={() => togglePanel("help")}
          className={controlClass}
        >
          <CircleHelp size={17} aria-hidden="true" />
        </button>

        <button
          type="button"
          aria-label="Notifications"
          aria-haspopup="dialog"
          aria-expanded={openPanel === "notifications"}
          onClick={() => togglePanel("notifications")}
          className={controlClass}
        >
          <Bell size={17} aria-hidden="true" />
        </button>

        {openPanel && (
          <section
            role="dialog"
            aria-label={
              openPanel === "help"
                ? "ForgePath help"
                : "Workflow notifications"
            }
            className="absolute right-0 top-full z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-app-line bg-app-panel shadow-panel"
          >
            <div className="flex items-center justify-between gap-2 border-b border-app-line px-4 py-3">
              <div className="flex items-center gap-2">
                {openPanel === "help" ? (
                  <BookOpen
                    size={16}
                    className="text-app-accent"
                  />
                ) : (
                  <Bell size={16} className="text-app-accent" />
                )}
                <h2 className="text-xs font-bold text-app-text">
                  {openPanel === "help"
                    ? "ForgePath help"
                    : "Notifications"}
                </h2>
              </div>

              <div className="flex items-center gap-1">
                {openPanel === "notifications" &&
                  isAuthenticated && (
                    <button
                      type="button"
                      onClick={refreshNotifications}
                      disabled={loading}
                      aria-label="Refresh notifications"
                      title="Refresh notifications"
                      className="rounded-md p-1.5 text-app-muted hover:bg-app-panel3 hover:text-app-text"
                    >
                      <RefreshCw
                        size={14}
                        className={
                          loading ? "animate-spin" : ""
                        }
                      />
                    </button>
                  )}

                <button
                  type="button"
                  aria-label="Close panel"
                  onClick={() => setOpenPanel(null)}
                  className="rounded-md p-1.5 text-app-muted hover:bg-app-panel3 hover:text-app-text"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {openPanel === "help" ? (
              <div className="space-y-4 p-4">
                <div>
                  <p className="text-micro font-bold uppercase tracking-eyebrow text-app-dim">
                    CURRENT PAGE
                  </p>
                  <h3 className="mt-1 text-sm font-semibold">
                    {pageTitle}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-app-muted">
                    {help?.description ??
                      "Use the navigation menu to explore ForgePath's engineering tools."}
                  </p>
                </div>

                {help && (
                  <Link
                    to={help.path}
                    onClick={() => setOpenPanel(null)}
                    className="flex items-center justify-between gap-3 rounded-lg border border-app-line bg-app-panel2 px-3 py-2.5 text-xs font-semibold text-app-accent hover:bg-app-panel3"
                  >
                    {help.action}
                    <ChevronRight size={15} />
                  </Link>
                )}

                <div className="border-t border-app-line pt-3">
                  <p className="mb-2 text-micro font-bold uppercase tracking-eyebrow text-app-dim">
                    QUICK LINKS
                  </p>
                  <div className="space-y-1">
                    <Link
                      to="/runs"
                      onClick={() => setOpenPanel(null)}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-xs text-app-muted hover:bg-app-panel3 hover:text-app-text"
                    >
                      <Activity size={14} />
                      Agent runs
                    </Link>

                    <Link
                      to="/approvals"
                      onClick={() => setOpenPanel(null)}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-xs text-app-muted hover:bg-app-panel3 hover:text-app-text"
                    >
                      <ClipboardCheck size={14} />
                      Approval checkpoints
                    </Link>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-lg border border-app-line bg-app-panel2 p-3">
                  <ShieldAlert
                    size={16}
                    className="shrink-0 text-status-amber"
                  />
                  <p className="text-2xs leading-relaxed text-app-muted">
                    Review AI-generated findings and proposed
                    patches before allowing execution or writes.
                  </p>
                </div>
              </div>
            ) : !isAuthenticated ? (
              <div className="p-5 text-center">
                <p className="text-xs text-app-muted">
                  Sign in to view your workflow checkpoints.
                </p>
                <Link
                  to="/auth"
                  onClick={() => setOpenPanel(null)}
                  className="btn btn-primary mt-4"
                >
                  Sign in
                </Link>
              </div>
            ) : (
              <>
                <div className="max-h-80 overflow-y-auto">
                  {loading && pending.length === 0 ? (
                    <p className="flex items-center justify-center gap-2 p-7 text-xs text-app-muted">
                      <LoaderCircle
                        size={15}
                        className="animate-spin"
                      />
                      Loading notifications...
                    </p>
                  ) : notificationError ? (
                    <div
                      role="alert"
                      className="p-4 text-xs text-status-amber"
                    >
                      {notificationError}
                    </div>
                  ) : pending.length === 0 ? (
                    <div className="p-7 text-center">
                      <Bell
                        size={22}
                        className="mx-auto text-app-dim"
                      />
                      <p className="mt-3 text-xs font-semibold">
                        No pending checkpoints
                      </p>
                      <p className="mt-1 text-2xs text-app-muted">
                        Workflows requiring approval or file
                        selection will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-app-line-faint">
                      {pending.map((run) => (
                        <Link
                          key={run.thread_id}
                          to="/approvals"
                          onClick={() => setOpenPanel(null)}
                          className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-app-row-hover"
                        >
                          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-status-amber-bg text-status-amber">
                            <ShieldAlert size={16} />
                          </span>

                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold text-app-text">
                              {run.task_description
                                .trim()
                                .split("\n")[0] ||
                                "Untitled workflow"}
                            </span>
                            <span className="mt-1 block text-2xs text-status-amber">
                              {getCheckpointLabel(run.status)}
                            </span>
                            <span className="mt-1 block font-mono text-micro text-app-dim">
                              {run.thread_id.slice(0, 8)}
                            </span>
                          </div>

                          <ChevronRight
                            size={15}
                            className="mt-2 shrink-0 text-app-muted"
                          />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-app-line p-3">
                  <Link
                    to="/approvals"
                    onClick={() => setOpenPanel(null)}
                    className="btn flex w-full items-center justify-center"
                  >
                    View approvals
                    <ChevronRight size={14} />
                  </Link>

                  {hasMore && (
                    <p className="mt-2 text-center text-micro text-app-dim">
                      Showing pending workflows from the latest
                      100 records. Older records are available
                      through Approvals.
                    </p>
                  )}
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
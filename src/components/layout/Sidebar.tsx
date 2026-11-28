
import type { ComponentType } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Activity,
  Beaker,
  CheckSquare,
  FolderGit,
  GitPullRequest,
  LayoutDashboard,
  ListTodo,
  Search,
  Settings,
  ShieldAlert,
} from "lucide-react";

import { useAuthStore } from "../../store/useAuthStore";
import logo from "../../assets/forgepath.svg";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}

interface NavigationItem {
  label: string;
  path: string;
  icon: ComponentType<{
    className?: string;
    "aria-hidden"?: boolean;
  }>;
  count?: number;
}

const workspaceItems: NavigationItem[] = [
  {
    label: "Overview",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Tasks",
    path: "/tasks",
    icon: ListTodo,
    count: 4,
  },
  {
    label: "Repositories",
    path: "/repositories",
    icon: FolderGit,
  },
  {
    label: "Code intelligence",
    path: "/intel",
    icon: Search,
  },
];

const engineeringItems: NavigationItem[] = [
  {
    label: "Agent runs",
    path: "/runs",
    icon: Activity,
  },
  {
    label: "Investigation",
    path: "/investigation",
    icon: ShieldAlert,
  },
  {
    label: "Patch review",
    path: "/patch-review",
    icon: GitPullRequest,
    count: 2,
  },
  {
    label: "Test lab",
    path: "/test-lab",
    icon: Beaker,
  },
  {
    label: "Approvals",
    path: "/approvals",
    icon: CheckSquare,
    count: 1,
  },
];

const systemItems: NavigationItem[] = [
  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
  },
];

const NavigationGroup = ({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: NavigationItem[];
  onNavigate: () => void;
}) => {
  return (
    <div className="space-y-2">
      <h2 className="px-3 text-micro font-bold uppercase tracking-eyebrow text-app-dim">
        {title}
      </h2>

      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onClick={onNavigate}
              className={({ isActive }) =>
                [
                  "flex min-h-11 items-center gap-3",
                  "rounded-lg px-3 py-2 text-xs",
                  "transition-colors",
                  isActive
                    ? "bg-app-panel3 text-app-accent font-semibold"
                    : "text-app-muted hover:bg-app-btn hover:text-app-text",
                ].join(" ")
              }
            >
              <Icon
                className="h-4 w-4 shrink-0"
                aria-hidden={true}
              />

              <span className="min-w-0 flex-1 truncate">
                {item.label}
              </span>

              {/* {item.count !== undefined && (
                <span className="shrink-0 rounded-md bg-app-panel3 px-2 py-0.5 text-micro font-semibold text-app-muted">
                  {item.count}
                </span>
              )} */}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

const Sidebar = ({
  isOpen,
  setIsOpen,
}: SidebarProps) => {
  const navigate = useNavigate();

  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated
  );

  const user = useAuthStore((state) => state.user);

  const closeSidebar = () => setIsOpen(false);

  return (
    <aside
      id={isOpen ? "forgepath-sidebar" : "forgepath-desktop-sidebar"}
      aria-label="Main navigation"
      className={[
        "flex min-h-0 shrink-0 flex-col bg-app-panel",
        isOpen ? "w-full flex-1 overflow-y-auto" : "h-full w-61.5 border-r border-app-line",
      ].join(" ")}
    >
      <div className="shrink-0 px-4 pb-4 pt-6">
        <NavLink
          to="/"
          onClick={closeSidebar}
          className="flex items-center gap-3 px-2"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-app-accent">
            <img
              src={logo}
              alt=""
              className="h-10 w-10"
            />
          </div>

          <div className="min-w-0">
            <strong className="block truncate font-manrope text-lg font-extrabold tracking-tight text-app-text">
              ForgePath
            </strong>

            <span className="block text-micro uppercase tracking-wider text-app-dim">
              Engineering agent
            </span>
          </div>
        </NavLink>

        {isAuthenticated ? (
          <NavLink
            to="/profile"
            onClick={closeSidebar}
            className="mt-6 flex min-h-16 items-center gap-3 rounded-xl border border-app-line bg-app-panel2 p-3 transition-colors hover:border-app-line-hover"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-app-panel3 text-xs font-bold text-app-text">
              {user?.name?.charAt(0)?.toUpperCase() || "F"}
            </span>

            <span className="min-w-0 flex-1">
              <strong className="block truncate text-xs font-semibold text-app-text">
                {user?.name || "Personal workspace"}
              </strong>

              <span className="mt-1 block truncate text-micro text-app-muted">
                Local instance
              </span>
            </span>
          </NavLink>
        ) : (
          <button
            type="button"
            onClick={() => {
              closeSidebar();
              navigate("/auth");
            }}
            className="btn btn-primary mt-6 w-full"
          >
            Sign in to Workspace
          </button>
        )}
      </div>

      <nav aria-label="Primary navigation" className={`space-y-6 px-4 pb-5 pt-2 ${isOpen ? "flex-1" : "min-h-0 flex-1 overflow-y-auto"}`}>
        <NavigationGroup
          title="Workspace"
          items={workspaceItems}
          onNavigate={closeSidebar}
        />

        <NavigationGroup
          title="Engineering"
          items={engineeringItems}
          onNavigate={closeSidebar}
        />

        <NavigationGroup
          title="System"
          items={systemItems}
          onNavigate={closeSidebar}
        />
      </nav>

      <div className="shrink-0 border-t border-app-line p-4">
        <div className="flex items-start gap-2 rounded-xl border border-app-accent/20 bg-app-accent/10 p-3">
          <span
            aria-hidden="true"
            className="mt-1 h-2 w-2 shrink-0 rounded-full bg-app-accent"
          />

          <div className="min-w-0">
            <strong className="block text-xs font-semibold text-app-text">
              Private · local-only
            </strong>

            <p className="mt-1 text-micro leading-relaxed text-app-muted">
              Listening on this device.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

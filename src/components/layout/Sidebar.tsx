import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  TerminalSquare, 
  GitPullRequest, 
  Settings, 
  LogOut, 
  Hammer 
} from "lucide-react";
import { useAuthStore } from '../../store/useAuthStore';

const Sidebar = () => {
  const { user, logout } = useAuthStore();

  const navItems = [
    { name: "Workspace", path: "/", icon: LayoutDashboard },
    { name: "Investigations", path: "/investigations", icon: TerminalSquare },
    { name: "Patch Reviews", path: "/patches", icon: GitPullRequest },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 h-screen bg-app-panel border-r border-app-line flex-col hidden md:flex shrink-0 sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-app-line">
        <div className="w-8 h-8 rounded-xl bg-app-accent text-app-accent-ink grid place-items-center mr-3 shadow-sm">
          <Hammer className="w-4 h-4" />
        </div>
        <span className="font-manrope font-extrabold tracking-tight text-app-text text-lg">
          ForgePath
        </span>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        <div className="text-micro tracking-eyebrow uppercase text-app-dim font-bold mb-4 px-2">
          Menu
        </div>
        
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-app-accent/10 text-app-accent"
                  : "text-app-muted hover:bg-app-btn hover:text-app-text"
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-app-line bg-app-bg/50">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div className="w-9 h-9 rounded-full bg-app-btn border border-app-line flex items-center justify-center text-xs font-bold text-app-text shrink-0">
            {user?.avatar || "FP"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-app-text truncate">
              {user?.name || "Guest Access"}
            </div>
            <div className="text-xs text-app-dim truncate">
              {user?.email || "Read-only mode"}
            </div>
          </div>
        </div>
        
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-app-muted hover:bg-status-red/10 hover:text-status-red transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
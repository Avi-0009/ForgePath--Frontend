import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, ListTodo, FolderGit, Activity, Search,
  ShieldAlert, GitPullRequest, Beaker, CheckSquare,
  Settings, ChevronDown, LogOut, ChevronUp
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import logo from '../../assets/forgepath.svg';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}

const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const closeSidebar = () => {
    setIsOpen(false);
    setIsProfileOpen(false);
  }

  const handleLogout = () => {
    logout();
    closeSidebar();
  };

  const handleLoginRedirect = () => {
    closeSidebar();
    navigate('/auth');
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-72 md:w-64 h-dvh bg-[#141719] border-r border-app-line flex flex-col shrink-0 transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="pt-6 px-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-app-accent text-app-accent-ink grid place-items-center shadow-sm">
            <img src={logo} alt="ForgePath Logo" className="w-10 h-10" />
          </div>
          <div>
            <div className="font-manrope font-extrabold tracking-tight text-app-text text-lg leading-tight">ForgePath</div>
          </div>
        </div>

        {isAuthenticated ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-colors ${
                isProfileOpen
                  ? "border-app-accent/30 bg-[#202528]"
                  : "border-app-line bg-[#1c2124] hover:bg-app-btn hover:border-app-line-hover"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 shrink-0 rounded-lg bg-[#2a3036] border border-app-line flex items-center justify-center text-sm font-bold text-app-accent uppercase">
                  {user?.name?.charAt(0) || "F"}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-app-text leading-tight truncate">
                    {user?.name || "Personal workspace"}
                  </div>
                  <div className="text-xs text-app-dim mt-1 truncate">
                    Local instance
                  </div>
                </div>
              </div>
              {isProfileOpen ? (
                <ChevronUp className="w-4 h-4 text-app-dim shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-app-dim shrink-0" />
              )}
            </button>

            <div
              className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                isProfileOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0 pointer-events-none"
              }`}
            >
              <div className="overflow-hidden">
                <div className="rounded-xl border border-app-line bg-[#191d20] p-1.5 mt-1 shadow-lg">
                  <button
                    type="button"
                    onClick={handleLogout}
                    tabIndex={isProfileOpen ? 0 : -1}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-status-red bg-status-red/5 hover:bg-status-red/15 border border-transparent hover:border-status-red/20 transition-all duration-200"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleLoginRedirect}
            className="w-full btn btn-primary py-3 flex items-center justify-center gap-2"
          >
            Sign in to Workspace
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 overflow-y-auto pb-6 space-y-6">
        <div>
          <div className="text-micro tracking-eyebrow uppercase text-app-dim font-bold mb-2 px-2">Workspace</div>
          <div className="space-y-1">
            <NavLink to="/" onClick={() => setIsOpen(false)} className={({isActive}) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-app-accent/10 text-app-accent" : "text-app-muted hover:bg-app-btn hover:text-app-text"}`}>
              <LayoutDashboard className="w-4 h-4" /> Overview
            </NavLink>
            <NavLink to="/tasks" onClick={() => setIsOpen(false)} className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-app-muted hover:bg-app-btn hover:text-app-text transition-colors">
              <div className="flex items-center gap-3"><ListTodo className="w-4 h-4" /> Tasks</div>
              <span className="bg-app-btn text-app-dim text-xs py-0.5 px-2 rounded-full font-bold">4</span>
            </NavLink>
            <NavLink to="/repos" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-app-muted hover:bg-app-btn hover:text-app-text transition-colors">
              <FolderGit className="w-4 h-4" /> Repositories
            </NavLink>
            <NavLink to="/runs" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-app-muted hover:bg-app-btn hover:text-app-text transition-colors">
              <Activity className="w-4 h-4" /> Agent runs
            </NavLink>
            <NavLink to="/intel" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-app-muted hover:bg-app-btn hover:text-app-text transition-colors">
              <Search className="w-4 h-4" /> Code intelligence
            </NavLink>
          </div>
        </div>

        <div>
          <div className="text-micro tracking-eyebrow uppercase text-app-dim font-bold mb-2 px-2">Engineering</div>
          <div className="space-y-1">
            <NavLink to="/investigation" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-app-muted hover:bg-app-btn hover:text-app-text transition-colors">
              <ShieldAlert className="w-4 h-4" /> Investigation
            </NavLink>
            <NavLink to="/patch-review" onClick={() => setIsOpen(false)} className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-app-muted hover:bg-app-btn hover:text-app-text transition-colors">
              <div className="flex items-center gap-3"><GitPullRequest className="w-4 h-4" /> Patch review</div>
              <span className="bg-app-btn text-app-dim text-xs py-0.5 px-2 rounded-full font-bold">2</span>
            </NavLink>
            <NavLink to="/test-lab" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-app-muted hover:bg-app-btn hover:text-app-text transition-colors">
              <Beaker className="w-4 h-4" /> Test lab
            </NavLink>
            <NavLink to="/approvals" onClick={() => setIsOpen(false)} className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-app-muted hover:bg-app-btn hover:text-app-text transition-colors">
              <div className="flex items-center gap-3"><CheckSquare className="w-4 h-4" /> Approvals</div>
              <span className="bg-app-btn text-app-dim text-xs py-0.5 px-2 rounded-full font-bold">1</span>
            </NavLink>
          </div>
        </div>

        <div>
          <div className="text-micro tracking-eyebrow uppercase text-app-dim font-bold mb-2 px-2">System</div>
          <div className="space-y-1">
            <NavLink to="/settings" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-app-muted hover:bg-app-btn hover:text-app-text transition-colors">
              <Settings className="w-4 h-4" /> Settings
            </NavLink>
          </div>
        </div>
      </nav>

      <div className="p-4 mt-auto shrink-0">
        <div className="p-3 rounded-xl border border-app-accent/20 bg-app-accent/5 flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-app-accent mt-1.5 shrink-0 animate-pulse" />
          <div>
            <div className="text-sm font-bold text-app-text">Private · local-only</div>
            <div className="text-xs text-app-muted mt-0.5 leading-relaxed">
              Listening on this device. No public workspace.
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
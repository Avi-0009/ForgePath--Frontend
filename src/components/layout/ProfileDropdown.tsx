import { useEffect, useRef, useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { User, Settings, LogOut } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { Logout } from "../../Api/Auth";

const ProfileDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: PointerEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [isOpen]);

  const handleLogout = async () => {
    if (isSigningOut) return;

    setIsOpen(false);
    setIsSigningOut(true);

    try {
      await Logout();
    } finally {
      logout();
      setIsSigningOut(false);
    }
  };

  const handleSignIn = () => {
    setIsOpen(false);
    navigate("/auth");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {!isAuthenticated ? (
        <button
          type="button"
          onClick={handleSignIn}
          className="h-10 inline-flex items-center justify-center gap-2 px-3 rounded-lg border border-app-accent/30 bg-app-accent text-app-accent-ink text-sm font-semibold hover:bg-app-accent-hover transition-colors whitespace-nowrap"
        >
          Sign in
        </button>
      ) : (
        <>
          <button
            type="button"
            aria-label="Open profile menu"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((previous) => !previous)}
            className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-colors ${
              isOpen
                ? "bg-app-btn text-app-text border-app-accent/30"
                : "bg-[#1c2124] text-app-muted border-app-line hover:text-app-text hover:bg-app-btn"
            }`}
          >
            <User className="w-4 h-4" />
          </button>

          {isOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-40 rounded-xl border border-app-line bg-[#141719] shadow-panel py-1.5 z-50"
            >
              <NavLink
                to="/profile"
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-app-text hover:bg-[#1c2124] transition-colors"
              >
                <User className="w-4 h-4 text-app-dim" />
                My profile
              </NavLink>
              
              <NavLink
                to="/settings"
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-app-text hover:bg-[#1c2124] transition-colors"
              >
                <Settings className="w-4 h-4 text-app-dim" />
                Settings
              </NavLink>

              <div className="h-px bg-app-line my-1.5 mx-3" />

              <button
                type="button"
                role="menuitem"
                onClick={() => void handleLogout()}
                disabled={isSigningOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-status-red hover:bg-status-red/10 transition-colors disabled:cursor-wait disabled:opacity-60"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                {isSigningOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProfileDropdown;
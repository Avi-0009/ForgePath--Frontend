
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Bell,
  CircleHelp,
  Menu,
} from "lucide-react";

interface AppHeaderProps {
  onOpenMenu: () => void;
}

type OpenPanel = "help" | "notifications" | null;

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

function getPageTitle(pathname: string): string {
  const exact = routeTitles[pathname];

  if (exact) {
    return exact;
  }

  const match = Object.keys(routeTitles)
    .filter((path) => path !== "/")
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname.startsWith(`${path}/`));

  return match ? routeTitles[match] : "ForgePath";
}

export default function AppHeader({
  onOpenMenu,
}: AppHeaderProps) {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  const [openPanel, setOpenPanel] =
    useState<OpenPanel>(null);

  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpenPanel(null);
  }, [location.pathname]);

  useEffect(() => {
    if (openPanel === null) return;

    const handleOutsideClick = (event: PointerEvent) => {
      if (
        controlsRef.current &&
        !controlsRef.current.contains(event.target as Node)
      ) {
        setOpenPanel(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenPanel(null);
      }
    };

    document.addEventListener(
      "pointerdown",
      handleOutsideClick
    );
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsideClick
      );
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [openPanel]);

  const togglePanel = (
    panel: Exclude<OpenPanel, null>
  ) => {
    setOpenPanel((current) =>
      current === panel ? null : panel
    );
  };

  const controlClass =
    "flex h-9 w-9 shrink-0 items-center justify-center " +
    "rounded-lg border border-app-line bg-transparent " +
    "text-app-muted transition-colors " +
    "hover:bg-app-btn hover:text-app-text " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 " +
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
        <Menu className="h-[18px] w-[18px]" />
      </button>

      {/* Desktop breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="hidden min-w-0 items-center gap-1.5 text-xs sm:flex"
      >
        <span className="text-app-muted">
          Workspace
        </span>

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
        <div className="flex h-8 shrink-0 items-center gap-2 rounded-lg border border-app-line px-2.5 text-[11px] text-app-muted sm:px-3">
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
          <CircleHelp className="h-4 w-4" />
        </button>

        <button
          type="button"
          aria-label="Notifications"
          aria-haspopup="dialog"
          aria-expanded={openPanel === "notifications"}
          onClick={() => togglePanel("notifications")}
          className={controlClass}
        >
          <Bell className="h-4 w-4" />
        </button>

        {openPanel !== null && (
          <section
            role="dialog"
            aria-label={
              openPanel === "help"
                ? "Help"
                : "Notifications"
            }
            className="absolute right-0 top-full z-50 mt-3 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-app-line bg-app-panel p-4 shadow-panel"
          >
            {openPanel === "help" ? (
              <>
                <h2 className="font-semibold text-app-text">
                  ForgePath help
                </h2>

                <p className="mt-2 text-xs leading-relaxed text-app-muted">
                  Use the navigation menu to move between
                  your engineering tools and settings.
                </p>
              </>
            ) : (
              <>
                <h2 className="font-semibold text-app-text">
                  Notifications
                </h2>

                <p className="mt-2 text-xs leading-relaxed text-app-muted">
                  Notifications are not connected to the
                  backend yet.
                </p>
              </>
            )}

            <button
              type="button"
              onClick={() => setOpenPanel(null)}
              className="mt-3 text-xs font-semibold text-app-accent hover:underline"
            >
              Close
            </button>
          </section>
        )}
      </div>
    </header>
  );
}
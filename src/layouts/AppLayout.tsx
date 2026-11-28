import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import AppHeader from "../components/layout/AppHeader";
import NativeModal from "../components/accessibility/NativeModal";

const AppLayout = () => {
  const location = useLocation();
  const [sidebarOpenPath, setSidebarOpenPath] = useState<string | null>(null);
  const isSidebarOpen = sidebarOpenPath === location.pathname;
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);
  const setIsSidebarOpen = (open: boolean) => setSidebarOpenPath(open ? location.pathname : null);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 48rem)");
    const closeOnDesktop = () => { if (desktop.matches) setSidebarOpenPath(null); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (previousPath.current === location.pathname) return;
    previousPath.current = location.pathname;
    const main = mainRef.current;
    if (main) {
      main.scrollTop = 0;
      main.focus({ preventScroll: true });
    }
  }, [location.pathname]);

  return (
    <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-app-bg text-app-text">
      <a className="forgepath-skip-link" href="#forgepath-main-content" onClick={(event) => {
        event.preventDefault(); mainRef.current?.focus();
      }}>Skip to main content</a>
      <div className="hidden h-full shrink-0 md:flex">
        <Sidebar isOpen={false} setIsOpen={setIsSidebarOpen} />
      </div>
      {isSidebarOpen && (
        <NativeModal drawer label="Main navigation" onCancel={() => setIsSidebarOpen(false)} returnFocusId="forgepath-open-navigation">
          <div className="flex h-full min-h-0 flex-col bg-app-panel">
            <div className="flex shrink-0 items-center justify-between border-b border-app-line px-4 py-2">
              <span className="text-sm font-semibold">Navigation</span>
              <button type="button" data-safe-focus aria-label="Close navigation" className="btn" onClick={() => setIsSidebarOpen(false)}><X size={18} aria-hidden="true" /></button>
            </div>
            <Sidebar isOpen={true} setIsOpen={setIsSidebarOpen} />
          </div>
        </NativeModal>
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppHeader key={location.pathname} onOpenMenu={() => setIsSidebarOpen(true)} isMenuOpen={isSidebarOpen} />
        <main ref={mainRef} id="forgepath-main-content" tabIndex={-1} className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;

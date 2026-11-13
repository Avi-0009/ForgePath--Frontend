
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "../components/layout/Sidebar";
import AppHeader from "../components/layout/AppHeader";

export default function AppLayout() {
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] =
    useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isSidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isSidebarOpen]);

  return (
    <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-app-bg text-app-text">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-app-bg/80 md:hidden"
        />
      )}

      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppHeader
          onOpenMenu={() => setIsSidebarOpen(true)}
        />

        <main
          id="forgepath-main-content"
          className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
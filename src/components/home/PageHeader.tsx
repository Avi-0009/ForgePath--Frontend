import { FolderGit2, LogIn, Plus } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuthStore } from "../../store/useAuthStore";

export default function PageHeader() {
  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated,
  );

  const user = useAuthStore((state) => state.user);

  const currentDate = new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();

  return (
    <section className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
      <div className="min-w-0 max-w-3xl flex-1">
        <p className="mb-1 text-micro font-bold uppercase tracking-eyebrow text-app-dim">
          {currentDate} · PERSONAL WORKSPACE
        </p>

        <h1 className="mb-1.5 font-manrope text-2xl font-extrabold tracking-tight text-app-text sm:text-3xl">
          {isAuthenticated && user?.name
            ? `Welcome back, ${user.name.split(" ")[0]}.`
            : "Your engineering command center."}
        </h1>

        <p className="max-w-2xl text-xs leading-relaxed text-app-muted sm:text-sm">
          Understand a codebase, investigate a bug, and
          review every proposed change before anything
          touches your repository.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 self-start">
        {isAuthenticated ? (
          <>
            <Link
              to="/repositories"
              className="btn btn-ghost"
            >
              <FolderGit2 size={15} aria-hidden="true" />
              Repositories
            </Link>

            <button
              type="button"
              disabled
              title="Task creation will be enabled after project source integration"
              className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={15} aria-hidden="true" />
              Create task
            </button>
          </>
        ) : (
          <Link to="/auth" className="btn btn-primary">
            <LogIn size={15} aria-hidden="true" />
            Sign in to Workspace
          </Link>
        )}
      </div>
    </section>
  );
}
import { useState } from "react";
import {
  AlertTriangle,
  Database,
  FileCode2,
  FolderGit2,
  Info,
  LockKeyhole,
  Plus,
  Search,
  ShieldBan,
} from "lucide-react";

const exclusions = [
  {
    title: "Secrets and environment files",
    description: ".env, *.pem, *.key, credentials.*",
    icon: LockKeyhole,
  },
  {
    title: "Generated artifacts",
    description: "node_modules, dist, build, vendor, .git",
    icon: ShieldBan,
  },
  {
    title: "Large and binary files",
    description:
      "Large or unsupported binary files are excluded according to backend indexing rules.",
    icon: AlertTriangle,
  },
];

const summary = [
  {
    label: "Connected repositories",
    value: "—",
    detail: "Repository connections not enabled",
    icon: FolderGit2,
  },
  {
    label: "Files indexed",
    value: "—",
    detail: "No repository index available",
    icon: FileCode2,
  },
  {
    label: "Code chunks",
    value: "—",
    detail: "No indexed chunks available",
    icon: Database,
  },
  {
    label: "Index freshness",
    value: "—",
    detail: "No index to evaluate",
    icon: Search,
  },
];

export default function RepositoriesPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-w-0 p-4 md:p-8">
      <div className="mx-auto max-w-app space-y-5">
        {/* Page heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="mb-1 text-micro font-bold uppercase tracking-eyebrow text-app-dim">
              WORKSPACE / SOURCE CONTROL
            </p>

            <h1 className="mb-1.5 font-manrope text-2xl font-extrabold tracking-tight text-app-text md:text-[28px]">
              Repositories
            </h1>

            <p className="max-w-170 text-[13px] leading-relaxed text-app-muted">
              Manage connected codebases, inspect indexing health,
              and review source-access safeguards.
            </p>
          </div>

          <button
            type="button"
            disabled
            title="Repository connections will be enabled in a future update"
            className="btn btn-primary shrink-0 gap-2 self-start disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add repository
          </button>
        </div>

        {/* Read-only information */}
        <div className="flex items-start gap-3 rounded-callout border border-status-blue-line bg-status-blue-bg p-3.5 text-xs text-status-blue">
          <Info
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />

          <div>
            <strong className="font-semibold">
              Read-only until you approve.
            </strong>{" "}
            Repository access is intended for code inspection.
            Writing changes requires separate, explicit approval.
          </div>
        </div>

        {/* Prototype summary cards — no fabricated metrics */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summary.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.label}
                className="min-w-0 rounded-panel border border-app-line bg-app-panel p-4 shadow-panel"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-2xs text-app-muted">
                    {item.label}
                  </span>

                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-app-mark-bg text-app-mark-text">
                    <Icon
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  </span>
                </div>

                <div className="mt-3 font-manrope text-[26px] font-extrabold leading-none text-app-text">
                  {item.value}
                </div>

                <p className="mt-2 text-micro leading-relaxed text-app-muted">
                  {item.detail}
                </p>
              </article>
            );
          })}
        </div>

        {/* Repositories table */}
        <article className="overflow-hidden rounded-panel border border-app-line bg-app-panel shadow-panel">
          <div className="flex flex-col gap-3 border-b border-app-line p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[13px] font-bold text-app-text">
                Your codebases
              </h2>

              <p className="mt-1 text-2xs text-app-muted">
                Index health and repository source configuration
              </p>
            </div>

            <label className="flex min-h-9 w-full items-center gap-2 rounded-lg border border-app-line bg-app-panel2 px-3 text-app-muted sm:w-60">
              <Search
                className="h-4 w-4 shrink-0"
                aria-hidden="true"
              />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
                placeholder="Filter repositories..."
                aria-label="Filter repositories"
                className="min-w-0 flex-1 border-0 bg-transparent text-xs text-app-text outline-none placeholder:text-app-dim"
              />
            </label>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-162.5 border-collapse text-left">
              <thead>
                <tr className="border-b border-app-line">
                  {[
                    "Repository",
                    "Source",
                    "Files",
                    "Index status",
                    "Last indexed",
                  ].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-4 py-3 text-micro font-bold uppercase tracking-wider text-app-table-head"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <span className="grid h-12 w-12 place-items-center rounded-xl border border-app-line bg-app-panel3">
                        <FolderGit2
                          className="h-5 w-5 text-app-accent"
                          aria-hidden="true"
                        />
                      </span>

                      <h3 className="mt-4 text-sm font-semibold text-app-text">
                        {searchQuery.trim()
                          ? "No repositories to search"
                          : "No repositories connected"}
                      </h3>

                      <p className="mt-2 text-xs leading-relaxed text-app-muted">
                        {searchQuery.trim()
                          ? "Repository connections are not enabled yet, so there are no records to filter."
                          : "Repository connections and indexing will be available when the ingestion feature is implemented."}
                      </p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-home">
          <article className="overflow-hidden rounded-panel border border-app-line bg-app-panel shadow-panel">
            <div className="border-b border-app-line px-5 py-4">
              <h2 className="text-[13px] font-bold text-app-text">
                Index exclusions
              </h2>
            </div>

            <div className="p-5">
              {exclusions.map((item, index) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className={[
                      "flex items-start gap-3 py-3",
                      index !== exclusions.length - 1
                        ? "border-b border-app-line-faint"
                        : "",
                    ].join(" ")}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-app-icon-bg2 text-app-muted">
                      <Icon
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                    </span>

                    <div className="min-w-0">
                      <h3 className="text-2xs font-semibold text-app-text">
                        {item.title}
                      </h3>

                      <p className="mt-1 wrap-break-words text-2xs leading-relaxed text-app-muted">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="overflow-hidden rounded-panel border border-app-line bg-app-panel shadow-panel">
            <div className="border-b border-app-line px-5 py-4">
              <h2 className="text-[13px] font-bold text-app-text">
                Index health
              </h2>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between gap-3 text-2xs">
                <span className="text-app-muted">
                  Eligible source-file coverage
                </span>

                <span className="font-semibold text-app-text">
                  N/A
                </span>
              </div>

              <div
                role="progressbar"
                aria-label="Index coverage unavailable"
                aria-valuetext="Not available"
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-app-line"
              />

              <p className="mt-4 text-2xs leading-relaxed text-app-muted">
                Index coverage will appear here after a
                repository is connected and indexed.
              </p>

              <div className="mt-5 rounded-lg border border-app-line bg-app-panel2 p-3">
                <p className="text-2xs font-semibold text-app-text">
                  Indexing not configured
                </p>

                <p className="mt-1 text-micro leading-relaxed text-app-muted">
                  No repository files have been made available
                  through this page.
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
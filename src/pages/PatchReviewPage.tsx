import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileCode2,
  FileDiff,
  GitPullRequest,
  Info,
  ShieldCheck,
  X,
} from "lucide-react";

import { useWorkspaceStore } from "../store/useWorkspaceStore";
import type { CodePatchResponse } from "../Api/Review";

type DiffView = "unified" | "split";
type LineKind = "context" | "add" | "remove" | "meta";

interface DiffLine {
  kind: LineKind;
  text: string;
  oldNumber: number | null;
  newNumber: number | null;
}

interface SplitRow {
  left: DiffLine | null;
  right: DiffLine | null;
  meta?: string;
}

const panelClass =
  "min-w-0 overflow-hidden rounded-panel border " +
  "border-app-line bg-app-panel shadow-panel";

const lineClasses: Record<LineKind, string> = {
  context: "bg-app-bg text-app-mono-text",
  add: "bg-status-green-bg text-status-green",
  remove: "bg-status-red/10 text-status-red",
  meta: "bg-app-panel2 text-app-muted",
};

const parseDiff = (diff: string): DiffLine[] => {
  const lines = diff.split(/\r?\n/);
  const result: DiffLine[] = [];

  let oldNumber = 0;
  let newNumber = 0;
  let inHunk = false;

  for (const text of lines) {
    const match = text.match(
      /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/,
    );

    if (match) {
      oldNumber = Number(match[1]);
      newNumber = Number(match[2]);
      inHunk = true;

      result.push({
        kind: "meta",
        text,
        oldNumber: null,
        newNumber: null,
      });
      continue;
    }

    if (
      !inHunk ||
      text.startsWith("diff --git ") ||
      text.startsWith("index ") ||
      text.startsWith("--- ") ||
      text.startsWith("+++ ") ||
      text.startsWith("\\ No newline at end of file")
    ) {
      result.push({
        kind: "meta",
        text,
        oldNumber: null,
        newNumber: null,
      });
      continue;
    }

    if (text.startsWith("+")) {
      result.push({
        kind: "add",
        text,
        oldNumber: null,
        newNumber: newNumber++,
      });
    } else if (text.startsWith("-")) {
      result.push({
        kind: "remove",
        text,
        oldNumber: oldNumber++,
        newNumber: null,
      });
    } else if (text.startsWith(" ") || text === "") {
      result.push({
        kind: "context",
        text,
        oldNumber: oldNumber++,
        newNumber: newNumber++,
      });
    } else {
      result.push({
        kind: "meta",
        text,
        oldNumber: null,
        newNumber: null,
      });
    }
  }

  return result;
};

const toSplitRows = (lines: DiffLine[]): SplitRow[] => {
  const rows: SplitRow[] = [];
  let index = 0;

  while (index < lines.length) {
    const current = lines[index];

    if (current.kind === "meta") {
      rows.push({
        left: null,
        right: null,
        meta: current.text,
      });
      index += 1;
      continue;
    }

    if (current.kind === "context") {
      rows.push({ left: current, right: current });
      index += 1;
      continue;
    }

    const removed: DiffLine[] = [];
    const added: DiffLine[] = [];

    while (
      index < lines.length &&
      (lines[index].kind === "add" ||
        lines[index].kind === "remove")
    ) {
      if (lines[index].kind === "remove") {
        removed.push(lines[index]);
      } else {
        added.push(lines[index]);
      }

      index += 1;
    }

    const count = Math.max(removed.length, added.length);

    for (let rowIndex = 0; rowIndex < count; rowIndex += 1) {
      rows.push({
        left: removed[rowIndex] ?? null,
        right: added[rowIndex] ?? null,
      });
    }
  }

  return rows;
};

const getDiffStats = (lines: DiffLine[]) => ({
  additions: lines.filter((line) => line.kind === "add").length,
  deletions: lines.filter((line) => line.kind === "remove").length,
});

const LineNumber = ({
  value,
}: {
  value: number | null;
}) => (
  <span className="inline-block w-10 shrink-0 select-none border-r border-app-line px-2 text-right text-app-dim">
    {value ?? ""}
  </span>
);

const UnifiedDiff = ({ lines }: { lines: DiffLine[] }) => (
  <div className="overflow-x-auto">
    <div className="min-w-max font-mono text-2xs leading-6">
      {lines.map((line, index) => (
        <div
          key={index}
          className={`flex whitespace-pre ${lineClasses[line.kind]}`}
        >
          <LineNumber
            value={line.oldNumber ?? line.newNumber}
          />
          <span className="px-3">
            {line.text || " "}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const SplitCell = ({
  line,
  side,
}: {
  line: DiffLine | null;
  side: "old" | "new";
}) => (
  <div
    className={`flex min-w-0 ${
      line ? lineClasses[line.kind] : "bg-app-panel2"
    }`}
  >
    <LineNumber
      value={
        line
          ? side === "old"
            ? line.oldNumber
            : line.newNumber
          : null
      }
    />
    <span className="whitespace-pre px-3">
      {line?.text ?? " "}
    </span>
  </div>
);

const SplitDiff = ({ lines }: { lines: DiffLine[] }) => {
  const rows = useMemo(() => toSplitRows(lines), [lines]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-190 font-mono text-2xs leading-6">
        <div className="grid grid-cols-2 border-b border-app-line bg-app-panel2 text-app-muted">
          <span className="px-3 py-2">Original</span>
          <span className="border-l border-app-line px-3 py-2">
            Proposed
          </span>
        </div>

        {rows.map((row, index) =>
          row.meta !== undefined ? (
            <div
              key={index}
              className="whitespace-pre border-y border-app-line bg-app-panel2 px-3 text-app-muted"
            >
              {row.meta || " "}
            </div>
          ) : (
            <div key={index} className="grid grid-cols-2">
              <SplitCell line={row.left} side="old" />
              <div className="min-w-0 border-l border-app-line">
                <SplitCell line={row.right} side="new" />
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
};

const PatchMetadata = ({
  patch,
}: {
  patch: CodePatchResponse;
}) => {
  const finding = useWorkspaceStore(
    (state) => state.selectedFinding,
  );

  return (
    <div className="border-t border-app-line p-4">
      <p className="mb-3 text-micro font-bold uppercase tracking-eyebrow text-app-dim">
        Patch metadata
      </p>

      <div className="space-y-4">
        <div>
          <strong className="text-xs text-app-text">
            Patch strategy
          </strong>
          <p className="mt-1 wrap-break-words text-2xs text-app-muted">
            {patch.summary}
          </p>
        </div>

        {finding && (
          <>
            <div className="border-t border-app-line-faint pt-3">
              <strong className="text-xs text-app-text">
                Finding
              </strong>
              <p className="mt-1 wrap-break-words text-2xs text-app-muted">
                {finding.title}
              </p>
            </div>

            <div className="border-t border-app-line-faint pt-3">
              <strong className="text-xs text-app-text">
                Finding severity
              </strong>
              <p className="mt-1 capitalize text-2xs text-app-muted">
                {finding.severity}
              </p>
            </div>
          </>
        )}

        <div className="border-t border-app-line-faint pt-3">
          <strong className="text-xs text-app-text">
            Source verification
          </strong>
          <p className="mt-1 text-2xs text-app-muted">
            SHA-256 comparison is enforced by the backend
            when a patch is explicitly applied.
          </p>
        </div>

        <div className="border-t border-app-line-faint pt-3">
          <strong className="text-xs text-app-text">
            Patch status
          </strong>
          <p className="mt-1 text-2xs text-status-amber">
            Proposal — not applied by this page
          </p>
        </div>
      </div>
    </div>
  );
};

const PatchReviewPage = () => {
  const patch = useWorkspaceStore((state) => state.patchResult);
  const selectedFile = useWorkspaceStore(
    (state) => state.selectedFile,
  );
  const setPatchResult = useWorkspaceStore(
    (state) => state.setPatchResult,
  );
  const setSelectedFinding = useWorkspaceStore(
    (state) => state.setSelectedFinding,
  );

  const [view, setView] = useState<DiffView>("unified");
  const [showRejectConfirmation, setShowRejectConfirmation] =
    useState(false);

  const lines = useMemo(
    () => parseDiff(patch?.diff ?? ""),
    [patch?.diff],
  );

  const stats = useMemo(() => getDiffStats(lines), [lines]);

  const rejectPatch = () => {
    setPatchResult(null);
    setSelectedFinding(null);
    setShowRejectConfirmation(false);
  };

  return (
    <div className="min-w-0 bg-app-bg px-3 py-5 text-app-text sm:px-6 sm:py-7 lg:px-9">
      <div className="mx-auto max-w-app space-y-5">
        {/* Prototype heading */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <p className="mb-1.5 text-micro font-bold uppercase tracking-eyebrow text-app-dim">
              PATCH REVIEW
            </p>

            <h1 className="font-manrope text-[28px] font-extrabold tracking-tight">
              Review changes
            </h1>

            <p className="mt-1 max-w-170 text-[13px] leading-relaxed text-app-muted">
              Inspect every proposed line before deciding
              whether a change should proceed to verification.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/investigation" className="btn">
              <ArrowLeft size={15} aria-hidden="true" />
              Findings
            </Link>

            <button
              type="button"
              disabled
              title="Sandbox approval will be connected to the workflow approval API"
              className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShieldCheck size={15} aria-hidden="true" />
              Approve for sandbox
            </button>
          </div>
        </header>

        {/* Proposal-only notice */}
        <div className="flex items-start gap-3 rounded-callout border border-status-amber-line bg-status-amber-bg p-3.5">
          <Info
            size={17}
            className="mt-0.5 shrink-0 text-status-amber"
            aria-hidden="true"
          />

          <p className="text-xs leading-relaxed text-status-amber">
            <strong>Proposal only.</strong> Reviewing this diff
            does not modify a source file. Sandbox approval and
            final source-write approval are separate actions.
          </p>
        </div>

        {!patch ? (
          <section
            className={`${panelClass} flex flex-col items-center px-5 py-14 text-center`}
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl border border-app-line bg-app-panel3">
              <GitPullRequest
                size={23}
                className="text-app-accent"
                aria-hidden="true"
              />
            </span>

            <h2 className="mt-4 text-sm font-semibold">
              No patch proposal selected
            </h2>

            <p className="mt-2 max-w-sm text-xs leading-relaxed text-app-muted">
              Open Investigation, review a finding, and generate
              a patch proposal. Its diff will appear here.
            </p>

            <Link to="/investigation" className="btn btn-primary mt-5">
              Open Investigation
            </Link>
          </section>
        ) : (
          <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(220px,0.55fr)_minmax(0,1.55fr)]">
            {/* Changed files and metadata */}
            <aside className={panelClass}>
              <div className="border-b border-app-line px-4 py-4">
                <h2 className="text-[13px] font-bold">
                  Changed files{" "}
                  <span className="font-normal text-app-muted">
                    (1)
                  </span>
                </h2>
                <p className="mt-1 text-2xs text-app-muted">
                  Proposed change · Source untouched
                </p>
              </div>

              <div className="p-2">
                <div className="flex items-start gap-2 rounded-lg bg-app-panel3 p-3 text-app-accent">
                  <FileCode2
                    size={15}
                    className="mt-0.5 shrink-0"
                    aria-hidden="true"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="break-all font-mono text-2xs">
                      {patch.relative_path}
                    </p>

                    <p className="mt-2 font-mono text-micro text-app-muted">
                      +{stats.additions} / −{stats.deletions}
                    </p>
                  </div>
                </div>
              </div>

              <PatchMetadata patch={patch} />

              {selectedFile?.workspace_root && (
                <p className="border-t border-app-line p-4 text-micro text-app-dim">
                  Configured source:{" "}
                  <span className="break-all font-mono">
                    {selectedFile.name}
                  </span>
                </p>
              )}
            </aside>

            {/* Diff viewer */}
            <section className={panelClass}>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-app-line p-4">
                <div className="min-w-0">
                  <h2 className="break-all font-mono text-xs font-semibold">
                    {patch.relative_path}
                  </h2>

                  <div className="mt-2 flex flex-wrap gap-3 font-mono text-micro">
                    <span className="text-status-green">
                      +{stats.additions} additions
                    </span>

                    <span className="text-status-red">
                      −{stats.deletions} deletions
                    </span>

                    <span className="text-app-muted">
                      {stats.additions + stats.deletions} changed lines
                    </span>
                  </div>
                </div>

                <div
                  role="group"
                  aria-label="Diff view"
                  className="flex shrink-0 gap-1"
                >
                  {(["unified", "split"] as const).map(
                    (option) => (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={view === option}
                        onClick={() => setView(option)}
                        className={`rounded-md border px-3 py-1.5 text-2xs capitalize ${
                          view === option
                            ? "border-app-accent bg-app-accent/10 text-app-accent"
                            : "border-app-line text-app-muted hover:text-app-text"
                        }`}
                      >
                        {option}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-b border-app-line bg-app-panel2 px-4 py-2 text-micro text-app-muted">
                <span className="flex items-center gap-2">
                  <FileDiff size={14} aria-hidden="true" />
                  {view === "unified"
                    ? "Unified diff"
                    : "Side-by-side diff"}
                </span>

                <span>
                  {patch.original_line_count} →{" "}
                  {patch.proposed_line_count} lines
                </span>
              </div>

              <div className="min-w-0 overflow-hidden">
                {view === "unified" ? (
                  <UnifiedDiff lines={lines} />
                ) : (
                  <SplitDiff lines={lines} />
                )}
              </div>

              <div className="border-t border-app-line bg-app-panel2 p-4">
                <h3 className="text-xs font-semibold text-app-text">
                  Review outcome
                </h3>
                <p className="mt-1 text-2xs text-app-muted">
                  Rejecting removes this proposal from your
                  current review session. It does not change
                  the source file.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setShowRejectConfirmation(true)
                    }
                    className="btn border-status-red/40 text-status-red hover:bg-status-red/10"
                  >
                    <X size={14} aria-hidden="true" />
                    Reject proposal
                  </button>

                  <button
                    type="button"
                    disabled
                    title="Sandbox approval is not yet connected"
                    className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ShieldCheck size={14} aria-hidden="true" />
                    Approve for sandbox
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Explicit reject confirmation */}
        {showRejectConfirmation && patch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-app-bg/85 p-4">
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="reject-patch-title"
              className="w-full max-w-md rounded-panel border border-app-line bg-app-panel p-5 shadow-panel"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle
                  size={19}
                  className="text-status-amber"
                  aria-hidden="true"
                />

                <h2
                  id="reject-patch-title"
                  className="text-sm font-semibold"
                >
                  Reject this proposal?
                </h2>
              </div>

              <p className="mt-3 wrap-break-words text-xs leading-relaxed text-app-muted">
                The proposal for{" "}
                <strong className="text-app-text">
                  {patch.relative_path}
                </strong>{" "}
                will be removed from the current review.
                No code will be modified.
              </p>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowRejectConfirmation(false)
                  }
                  className="btn"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={rejectPatch}
                  className="btn border-status-red/40 text-status-red"
                >
                  Reject proposal
                </button>
              </div>
            </section>
          </div>
        )}

        <div className="flex items-start gap-2 text-2xs text-app-dim">
          <CheckCircle2
            size={15}
            className="shrink-0 text-status-green"
            aria-hidden="true"
          />

          Only a generated proposal is displayed.
          No source-write API is called by this page.
        </div>
      </div>
    </div>
  );
};

export default PatchReviewPage;
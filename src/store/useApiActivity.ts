import { useSyncExternalStore } from "react";

type Activity = { id: number; label: string };

const active = new Map<number, Activity>();
const listeners = new Set<() => void>();
let nextId = 0;
let snapshot: Activity | null = null;

const emit = () => {
  snapshot = [...active.values()].at(-1) ?? null;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

const getSnapshot = () => snapshot;

export const useApiActivity = () => useSyncExternalStore(subscribe, getSnapshot);

/** Return a safe, idempotent completion callback for one real request. */
export const beginApiActivity = (label: string, timeoutMs = 12 * 60_000) => {
  const id = ++nextId;
  active.set(id, { id, label });
  emit();

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(expiry);
    active.delete(id);
    emit();
  };
  // Recovery for aborted/network-failed requests where no response hook runs.
  const expiry = setTimeout(finish, timeoutMs);
  return finish;
};

/** Labels describe actual API operations; they are not simulated AI phases. */
export const describeApiActivity = (method: string, path: string): string | null => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return null;
  if (/\/auth\//.test(path)) return null;

  if (/\/semantic-index\/preview$/.test(path)) return "Estimating index size";
  if (/\/semantic-index$/.test(path)) return "Embedding project files";
  if (/\/semantic-search$/.test(path)) return "Searching by meaning";
  if (/\/investigation\/preview$/.test(path)) return "Finding relevant files";
  if (/\/investigation\/question$/.test(path)) return "Investigating project";
  if (/\/investigation$/.test(path)) return "Reviewing source evidence";
  if (/\/reviews$/.test(path)) return "Reviewing project code";
  if (/\/snapshot$/.test(path)) return "Saving source snapshot";
  if (/\/projects\/[^/]+\/search$/.test(path)) return "Searching project files";
  if (/\/projects$/.test(path)) return "Creating project";
  if (/\/code-review\/file$/.test(path)) return "Analyzing source code";
  if (/\/test-execution\/run$/.test(path)) return "Running test suite";
  if (/\/agent\/workflows\/[^/]+\/resume$/.test(path)) return "Resuming agent run";
  if (/\/agent\//.test(path)) return "Processing agent workflow";
  if (/\/patch/.test(path)) return "Preparing code changes";
  if (/\/approv/.test(path)) return "Updating approval";
  if (/\/tasks/.test(path)) return "Updating project tasks";
  if (/\/workspace/.test(path)) return "Updating workspace";
  if (method === "DELETE") return "Removing saved data";
  if (method === "PUT" || method === "PATCH") return "Saving changes";
  return "Processing request";
};

import { useSyncExternalStore } from "react";
import { useAuthStore } from "./useAuthStore";

const PROJECT_CHANGED = "forgepath:active-project-changed";

const activeProjectStorageKey = (userId: string) =>
  `forgepath:active-project:${userId}`;

const subscribe = (onChange: () => void) => {
  window.addEventListener(PROJECT_CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(PROJECT_CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
};

export const getActiveProjectId = (userId: string | null | undefined) => {
  if (!userId) return null;
  return localStorage.getItem(activeProjectStorageKey(userId));
};

export const setActiveProjectId = (
  userId: string,
  projectId: string | null,
) => {
  const key = activeProjectStorageKey(userId);
  if (projectId) localStorage.setItem(key, projectId);
  else localStorage.removeItem(key);
  window.dispatchEvent(new Event(PROJECT_CHANGED));
};

export const useActiveProjectId = () => {
  const userId = useAuthStore((state) => state.user?.id);
  return useSyncExternalStore(
    subscribe,
    () => getActiveProjectId(userId),
    () => null,
  );
};


import { create } from "zustand";
import { useWorkspaceStore } from "./useWorkspaceStore";
import toast from "react-hot-toast";

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  is_email_verified?: boolean;
}

type RestoredSession = {
  user: User;
  token: string;
};

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isRestoringSession: boolean;

  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  restoreSession: (
    loadSession: () => Promise<RestoredSession>,
  ) => Promise<void>;
}

const SIGNED_OUT_KEY = "forgepath-signed-out";

// Remove credentials persisted by previous ForgePath versions.
try {
  localStorage.removeItem("forgepath-auth");
} catch {
  // Browser storage may be unavailable.
}

const wasExplicitlySignedOut = (): boolean => {
  try {
    return localStorage.getItem(SIGNED_OUT_KEY) === "true";
  } catch {
    return false;
  }
};

const rememberSignOut = (signedOut: boolean): void => {
  try {
    if (signedOut) {
      localStorage.setItem(SIGNED_OUT_KEY, "true");
    } else {
      localStorage.removeItem(SIGNED_OUT_KEY);
    }
  } catch {
    // Authentication remains memory-only.
  }
};

let pendingRestore: Promise<void> | null = null;

export const useAuthStore = create<AuthState>()(
  (set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isRestoringSession: true,

    login: (user, token) => {
      if (get().user?.id !== user.id) {
        toast.remove();
        useWorkspaceStore.getState().clearAllState();
      }

      rememberSignOut(false);

      set({
        user,
        token,
        isAuthenticated: true,
        isRestoringSession: false,
      });
    },

    logout: () => {
      toast.remove();
      useWorkspaceStore.getState().clearAllState();

      rememberSignOut(true);

      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isRestoringSession: false,
      });
    },

    updateUser: (data) =>
      set((state) => ({
        user: state.user
          ? { ...state.user, ...data }
          : null,
      })),

    restoreSession: (loadSession) => {
      if (pendingRestore) return pendingRestore;

      if (!get().isRestoringSession) {
        return Promise.resolve();
      }

      if (wasExplicitlySignedOut()) {
        set({ isRestoringSession: false });
        return Promise.resolve();
      }

      const sessionVersion =
        useWorkspaceStore.getState().sessionVersion;

      const isCurrent = () =>
        get().isRestoringSession &&
        useWorkspaceStore.getState().sessionVersion ===
          sessionVersion;

      const restore = async () => {
        try {
          const restored = await loadSession();

          if (!isCurrent()) return;

          if (!restored.user.id || !restored.token) {
            throw new Error("Invalid restored session.");
          }

          get().login(restored.user, restored.token);
        } catch {
          // Missing, expired or unavailable server session.
          // Protected routes remain inaccessible.
        } finally {
          if (isCurrent()) {
            set({ isRestoringSession: false });
          }
        }
      };

      pendingRestore = Promise.resolve()
        .then(restore)
        .finally(() => {
          pendingRestore = null;
        });

      return pendingRestore;
    },
  }),
);

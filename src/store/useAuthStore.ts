import { create } from "zustand";
import { persist } from "zustand/middleware";
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

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => {
        if (get().user?.id !== user.id) {
          toast.remove();
          useWorkspaceStore.getState().clearAllState();
        }
        set({
          user,
          token,
          isAuthenticated: true,
        });
      },

      logout: () => {
        toast.remove();
        useWorkspaceStore.getState().clearAllState();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },
        
      updateUser: (data) => 
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null
        })),
    }),
    {
      name: "forgepath-auth",
    },
  ),
);

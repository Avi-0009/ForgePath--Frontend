
import { useEffect, type ReactNode } from "react";
import { apiClient, type LoginResponse } from "../../Api/Auth";
import { useAuthStore } from "../../store/useAuthStore";

type Props = {
  children: ReactNode;
};

const loadSession = async () => {
  const response = await apiClient
    .post("auth/refresh")
    .json<LoginResponse>();

  return {
    user: {
      id: response.user.id,
      name: response.user.full_name,
      username: response.user.username,
      email: response.user.email,
      is_email_verified: response.user.is_email_verified,
    },
    token: response.access_token,
  };
};

const AuthSessionProvider = ({ children }: Props) => {
  const isRestoringSession = useAuthStore(
    (state) => state.isRestoringSession,
  );

  const restoreSession = useAuthStore(
    (state) => state.restoreSession,
  );

  useEffect(() => {
    void restoreSession(loadSession);
  }, [restoreSession]);

  if (isRestoringSession) {
    return (
      <main className="grid min-h-dvh place-items-center bg-app-bg text-app-text">
        <div
          role="status"
          className="flex flex-col items-center gap-4"
        >
          <div
            aria-hidden="true"
            className="h-8 w-8 animate-spin rounded-full border-2 border-app-line border-t-app-accent"
          />

          <p className="text-sm text-app-muted">
            Restoring your session...
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
};

export default AuthSessionProvider;

export const ACCOUNT_ROUTES = {
  profile: "/profile",
  settings: "/settings",
} as const;

type ProtectedRouteSession = {
  isAuthenticated: boolean;
  token: string | null;
  user: { id: string } | null;
};

export const canAccessProtectedRoute = (
  session: ProtectedRouteSession,
): boolean => Boolean(
  session.isAuthenticated && session.token && session.user,
);

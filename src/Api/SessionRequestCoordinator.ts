export type SessionSnapshot = {
  userId: string | null;
  token: string | null;
};

export type RefreshResult = {
  userId: string;
  accessToken: string;
};

type CoordinatorDependencies<TRefresh extends RefreshResult> = {
  getSession: () => SessionSnapshot;
  refresh: () => Promise<TRefresh>;
  applyRefresh: (result: TRefresh) => void;
  clearSession: () => void;
  isUnauthorized: (error: unknown) => boolean;
};

const sameSession = (
  left: SessionSnapshot,
  right: SessionSnapshot,
): boolean => left.userId === right.userId && left.token === right.token;

const accountChanged = (cause?: unknown): Error =>
  new Error("Authentication account changed during request.", { cause });

export const createSessionRequestCoordinator = <
  TRefresh extends RefreshResult,
>(dependencies: CoordinatorDependencies<TRefresh>) => {
  let pendingRefresh: {
    session: SessionSnapshot;
    promise: Promise<string>;
  } | null = null;

  const refreshAccessToken = (
    expectedSession: SessionSnapshot,
  ): Promise<string> => {
    if (
      pendingRefresh &&
      sameSession(pendingRefresh.session, expectedSession)
    ) {
      return pendingRefresh.promise;
    }

    const entry: {
      session: SessionSnapshot;
      promise: Promise<string>;
    } = {
      session: expectedSession,
      promise: Promise.resolve(""),
    };

    entry.promise = (async () => {
      try {
        const result = await dependencies.refresh();

        if (!result.accessToken) {
          throw new Error(
            "Authentication refresh returned no access token.",
          );
        }

        if (
          result.userId !== expectedSession.userId ||
          !sameSession(
            dependencies.getSession(),
            expectedSession,
          )
        ) {
          throw accountChanged();
        }

        dependencies.applyRefresh(result);
        return result.accessToken;
      } catch (error) {
        if (
          dependencies.isUnauthorized(error) &&
          sameSession(
            dependencies.getSession(),
            expectedSession,
          )
        ) {
          dependencies.clearSession();
        }

        throw error;
      } finally {
        if (pendingRefresh === entry) {
          pendingRefresh = null;
        }
      }
    })();

    pendingRefresh = entry;
    return entry.promise;
  };

  const requestWithTokenRefresh = async <T>(
    fallbackToken: string,
    request: (accessToken: string) => Promise<T>,
  ): Promise<T> => {
    const storedSession = dependencies.getSession();
    const initialToken = storedSession.token || fallbackToken;
    const initialSession: SessionSnapshot = {
      userId: storedSession.userId,
      token: initialToken,
    };

    try {
      return await request(initialToken);
    } catch (error) {
      if (!dependencies.isUnauthorized(error)) throw error;

      const currentSession = dependencies.getSession();

      if (currentSession.userId !== initialSession.userId) {
        throw accountChanged(error);
      }

      if (
        currentSession.token &&
        currentSession.token !== initialSession.token
      ) {
        return request(currentSession.token);
      }

      const refreshedToken = await refreshAccessToken(
        initialSession,
      );
      const refreshedSession = dependencies.getSession();

      if (
        refreshedSession.userId !== initialSession.userId ||
        !refreshedSession.token
      ) {
        throw accountChanged(error);
      }

      return request(
        refreshedSession.token === refreshedToken
          ? refreshedToken
          : refreshedSession.token,
      );
    }
  };

  return { requestWithTokenRefresh };
};

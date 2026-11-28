
export type SessionSnapshot = {
  userId: string | null;
  token: string | null;
  sessionVersion: number;
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

const sameIdentity = (
  left: SessionSnapshot,
  right: SessionSnapshot,
): boolean =>
  left.userId === right.userId &&
  left.sessionVersion === right.sessionVersion;

const sameSession = (
  left: SessionSnapshot,
  right: SessionSnapshot,
): boolean =>
  sameIdentity(left, right) &&
  left.token === right.token;

const accountChanged = (cause?: unknown): Error =>
  new Error(
    "Authentication account changed during request.",
    { cause },
  );

export const createSessionRequestCoordinator = <
  TRefresh extends RefreshResult,
>(dependencies: CoordinatorDependencies<TRefresh>) => {
  let pendingRefresh: {
    session: SessionSnapshot;
    promise: Promise<string>;
  } | null = null;

  let rememberedSession: SessionSnapshot | null = null;
  const knownTokens = new Set<string>();

  const rememberSession = (session: SessionSnapshot): void => {
    if (
      !rememberedSession ||
      !sameIdentity(rememberedSession, session)
    ) {
      knownTokens.clear();
    }

    rememberedSession = { ...session };

    if (session.token) {
      knownTokens.add(session.token);
    }

    // Bound the number of previous tokens retained in memory.
    while (knownTokens.size > 32) {
      const oldest = knownTokens.values().next().value;
      if (oldest === undefined) break;
      knownTokens.delete(oldest);
    }
  };

  const requireCurrentSession = (
    expected: SessionSnapshot,
  ): SessionSnapshot => {
    const current = dependencies.getSession();

    if (
      !current.userId ||
      !current.token ||
      !sameIdentity(current, expected)
    ) {
      throw accountChanged();
    }

    return current;
  };

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

        const current = requireCurrentSession(expectedSession);
        rememberSession(current);

        return result.accessToken;
      } catch (error) {
        const current = dependencies.getSession();

        if (!sameIdentity(current, expectedSession)) {
          throw accountChanged(error);
        }

        if (
          dependencies.isUnauthorized(error) &&
          sameSession(current, expectedSession)
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

  const executeGuarded = async <T>(
    expected: SessionSnapshot,
    token: string,
    request: (accessToken: string) => Promise<T>,
  ): Promise<T> => {
    requireCurrentSession(expected);

    try {
      const result = await request(token);

      requireCurrentSession(expected);

      return result;
    } catch (error) {
      requireCurrentSession(expected);
      throw error;
    }
  };

  const requestWithTokenRefresh = async <T>(
    fallbackToken: string,
    request: (accessToken: string) => Promise<T>,
  ): Promise<T> => {
    const initialSession = {
      ...dependencies.getSession(),
    };

    rememberSession(initialSession);

    if (
      !initialSession.userId ||
      !initialSession.token ||
      !knownTokens.has(fallbackToken)
    ) {
      throw accountChanged();
    }

    try {
      return await executeGuarded(
        initialSession,
        initialSession.token,
        request,
      );
    } catch (error) {
      if (!dependencies.isUnauthorized(error)) {
        throw error;
      }

      const currentSession =
        requireCurrentSession(initialSession);

      if (currentSession.token !== initialSession.token) {
        return executeGuarded(
          initialSession,
          currentSession.token!,
          request,
        );
      }

      await refreshAccessToken(initialSession);

      const refreshedSession =
        requireCurrentSession(initialSession);

      return executeGuarded(
        initialSession,
        refreshedSession.token!,
        request,
      );
    }
  };

  return { requestWithTokenRefresh };
};

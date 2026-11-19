import { HTTPError } from "ky";

import { apiClient, type LoginResponse } from "./Auth";
import { useAuthStore } from "../store/useAuthStore";

let pendingRefresh: Promise<string> | null = null;

const isUnauthorized = (error: unknown): boolean =>
  error instanceof HTTPError &&
  error.response.status === 401;

const refreshAccessToken = async (): Promise<string> => {
  if (pendingRefresh) return pendingRefresh;

  pendingRefresh = (async () => {
    const previousUserId = useAuthStore.getState().user?.id;

    try {
      const response = await apiClient
        .post("auth/refresh")
        .json<LoginResponse>();

      if (!response.access_token) {
        throw new Error(
          "Authentication refresh returned no access token."
        );
      }

      if (
        useAuthStore.getState().user?.id !== previousUserId ||
        (previousUserId && response.user.id !== previousUserId)
      ) {
        throw new Error(
          "Authentication account changed during refresh."
        );
      }

      useAuthStore.getState().login(
        {
          id: response.user.id,
          name: response.user.full_name,
          username: response.user.username,
          email: response.user.email,
          is_email_verified: response.user.is_email_verified,
        },
        response.access_token
      );

      return response.access_token;
    } catch (error) {
      if (isUnauthorized(error)) {
        useAuthStore.getState().logout();
      }

      throw error;
    }
  })();

  try {
    return await pendingRefresh;
  } finally {
    pendingRefresh = null;
  }
};

export const requestWithTokenRefresh = async <T>(
  fallbackToken: string,
  request: (accessToken: string) => Promise<T>
): Promise<T> => {
  const initialState = useAuthStore.getState();
  const initialUserId = initialState.user?.id;
  const initialToken = initialState.token || fallbackToken;

  try {
    return await request(initialToken);
  } catch (error) {
    if (!isUnauthorized(error)) throw error;

    const currentState = useAuthStore.getState();

    if (currentState.user?.id !== initialUserId) {
      throw new Error(
        "Authentication account changed during request.",
        { cause: error }
      );
    }

    if (
      currentState.token &&
      currentState.token !== initialToken
    ) {
      return request(currentState.token);
    }

    const refreshedToken = await refreshAccessToken();

    if (useAuthStore.getState().user?.id !== initialUserId) {
      throw new Error(
        "Authentication account changed during request.",
        { cause: error }
      );
    }

    return request(refreshedToken);
  }
};
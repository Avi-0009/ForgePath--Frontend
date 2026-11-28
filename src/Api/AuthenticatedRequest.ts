import { HTTPError } from "ky";

import { apiClient, type LoginResponse } from "./Auth";
import { createSessionRequestCoordinator } from "./SessionRequestCoordinator";
import { useAuthStore } from "../store/useAuthStore";
import { useWorkspaceStore } from "../store/useWorkspaceStore";

const isUnauthorized = (error: unknown): boolean =>
  error instanceof HTTPError &&
  error.response.status === 401;

const coordinator = createSessionRequestCoordinator({
  getSession: () => {
    const state = useAuthStore.getState();

    return {
      userId: state.user?.id ?? null,
      token: state.token,
      sessionVersion:
        useWorkspaceStore.getState().sessionVersion,
    };
  },
  refresh: async () => {
    const response = await apiClient
      .post("auth/refresh")
      .json<LoginResponse>();

    return {
      userId: response.user.id,
      accessToken: response.access_token,
      response,
    };
  },
  applyRefresh: ({ response, accessToken }) => {
    useAuthStore.getState().login(
      {
        id: response.user.id,
        name: response.user.full_name,
        username: response.user.username,
        email: response.user.email,
        is_email_verified: response.user.is_email_verified,
      },
      accessToken,
    );
  },
  clearSession: () => useAuthStore.getState().logout(),
  isUnauthorized,
});

export const requestWithTokenRefresh =
  coordinator.requestWithTokenRefresh;

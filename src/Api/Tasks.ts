import { HTTPError } from "ky";

import {
  apiClient,
  type LoginResponse,
} from "./Auth";

import { useAuthStore } from "../store/useAuthStore";

export type WorkflowStatus =
  | "running"
  | "awaiting_plan_approval"
  | "awaiting_file_selection"
  | "awaiting_patch_approval"
  | "awaiting_test_approval"
  | "awaiting_repair_file_selection"
  | "completed"
  | "completed_without_tests"
  | "tests_failed"
  | "cancelled"
  | "failed";

export interface TaskHistoryItem {
  id: string;
  thread_id: string;
  workspace_root: string;
  task_description: string;
  planning_mode: string;
  test_runner: string;
  status: WorkflowStatus;
  message: string | null;
  total_steps: number;
  completed_steps: number;
  repair_attempts: number;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
}

export interface TaskHistoryResponse {
  items: TaskHistoryItem[];
  total: number;
  limit: number;
  offset: number;
}

let pendingRefresh: Promise<string> | null = null;

function isUnauthorized(error: unknown): boolean {
  return (
    error instanceof HTTPError &&
    error.response.status === 401
  );
}

async function requestTaskHistory(
  token: string,
  offset: number,
  limit: number,
): Promise<TaskHistoryResponse> {
  return apiClient
    .get("agent/workflows/history", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      searchParams: {
        offset: String(offset),
        limit: String(limit),
      },
    })
    .json<TaskHistoryResponse>();
}

async function refreshAccessToken(): Promise<string> {
  if (pendingRefresh) {
    return pendingRefresh;
  }

  pendingRefresh = (async () => {
    try {
      const response = await apiClient
        .post("auth/refresh")
        .json<LoginResponse>();

      if (!response.access_token) {
        throw new Error(
          "Authentication refresh returned no access token.",
        );
      }

      useAuthStore.getState().login(
        {
          id: response.user.id,
          name: response.user.full_name,
          username: response.user.username,
          email: response.user.email,
          is_email_verified:
            response.user.is_email_verified,
        },
        response.access_token,
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
}

export async function getTaskHistory(
  token: string,
  offset = 0,
  limit = 20,
): Promise<TaskHistoryResponse> {
  const initialToken =
    useAuthStore.getState().token || token;

  try {
    return await requestTaskHistory(
      initialToken,
      offset,
      limit,
    );
  } catch (error) {
    if (!isUnauthorized(error)) {
      throw error;
    }

    const currentToken = useAuthStore.getState().token;

    if (
      currentToken &&
      currentToken !== initialToken
    ) {
      return requestTaskHistory(
        currentToken,
        offset,
        limit,
      );
    }

    const refreshedToken = await refreshAccessToken();

    return requestTaskHistory(
      refreshedToken,
      offset,
      limit,
    );
  }
}
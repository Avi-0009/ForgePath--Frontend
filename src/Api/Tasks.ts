import { apiClient } from "./Auth";
import { requestWithTokenRefresh } from "./AuthenticatedRequest";

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

const requestTaskHistory = async (
  token: string,
  offset: number,
  limit: number
): Promise<TaskHistoryResponse> =>
  apiClient
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

export const getTaskHistory = async (
  token: string,
  offset = 0,
  limit = 20
): Promise<TaskHistoryResponse> =>
  requestWithTokenRefresh(token, (accessToken) =>
    requestTaskHistory(accessToken, offset, limit)
  );
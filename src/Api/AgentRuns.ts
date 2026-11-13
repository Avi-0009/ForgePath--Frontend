import { HTTPError } from "ky";

import { apiClient } from "./Auth";
import {
  getTaskHistory,
  type TaskHistoryItem,
  type WorkflowStatus,
} from "./Tasks";
import { useAuthStore } from "../store/useAuthStore";

export type { TaskHistoryItem, WorkflowStatus };

export interface WorkflowStep {
  step_number: number;
  title: string;
  description: string;
}

export interface WorkflowPendingAction {
  kind:
    | "plan_approval"
    | "file_selection"
    | "repair_file_selection"
    | "patch_approval"
    | "test_approval";
  message: string;
  step_number: number | null;
  available_files: string[];
}

export interface WorkflowPatch {
  relative_path?: string;
  original_code?: string;
  modified_code?: string;
  diff?: string;
}

export interface WorkflowDetail {
  thread_id: string;
  status: WorkflowStatus;
  workspace_root: string;
  message: string;
  plan: {
    task_summary: string;
    objective: string;
    steps: WorkflowStep[];
  } | null;
  current_step_number: number | null;
  pending_action: WorkflowPendingAction | null;
  patch_proposal: WorkflowPatch | null;
  applied_patches: Array<{
    relative_path: string;
    backup_id: string;
  }>;
  manual_steps: number[];
  skipped_steps: number[];
  test_result: {
    status?: string;
    exit_code?: number | null;
    stdout?: string;
    stderr?: string;
  } | null;
  error_message: string | null;
  repair_attempts: number;
  max_repair_attempts: number;
}

export async function getAgentRunHistory(
  token: string,
  offset = 0,
  limit = 20,
) {
  return getTaskHistory(token, offset, limit);
}

async function requestDetail(
  threadId: string,
  token: string,
): Promise<WorkflowDetail> {
  return apiClient
    .get(`agent/workflows/${encodeURIComponent(threadId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .json<WorkflowDetail>();
}

export async function getAgentRunDetail(
  threadId: string,
  token: string,
): Promise<WorkflowDetail> {
  const currentToken =
    useAuthStore.getState().token || token;

  try {
    return await requestDetail(threadId, currentToken);
  } catch (error) {
    if (
      !(error instanceof HTTPError) ||
      error.response.status !== 401
    ) {
      throw error;
    }

    await getTaskHistory(currentToken, 0, 1);

    const refreshedToken = useAuthStore.getState().token;

    if (!refreshedToken) {
      throw error;
    }

    return requestDetail(threadId, refreshedToken);
  }
}
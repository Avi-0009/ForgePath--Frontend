import { HTTPError } from "ky";

import { apiClient } from "./Auth";
import { getTaskHistory } from "./Tasks";
import { useAuthStore } from "../store/useAuthStore";
import type { WorkflowDetail } from "./AgentRuns";

export type TestRunner = "pytest" | "npm" | "go";
export type Decision = "approve" | "reject" | "cancel" | "select_file";

export interface TestExecutionResult {
  execution_id: string;
  workspace_root: string;
  runner: TestRunner;
  status: "passed" | "failed" | "timed_out" | "error";
  command: string[];
  exit_code: number | null;
  duration_ms: number;
  stdout: string;
  stderr: string;
  stdout_truncated: boolean;
  stderr_truncated: boolean;
  started_at: string;
  finished_at: string;
}

const authenticated = async <T,>(
  token: string,
  operation: (validToken: string) => Promise<T>,
): Promise<T> => {
  const initial = useAuthStore.getState().token || token;
  try {
    return await operation(initial);
  } catch (error) {
    if (!(error instanceof HTTPError) || error.response.status !== 401) {
      throw error;
    }
    const latest = useAuthStore.getState().token;
    if (latest && latest !== initial) return operation(latest);
    await getTaskHistory(initial, 0, 1); // Existing single-flight refresh.
    const refreshed = useAuthStore.getState().token;
    if (!refreshed) throw error;
    return operation(refreshed);
  }
};

export const executeLocalTests = async (
  token: string,
  workspaceRoot: string,
  runner: TestRunner,
  timeoutSeconds: number,
): Promise<TestExecutionResult> =>
  authenticated(token, (validToken) =>
    apiClient.post("test-execution/run", {
      headers: { Authorization: `Bearer ${validToken}` },
      json: {
        workspace_root: workspaceRoot,
        runner,
        timeout_seconds: timeoutSeconds,
        approval: "run",
      },
      timeout: (timeoutSeconds + 30) * 1000,
    }).json<TestExecutionResult>(),
  );

export const resumeWorkflow = async (
  token: string,
  threadId: string,
  action: Decision,
  selectedFile?: string,
): Promise<WorkflowDetail> =>
  authenticated(token, (validToken) =>
    apiClient.post(`agent/workflows/${encodeURIComponent(threadId)}/resume`, {
      headers: { Authorization: `Bearer ${validToken}` },
      json: action === "select_file"
        ? { action, selected_file: selectedFile }
        : { action },
      timeout: 300_000,
    }).json<WorkflowDetail>(),
  );

export const engineeringError = async (error: unknown): Promise<string> => {
  if (error instanceof HTTPError) {
    if (error.response.status === 401) return "Session expired. Sign in again.";
    if (error.response.status === 403) return "You are not permitted to use this workspace.";
    if (error.response.status === 404) return "This workflow or workspace no longer exists.";
    if (error.response.status === 409) return "The checkpoint changed. Refresh before making a decision.";
    if (error.response.status === 503) return "The test runner or agent runtime is unavailable.";
    try {
      const data: unknown = await error.response.clone().json();
      if (data && typeof data === "object" && "detail" in data && typeof data.detail === "string") return data.detail;
    } catch { /* keep fallback */ }
    return `Request failed (HTTP ${error.response.status}).`;
  }
  return error instanceof Error ? error.message : "An unexpected error occurred.";
};
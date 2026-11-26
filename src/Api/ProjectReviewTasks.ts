import { apiClient } from "./Auth";
import { requestWithTokenRefresh } from "./AuthenticatedRequest";

export type ProjectReviewTask = {
  id: string;
  project_id: string;
  review_id: string;
  snapshot_id: string;
  finding_index: number;
  title: string;
  path: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  evidence: string;
  explanation: string;
  status: "proposed" | "approved" | "dismissed";
  planning_status: "not_started" | "planning" | "ready" | "failed";
  plan: ProjectTaskPlan | null;
  planning_error: string | null;
  planned_at: string | null;
  plan_decision: "pending" | "approved" | "rejected" | null;
  plan_decided_at: string | null;
  patch_status:
    | "not_started"
    | "generating"
    | "ready"
    | "approved"
    | "rejected"
    | "failed"
    | "applied";
  patch: ProjectTaskPatch | null;
  patch_error: string | null;
  patched_at: string | null;
  applied_snapshot_id: string | null;
  applied_at: string | null;
  is_current_snapshot: boolean;
  created_at: string;
  updated_at: string;
};

export type ProjectTaskPatch = {
  relative_path: string;
  original_sha256: string;
  proposed_sha256: string;
  original_line_count: number;
  proposed_line_count: number;
  summary: string;
  diff: string;
  proposed_code: string;
  patch_applied: false;
};

export type ProjectTaskPlanStep = {
  step_number: number;
  title: string;
  description: string;
  dependencies: number[];
  candidate_files_to_inspect: string[];
  acceptance_criteria: string[];
  verification_actions: string[];
};

export type ProjectTaskPlan = {
  plan_id: string;
  workspace_root: string;
  task_summary: string;
  objective: string;
  complexity: "low" | "medium" | "high";
  assumptions: string[];
  steps: ProjectTaskPlanStep[];
  risks: Array<{
    severity: "low" | "medium" | "high";
    title: string;
    description: string;
    mitigation: string;
  }>;
  open_questions: string[];
  overall_verification_strategy: string[];
  generated_at: string;
};

export type ProjectReviewTaskList = {
  items: ProjectReviewTask[];
  current_snapshot_id: string;
  limit: number;
  offset: number;
};

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export const getProjectReviewTasks = (
  token: string,
  projectId: string,
  offset = 0,
  limit = 100,
  includeStale = false
) =>
  requestWithTokenRefresh(token, (accessToken) =>
    apiClient
      .get(`projects/${projectId}/tasks`, {
        headers: headers(accessToken),
        searchParams: {
          limit,
          offset,
          include_stale: includeStale,
        },
      })
      .json<ProjectReviewTaskList>()
  );

export const createProjectReviewTask = (
  token: string,
  projectId: string,
  reviewId: string,
  findingIndex: number
) =>
  requestWithTokenRefresh(token, (accessToken) =>
    apiClient
      .post(`projects/${projectId}/tasks`, {
        headers: headers(accessToken),
        json: {
          review_id: reviewId,
          finding_index: findingIndex,
        },
      })
      .json<ProjectReviewTask>()
  );

export const decideProjectReviewTask = (
  token: string,
  projectId: string,
  taskId: string,
  decision: "approved" | "dismissed"
) =>
  requestWithTokenRefresh(token, (accessToken) =>
    apiClient
      .patch(`projects/${projectId}/tasks/${taskId}`, {
        headers: headers(accessToken),
        json: { status: decision },
      })
      .json<ProjectReviewTask>()
  );

export const createProjectReviewTaskPlan = (
  token: string,
  projectId: string,
  task: Pick<ProjectReviewTask, "id" | "snapshot_id">,
  maxSteps = 10
) =>
  requestWithTokenRefresh(token, (accessToken) =>
    apiClient
      .post(`projects/${projectId}/tasks/${task.id}/plan`, {
        headers: headers(accessToken),
        json: {
          expected_snapshot_id: task.snapshot_id,
          max_steps: maxSteps,
        },
      })
      .json<ProjectReviewTask>()
  );

export const createProjectReviewTaskPatch = (
  token: string,
  projectId: string,
  task: Pick<ProjectReviewTask, "id" | "snapshot_id" | "plan">
) => {
  if (!task.plan) {
    throw new Error("A saved implementation plan is required.");
  }

  return requestWithTokenRefresh(token, (accessToken) =>
    apiClient
      .post(`projects/${projectId}/tasks/${task.id}/patch`, {
        headers: headers(accessToken),
        json: {
          expected_snapshot_id: task.snapshot_id,
          expected_plan_id: task.plan?.plan_id,
        },
      })
      .json<ProjectReviewTask>()
  );
};

export const decideProjectReviewTaskPatch = (
  token: string,
  projectId: string,
  task: Pick<ProjectReviewTask, "id" | "snapshot_id" | "patch">,
  decision: "approved" | "rejected"
) => {
  if (!task.patch) {
    throw new Error("A patch proposal is required.");
  }

  return requestWithTokenRefresh(token, (accessToken) =>
    apiClient
      .patch(`projects/${projectId}/tasks/${task.id}/patch`, {
        headers: headers(accessToken),
        json: {
          status: decision,
          expected_snapshot_id: task.snapshot_id,
          expected_proposed_sha256: task.patch?.proposed_sha256,
        },
      })
      .json<ProjectReviewTask>()
  );
};

export const downloadProjectReviewTaskPatch = (
  token: string,
  projectId: string,
  taskId: string
) =>
  requestWithTokenRefresh(token, (accessToken) =>
    apiClient
      .get(`projects/${projectId}/tasks/${taskId}/patch/download`, {
        headers: headers(accessToken),
        cache: "no-store",
      })
      .blob()
  );

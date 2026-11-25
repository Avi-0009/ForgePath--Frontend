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
  created_at: string;
  updated_at: string;
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
  limit = 100
) =>
  requestWithTokenRefresh(token, (accessToken) =>
    apiClient
      .get(`projects/${projectId}/tasks`, {
        headers: headers(accessToken),
        searchParams: { limit, offset },
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

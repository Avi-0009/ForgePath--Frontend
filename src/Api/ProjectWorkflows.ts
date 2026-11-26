import { apiClient } from "./Auth";
import { requestWithTokenRefresh } from "./AuthenticatedRequest";
import type { ProjectReviewTask } from "./ProjectReviewTasks";

export type ProjectWorkflowStage =
  | "dismissed"
  | "finding_approval"
  | "planning_not_started"
  | "planning_planning"
  | "planning_failed"
  | "plan_approval"
  | "plan_rejected"
  | "patch_not_started"
  | "patch_generating"
  | "patch_ready"
  | "patch_approved"
  | "patch_rejected"
  | "patch_failed"
  | "patch_applied";

export type ProjectWorkflow = {
  kind: "project_task";
  project_name: string;
  stage: ProjectWorkflowStage;
  pending_decision: "finding" | "plan" | "patch" | null;
  task: ProjectReviewTask;
};

export type ProjectWorkflowList = {
  items: ProjectWorkflow[];
  total: number;
  offset: number;
  limit: number;
};

export const getProjectWorkflows = (
  token: string,
  offset = 0,
  limit = 30,
  pendingOnly = false,
): Promise<ProjectWorkflowList> =>
  requestWithTokenRefresh(token, (accessToken) =>
    apiClient.get("project-workflows", {
      headers: { Authorization: `Bearer ${accessToken}` },
      searchParams: { offset, limit, pending_only: pendingOnly },
    }).json<ProjectWorkflowList>(),
  );

export const decideProjectPlan = (
  token: string,
  projectId: string,
  task: Pick<ProjectReviewTask, "id" | "snapshot_id" | "plan">,
  status: "approved" | "rejected",
): Promise<ProjectReviewTask> => {
  if (!task.plan) throw new Error("A saved plan is required before a decision.");
  const planId = task.plan.plan_id;
  return requestWithTokenRefresh(token, (accessToken) =>
    apiClient.patch(
      `project-workflows/${projectId}/tasks/${task.id}/plan/decision`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        json: {
          status,
          expected_snapshot_id: task.snapshot_id,
          expected_plan_id: planId,
        },
      },
    ).json<ProjectReviewTask>(),
  );
};

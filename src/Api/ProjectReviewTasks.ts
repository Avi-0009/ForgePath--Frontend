import { apiClient } from "./Auth";

export type ProjectReviewTask = {
  id: string;
  project_id: string;
  review_id: string;
  finding_index: number;
  title: string;
  path: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  evidence: string;
  explanation: string;
  status: "proposed" | "approved" | "dismissed";
  created_at: string;
  updated_at: string;
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
) =>
  apiClient
    .get(`projects/${projectId}/tasks`, {
      headers: headers(token),
      searchParams: {
        limit: 100,
        offset: 0,
      },
    })
    .json<ProjectReviewTaskList>();

export const createProjectReviewTask = (
  token: string,
  projectId: string,
  reviewId: string,
  findingIndex: number,
) =>
  apiClient
    .post(`projects/${projectId}/tasks`, {
      headers: headers(token),
      json: {
        review_id: reviewId,
        finding_index: findingIndex,
      },
    })
    .json<ProjectReviewTask>();

export const decideProjectReviewTask = (
  token: string,
  projectId: string,
  taskId: string,
  decision: "approved" | "dismissed",
) =>
  apiClient
    .patch(`projects/${projectId}/tasks/${taskId}`, {
      headers: headers(token),
      json: {
        status: decision,
      },
    })
    .json<ProjectReviewTask>();
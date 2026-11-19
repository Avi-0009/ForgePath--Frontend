import { apiClient } from "./Auth";
import { requestWithTokenRefresh } from "./AuthenticatedRequest";

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
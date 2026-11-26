import { apiClient } from "./Auth";
import { requestWithTokenRefresh } from "./AuthenticatedRequest";

export type SnapshotFile = {
  relative_path: string;
  content: string;
};

export type ActivatedProject = {
  id: string;
  name: string;
  status: string;
};

export type ProjectListResponse = {
  items: ActivatedProject[];
  limit: number;
  offset: number;
};

export type SnapshotReceipt = {
  project_id: string;
  snapshot_id: string;
  file_count: number;
  total_bytes: number;
  sha256: string;
  status: string;
  index_cleanup_pending: boolean;
  applied_patch_count: number;
  applied_patch_task_ids: string[];
};

export type ProjectFinding = {
  path: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  evidence: string;
  explanation: string;
  verification_status: "unverified";
};

export type ProjectReview = {
  id: string;
  project_id: string;
  snapshot_id: string;
  status: "queued" | "running" | "completed" | "partial" | "failed" | "interrupted";
  files_scanned: number;
  files_reviewed: number;
  ai_calls: number;
  max_ai_calls: number;
  max_output_tokens_per_call: number;
  result_text: string | null;
  error_message: string | null;
  findings?: ProjectFinding[];
};

const headers = (token: string) => ({ Authorization: `Bearer ${token}` });

export const createProject = (token: string, name: string) =>
  requestWithTokenRefresh(token, (accessToken) =>
    apiClient.post("projects", {
      headers: headers(accessToken),
      json: { name },
    }).json<ActivatedProject>(),
  );

export const getProject = (token: string, projectId: string) =>
  requestWithTokenRefresh(token, (accessToken) =>
    apiClient.get(`projects/${encodeURIComponent(projectId)}`, {
      headers: headers(accessToken),
    }).json<ActivatedProject>(),
  );

export const listProjects = (token: string) =>
  requestWithTokenRefresh(token, (accessToken) =>
    apiClient.get("projects", {
      headers: headers(accessToken),
      searchParams: { limit: 100, offset: 0 },
    }).json<ProjectListResponse>(),
  );

export const uploadProjectSnapshot = (
  token: string,
  projectId: string,
  files: SnapshotFile[],
  assetPaths: string[] = [],
  expectedSnapshotId?: string,
) => requestWithTokenRefresh(token, (accessToken) =>
  apiClient.put(`projects/${encodeURIComponent(projectId)}/snapshot`, {
    headers: {
      ...headers(accessToken),
      ...(expectedSnapshotId
        ? { "X-ForgePath-Expected-Snapshot-Id": expectedSnapshotId }
        : {}),
    },
    json: { files, asset_paths: assetPaths },
    timeout: 120_000,
  }).json<SnapshotReceipt>(),
);

export const startProjectReview = (token: string, projectId: string) =>
  requestWithTokenRefresh(token, (accessToken) =>
    apiClient.post(`projects/${encodeURIComponent(projectId)}/reviews`, {
      headers: headers(accessToken),
    }).json<ProjectReview>(),
  );

export const getLatestProjectReview = (token: string, projectId: string) =>
  requestWithTokenRefresh(token, (accessToken) =>
    apiClient.get(`projects/${encodeURIComponent(projectId)}/reviews/latest`, {
      headers: headers(accessToken),
    }).json<ProjectReview | null>(),
  );

export const activeProjectStorageKey = (userId: string) =>
  `forgepath:active-project:${userId}`;

import { apiClient } from "./Auth";

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
  asset_paths: string[];
  project_id: string;
  snapshot_id: string;
  file_count: number;
  total_bytes: number;
  sha256: string;
  status: string;
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
  apiClient.post("projects", {
    headers: headers(token),
    json: { name },
  }).json<ActivatedProject>();

export const getProject = (token: string, projectId: string) =>
  apiClient.get(`projects/${projectId}`, {
    headers: headers(token),
  }).json<ActivatedProject>();

export const listProjects = (token: string) =>
  apiClient
    .get("projects", {
      headers: headers(token),
      searchParams: {
        limit: 100,
        offset: 0,
      },
    })
    .json<ProjectListResponse>();

export const uploadProjectSnapshot = (
  token: string,
  projectId: string,
  files: SnapshotFile[],
  assetPaths: string[] = [],
) => apiClient.put(`projects/${projectId}/snapshot`, {
  headers: headers(token),
  json: {
    files,
    asset_paths: assetPaths,
  },
  timeout: 120_000,
}).json<SnapshotReceipt>();

export const startProjectReview = (token: string, projectId: string) =>
  apiClient.post(`projects/${projectId}/reviews`, {
    headers: headers(token),
  }).json<ProjectReview>();

export const getLatestProjectReview = (
  token: string,
  projectId: string,
) =>
  apiClient
    .get(`projects/${projectId}/reviews/latest`, {
      headers: headers(token),
    })
    .json<ProjectReview | null>();

export const activeProjectStorageKey = (userId: string) =>
  `forgepath:active-project:${userId}`;

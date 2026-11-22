import { HTTPError } from "ky";

import { apiClient } from "./Auth";
import { getTaskHistory } from "./Tasks";
import type { FileNode } from "./Workspace";
import { useAuthStore } from "../store/useAuthStore";

export interface CodebaseSource {
  name: string;
  workspaceRoot: string;
}

export interface SearchHit {
  relative_path: string;
  language: string;
  chunk_index: number;
  start_line: number;
  end_line: number;
  content: string;
  distance: number | null;
}

export interface CodeSearchResponse {
  workspace_root: string;
  query: string;
  result_count: number;
  results: SearchHit[];
}

export interface CodeSearchRequest {
  workspace_root: string;
  query: string;
  top_k?: number;
}

const withAuthentication = async <T>(
  token: string,
  request: (accessToken: string) => Promise<T>,
): Promise<T> => {
  const initialToken = useAuthStore.getState().token || token;

  try {
    return await request(initialToken);
  } catch (error) {
    if (
      !(error instanceof HTTPError) ||
      error.response.status !== 401
    ) {
      throw error;
    }

    const latestToken = useAuthStore.getState().token;

    if (latestToken && latestToken !== initialToken) {
      return request(latestToken);
    }

    // Reuse the existing refresh/rotation behavior.
    await getTaskHistory(initialToken, 0, 1);

    const refreshedToken = useAuthStore.getState().token;

    if (!refreshedToken) {
      throw error;
    }

    return request(refreshedToken);
  }
};

export const getCodebaseSources = async (
  token: string,
): Promise<CodebaseSource[]> => {
  return withAuthentication(token, async (accessToken) => {
    const tree = await apiClient
      .get("workspace/tree", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .json<FileNode>();

    // The backend returns a virtual "workspaces" root.
    // Only its immediate children are configured roots.
    // Do not allow arbitrary filesystem path input here.
    return (tree.children ?? [])
      .filter(
        (node) =>
          node.is_dir &&
          typeof node.workspace_root === "string" &&
          node.workspace_root.length > 0,
      )
      .map((node) => ({
        name: node.name,
        workspaceRoot: node.workspace_root as string,
      }));
  });
};

export const searchCodebase = async (
  token: string,
  payload: CodeSearchRequest,
): Promise<CodeSearchResponse> => {
  return withAuthentication(token, (accessToken) =>
    apiClient
      .post("workspace/search", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        json: {
          workspace_root: payload.workspace_root,
          query: payload.query,
          top_k: payload.top_k ?? 6,
        },
        timeout: 60_000,
      })
      .json<CodeSearchResponse>(),
  );
};

/** Search the active project's saved snapshot, never an OS filesystem path. */
export const searchProjectCodebase = async (
  token: string,
  projectId: string,
  query: string,
  topK = 6,
): Promise<CodeSearchResponse> => withAuthentication(token, (accessToken) =>
  apiClient.post(`projects/${encodeURIComponent(projectId)}/search`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    json: { query, top_k: topK },
    timeout: 60_000,
  }).json<CodeSearchResponse>(),
);

export type ProjectReferenceCandidate = {
  source_path: string;
  line: number;
  specifier: string;
  kind: "import" | "svg_asset" | "python_import";
  candidate_paths: string[];
};

export type ProjectReferenceReport = {
  project_id: string;
  snapshot_id: string;
  files_in_snapshot: number;
  svg_paths_in_manifest: number;
  references_checked: number;
  references_resolved: number;
  references_unresolved: number;
  results_truncated: boolean;
  missing_candidates: ProjectReferenceCandidate[];
  limitations: string;
};

export const getProjectReferenceReport = (
  token: string,
  projectId: string,
  limit = 100,
): Promise<ProjectReferenceReport> =>
  withAuthentication(token, (accessToken) =>
    apiClient
      .get(
        `projects/${encodeURIComponent(projectId)}/references`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          searchParams: { limit },
          timeout: 60_000,
        },
      )
      .json<ProjectReferenceReport>(),
  );

export type SemanticIndexStatus = {
  status: "disabled" | "not_indexed" | "ready";
  snapshot_id: string;
  file_count: number;
  estimated_chunks: number | null;
  embedding_model?: string;
  message?: string;
};

export type SemanticIndexPreview = {
  snapshot_id: string;
  file_count: number;
  estimated_chunks: number;
  max_chunks: number;
  embedding_model: string;
  requires_confirmation: boolean;
  within_limit: boolean;
  ai_calls: number;
};

export type SemanticIndexJob = {
  job_id: string;
  project_id: string;
  snapshot_id: string;
  status: "queued" | "running" | "completed" | "failed" | "interrupted";
  files_done: number;
  total_files: number;
  chunks_embedded: number;
  estimated_chunks: number;
  message: string;
  created_at: string;
  updated_at: string;
};

export const getProjectSemanticIndexStatus = (token: string, projectId: string) =>
  withAuthentication(token, (accessToken) => apiClient.get(
    `projects/${encodeURIComponent(projectId)}/semantic-index`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  ).json<SemanticIndexStatus>());

export const previewProjectSemanticIndex = (token: string, projectId: string) =>
  withAuthentication(token, (accessToken) => apiClient.post(
    `projects/${encodeURIComponent(projectId)}/semantic-index/preview`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  ).json<SemanticIndexPreview>());

export const createProjectSemanticIndex = (
  token: string, projectId: string, snapshotId: string,
) => withAuthentication(token, (accessToken) => apiClient.post(
  `projects/${encodeURIComponent(projectId)}/semantic-index`,
  {
    headers: { Authorization: `Bearer ${accessToken}` },
    json: { expected_snapshot_id: snapshotId, confirm_indexing: true },
    timeout: 600_000,
  },
).json<{ status: "ready"; snapshot_id: string; vectors_upserted: number; chunks_embedded: number }>());

export const startProjectSemanticIndexJob = (token: string, projectId: string, snapshotId: string) =>
  withAuthentication(token, (accessToken) => apiClient.post(
    `projects/${encodeURIComponent(projectId)}/semantic-index/jobs`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      json: { expected_snapshot_id: snapshotId, confirm_indexing: true },
      timeout: 60_000,
    },
  ).json<SemanticIndexJob>());

export const getProjectSemanticIndexJob = (token: string, projectId: string, jobId: string) =>
  withAuthentication(token, (accessToken) => apiClient.get(
    `projects/${encodeURIComponent(projectId)}/semantic-index/jobs/${encodeURIComponent(jobId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  ).json<SemanticIndexJob>());

export const getLatestProjectSemanticIndexJob = (token: string, projectId: string) =>
  withAuthentication(token, (accessToken) => apiClient.get(
    `projects/${encodeURIComponent(projectId)}/semantic-index/jobs/latest`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  ).json<SemanticIndexJob | null>());

export const searchProjectSemanticIndex = (
  token: string, projectId: string, query: string,
  topK = 6,
): Promise<CodeSearchResponse> => withAuthentication(token, async (accessToken) => {
  const response = await apiClient.post(
    `projects/${encodeURIComponent(projectId)}/semantic-search`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      json: { query, top_k: topK },
      timeout: 90_000,
    },
  ).json<{ query: string; result_count: number; results: {
    relative_path: string; content: string; start_line: number;
    end_line: number; distance: number | null;
  }[] }>();
  return {
    workspace_root: `project:${projectId}`,
    query: response.query,
    result_count: response.result_count,
    results: response.results.map((hit, index) => ({
      ...hit,
      language: hit.relative_path.split(".").at(-1) ?? "",
      chunk_index: index,
    })),
  };
});

export const getCodeIntelligenceError = async (
  error: unknown,
): Promise<string> => {
  if (error instanceof HTTPError) {
    const status = error.response.status;

    if (status === 401) {
      return "Your session has expired. Please sign in again.";
    }

    if (status === 403) {
      return "Access to this codebase is not permitted.";
    }

    if (status === 404) {
      return "The requested Code Intelligence endpoint was not found.";
    }

    if (status === 502) {
      return "The embedding provider could not process this search.";
    }

    if (status === 503) {
      return "Code Intelligence is not configured on the backend.";
    }

    try {
      const body = (await error.response.clone().json()) as {
        detail?: unknown;
      };

      if (typeof body.detail === "string") {
        return body.detail;
      }
    } catch {
      // Keep the HTTP status fallback.
    }

    return `Request failed (${status}).`;
  }

  return error instanceof Error
    ? error.message
    : "Code Intelligence is currently unavailable.";
};
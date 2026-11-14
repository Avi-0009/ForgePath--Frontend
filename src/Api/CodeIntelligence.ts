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
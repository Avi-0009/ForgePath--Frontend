import { apiClient } from "./Auth";

export interface Repository {
  id: string;
  name: string;
  source_type: "local" | "git";
  path: string;
  file_count: number;
  status: "indexed" | "indexing" | "refresh_needed" | "error";
  last_indexed: string;
  tech_stack: string[];
}

export interface IngestionConfig {
  repo_id: string;
  exclude_patterns: string[];
  max_file_size_kb: number;
}

export const GetRepositories = async (token: string): Promise<Repository[]> => {
  return apiClient.get("repositories", {
    headers: { Authorization: `Bearer ${token}` }
  }).json<Repository[]>();
};

export const AddRepository = async (token: string, path: string, sourceType: "local" | "git"): Promise<Repository> => {
  return apiClient.post("repositories", {
    headers: { Authorization: `Bearer ${token}` },
    json: { path, source_type: sourceType }
  }).json<Repository>();
};

export const TriggerIndexing = async (token: string, repoId: string, config: IngestionConfig) => {
  return apiClient.post(`repositories/${repoId}/index`, {
    headers: { Authorization: `Bearer ${token}` },
    json: config
  }).json();
};
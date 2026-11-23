import { apiClient } from "./Auth";
import type { ContextFilePreview, ContextInvestigationReport } from "./Review";

export interface ProjectConversationSummary {
  id: string;
  project_id: string;
  snapshot_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  revision: number;
  stale: boolean;
}

export interface ProjectConversationTurn {
  ordinal: number;
  question: string;
  report: ContextInvestigationReport;
  created_at: string;
}

export interface ProjectConversationThread extends ProjectConversationSummary {
  turns: ProjectConversationTurn[];
}

export interface ProjectConversationList {
  project_id: string;
  current_snapshot_id: string;
  items: ProjectConversationSummary[];
  ai_calls: 0;
}

export interface ProjectConversationPreview {
  project_id: string;
  conversation_id: string;
  snapshot_id: string;
  revision: number;
  selected_files: ContextFilePreview[];
  total_files: number;
  graph_edges: number;
  candidate_files: number;
  semantic_hits_verified: number;
  context_chars: number;
  estimated_tokens: number;
  selection_method: string;
  prior_turns: number;
  ai_calls: 0;
  semantic_preview_note: string;
}

export interface ProjectConversationRunResult {
  conversation_id: string;
  revision: number;
  turn: ProjectConversationTurn;
  ai_calls: number;
}

const base = (projectId: string): string =>
  `projects/${encodeURIComponent(projectId)}/investigation/conversations`;

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

export const ListProjectConversations = (token: string, projectId: string) =>
  apiClient.get(base(projectId), { headers: authHeaders(token) })
    .json<ProjectConversationList>();

export const CreateProjectConversation = (token: string, projectId: string, snapshotId: string) =>
  apiClient.post(base(projectId), {
    headers: authHeaders(token),
    json: { expected_snapshot_id: snapshotId },
  }).json<ProjectConversationThread>();

export const GetProjectConversation = (token: string, projectId: string, threadId: string) =>
  apiClient.get(`${base(projectId)}/${encodeURIComponent(threadId)}`, {
    headers: authHeaders(token),
  }).json<ProjectConversationThread>();

export const DeleteProjectConversation = (token: string, projectId: string, threadId: string) =>
  apiClient.delete(`${base(projectId)}/${encodeURIComponent(threadId)}`, {
    headers: authHeaders(token),
  });

export const PreviewProjectConversation = (
  token: string, projectId: string, threadId: string,
  question: string, maxFiles: number, revision: number,
) => apiClient.post(`${base(projectId)}/${encodeURIComponent(threadId)}/preview`, {
  headers: authHeaders(token),
  json: { question, max_files: maxFiles, expected_revision: revision },
  timeout: 60_000,
}).json<ProjectConversationPreview>();

export const RunProjectConversation = (
  token: string, projectId: string, threadId: string,
  question: string, maxFiles: number, revision: number,
  snapshotId: string, useSemanticIndex: boolean,
) => apiClient.post(`${base(projectId)}/${encodeURIComponent(threadId)}/message`, {
  headers: authHeaders(token),
  json: {
    question,
    max_files: maxFiles,
    expected_revision: revision,
    expected_snapshot_id: snapshotId,
    use_semantic_index: useSemanticIndex,
  },
  timeout: 270_000,
}).json<ProjectConversationRunResult>();
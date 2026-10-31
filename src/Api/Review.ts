import { apiClient } from "./Auth";

export interface CodeReviewRequest {
    file_path: string;
    custom_instructions?: string;
}

export interface CodeReviewFileRequest {
  workspace_root: string;
  relative_path: string;
  review_mode?: "general" | "dsa" | "bug_hunt" | "security" | "quality";
  task_description?: string;
  additional_context?: string;
}

export interface CodeReviewFileResponse {
  relative_path: string;
  language: string | null;
  sha256: string;
  size_bytes: number;
  line_count: number;
  review: {
    summary: string;
    findings: Array<{
      severity: string;
      category: string;
      title: string;
      line_start: number | null;
      line_end: number | null;
      evidence: string;
      explanation: string;
      suggested_fix: string | null;
    }>;
    strengths: string[];
    suggested_tests: string[];
  };
}

export const InitiateCodeReview = async (
  token: string,
  data: CodeReviewFileRequest
): Promise<CodeReviewFileResponse> => {
  return apiClient
    .post("code-review/file", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      json: data,
    })
    .json<CodeReviewFileResponse>();
};

export const ApplyCodePatch = async (
    token: string,
    reviewId: string
) => {
    return apiClient
        .post(`code-patch/${reviewId}/apply`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }).json();
};
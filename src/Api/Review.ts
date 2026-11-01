import { apiClient } from "./Auth";

export interface CodeReviewFileRequest {
  workspace_root: string;
  relative_path: string;
  review_mode?: "general" | "dsa" | "bug_hunt" | "security" | "quality";
  task_description?: string;
  additional_context?: string;
}

export interface ReviewFinding {
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  line_start: number | null;
  line_end: number | null;
  evidence: string;
  explanation: string;
  suggested_fix: string | null;
}

export interface CodeReviewFileResponse {
  relative_path: string;
  language: string | null;
  sha256: string;
  size_bytes: number;
  line_count: number;
  review: {
    summary: string;
    findings: ReviewFinding[];
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
      timeout: 270_000,
    })
    .json<CodeReviewFileResponse>();
};

export interface CodePatchRequest {
  workspace_root: string;
  relative_path: string;
  expected_sha256: string;

  finding_title: string;
  finding_evidence: string;
  finding_explanation: string;
  suggested_fix: string;

  additional_context?: string | null;
}

export interface CodePatchResponse {
  relative_path: string;
  original_sha256: string;
  proposed_sha256: string;

  original_line_count: number;
  proposed_line_count: number;

  summary: string;
  diff: string;
  proposed_code: string;
  patch_applied: boolean;
}

export const GenerateCodePatch = async (
  token: string,
  data: CodePatchRequest
): Promise<CodePatchResponse> => {
  return apiClient
    .post("code-patch", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      json: data,
      timeout: 270_000,
    })
    .json<CodePatchResponse>();
};

export interface CodePatchApplyRequest {
  workspace_root: string;
  relative_path: string;

  expected_sha256: string;
  proposed_sha256: string;

  proposed_code: string;

  approval: "apply";
}

export interface CodePatchApplyResponse {
  relative_path: string;
  original_sha256: string;
  applied_sha256: string;
  backup_id: string;
  patch_applied: boolean;
}

export const ApplyCodePatch = async (
  token: string,
  data: CodePatchApplyRequest
): Promise<CodePatchApplyResponse> => {
  return apiClient
    .post("code-patch/apply", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      json: data,
      timeout: 60_000,
    })
    .json<CodePatchApplyResponse>();
};
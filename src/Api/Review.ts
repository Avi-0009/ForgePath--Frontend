import { apiClient } from "./Auth";

export interface CodeReviewRequest {
    file_path: string;
    custom_instructions?: string;
}

export interface CodeReviewResponse {
    id: string;
    file_path: string;
    original_content: string;
    reviewed_content: string;
    diff_patch: string;
    status: string;
    created_at: string;
}

export const InitiateCodeReview = async (
  token: string, 
  data: CodeReviewRequest
): Promise<CodeReviewResponse> => {
  return apiClient
    .post("code-review", {
      headers: {
        Authorization: `Bearer ${token}`
      },
      json: data
    })
    .json<CodeReviewResponse>();
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
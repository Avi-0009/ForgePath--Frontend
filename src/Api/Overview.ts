import { apiClient } from "./Auth";
import { requestWithTokenRefresh } from "./AuthenticatedRequest";

export interface OverviewTestSummary {
  total_test_runs: number;
  passed_test_runs: number;
  failed_test_runs: number;
  timed_out_test_runs: number;
  errored_test_runs: number;
}

async function requestSummary(
  token: string,
): Promise<OverviewTestSummary> {
  return apiClient
    .get("ai/usage/summary", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .json<OverviewTestSummary>();
}

export async function getOverviewTestSummary(
  token: string,
): Promise<OverviewTestSummary> {
  return requestWithTokenRefresh(token, requestSummary);
}

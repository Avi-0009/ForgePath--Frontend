import { HTTPError } from "ky";

import { apiClient } from "./Auth";
import { getTaskHistory } from "./Tasks";
import { useAuthStore } from "../store/useAuthStore";

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
  const initialToken =
    useAuthStore.getState().token || token;

  try {
    return await requestSummary(initialToken);
  } catch (error) {
    if (
      !(error instanceof HTTPError) ||
      error.response.status !== 401
    ) {
      throw error;
    }

    await getTaskHistory(initialToken, 0, 1);

    const refreshedToken = useAuthStore.getState().token;

    if (!refreshedToken) {
      throw error;
    }

    return requestSummary(refreshedToken);
  }
}
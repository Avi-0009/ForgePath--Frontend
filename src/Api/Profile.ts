import { HTTPError } from "ky";

import { apiClient, type UserResponse } from "./Auth";
import { requestWithTokenRefresh } from "./AuthenticatedRequest";

type ProfileUpdate = {
  full_name: string;
  username: string;
};

export const updateProfile = async (
  token: string,
  update: ProfileUpdate,
): Promise<UserResponse> => {
  try {
    return await requestWithTokenRefresh(token, (accessToken) =>
      apiClient.patch("auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
        json: update,
      }).json<UserResponse>()
    );
  } catch (error) {
    if (error instanceof HTTPError) {
      const payload = await error.response.clone().json<{ detail?: string }>().catch(() => null);
      throw new Error(payload?.detail || "Could not update your profile.", { cause: error });
    }
    throw error;
  }
};

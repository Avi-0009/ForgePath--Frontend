import { apiClient } from "./Auth";
import { requestWithTokenRefresh } from "./AuthenticatedRequest";

export type AIProvider = "nvidia" | "openai" | "huggingface";

export interface AIConfiguration {
  provider: AIProvider | null;
  model_identifier: string | null;
  has_api_key: boolean;
}

const authorization = (token: string) => ({ Authorization: `Bearer ${token}` });

export const getAIConfiguration = (token: string) =>
  requestWithTokenRefresh(token, (accessToken) =>
    apiClient
      .get("ai/configuration", {
        headers: authorization(accessToken),
      })
      .json<AIConfiguration>()
  );

export const saveAIConfiguration = (
  token: string,
  provider: AIProvider,
  modelIdentifier: string,
  apiKey: string,
) =>
  requestWithTokenRefresh(token, (accessToken) =>
    apiClient
      .put("ai/configuration", {
        headers: authorization(accessToken),
        json: {
          provider,
          model_identifier: modelIdentifier,
          ...(apiKey ? { api_key: apiKey } : {}),
        },
      })
      .json<AIConfiguration>()
  );

export const testAIConfiguration = (token: string) =>
  requestWithTokenRefresh(token, (accessToken) =>
    apiClient
      .post("ai/configuration/test", {
        headers: authorization(accessToken),
        timeout: 260_000,
      })
      .json<{ connected: boolean }>()
  );

export const deleteAIConfiguration = (token: string) =>
  requestWithTokenRefresh(token, (accessToken) =>
    apiClient.delete("ai/configuration", {
      headers: authorization(accessToken),
    })
  );

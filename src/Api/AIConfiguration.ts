import { apiClient } from "./Auth";

export interface AIConfiguration {
  provider: string | null;
  model_identifier: string | null;
  has_api_key: boolean;
}

const authorization = (token: string) => ({ Authorization: `Bearer ${token}` });

export const getAIConfiguration = (token: string) =>
  apiClient.get("ai/configuration", { headers: authorization(token) }).json<AIConfiguration>();

export const saveAIConfiguration = (
  token: string,
  provider: string,
  modelIdentifier: string,
  apiKey: string,
) => apiClient.put("ai/configuration", {
  headers: authorization(token),
  json: {
    provider,
    model_identifier: modelIdentifier,
    ...(apiKey ? { api_key: apiKey } : {}),
  },
}).json<AIConfiguration>();

export const testAIConfiguration = (token: string) =>
  apiClient.post("ai/configuration/test", {
    headers: authorization(token),
    timeout: 260_000,
  }).json<{ connected: boolean }>();

export const deleteAIConfiguration = (token: string) =>
  apiClient.delete("ai/configuration", { headers: authorization(token) });
import { apiClient } from "./Auth";
import { requestWithTokenRefresh } from "./AuthenticatedRequest";

export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
  workspace_root?: string | null;
  relative_path?: string;
  truncated?: boolean;
}

export const GetWorkspaceTree = async (
  token: string,
): Promise<FileNode> => {
  return requestWithTokenRefresh(token, (accessToken) =>
    apiClient
      .get("workspace/tree", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .json<FileNode>(),
  );
};

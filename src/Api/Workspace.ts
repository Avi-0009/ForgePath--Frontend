import { apiClient } from "./Auth";

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
  return apiClient
    .get("workspace/tree", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .json<FileNode>();
};
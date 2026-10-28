import { apiClient } from "./Auth"

export interface FileNode {
    name: string,
    path: string,
    is_dir: boolean,
    children?: FileNode[];
}

export const GetWorkspaceTree = async (token: string): Promise<FileNode> => {
    return apiClient
        .get("local_context/tree", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        .json<FileNode>();
};
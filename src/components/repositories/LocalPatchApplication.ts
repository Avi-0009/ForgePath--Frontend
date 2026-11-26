import {
  prepareProjectReviewTaskPatchApplication,
  type ProjectReviewTask,
} from "../../Api/ProjectReviewTasks";
import {
  uploadProjectSnapshot,
  type SnapshotReceipt,
} from "../../Api/ProjectActivation";
import {
  collectLocalSnapshot,
  computeSnapshotSha256,
  decodeSourceBytes,
  sha256Text,
} from "./LocalSnapshot";
import {
  getSavedFolder,
  requestFolderWritePermission,
} from "./SavedFolderAccess";

type WritableFileHandle = FileSystemFileHandle & {
  createWritable: (options?: { keepExistingData?: boolean }) => Promise<{
    write: (data: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

const safePathParts = (relativePath: string): string[] => {
  if (!relativePath || relativePath.includes("\\") || relativePath.includes(":")) {
    throw new Error("The patch contains an unsafe file path.");
  }
  const parts = relativePath.split("/");
  if (parts.some((part) => !part || part === "." || part === ".." || part.startsWith("."))) {
    throw new Error("The patch contains an unsafe file path.");
  }
  return parts;
};

const existingFileHandle = async (
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<FileSystemFileHandle> => {
  const parts = safePathParts(relativePath);
  let directory = root;
  for (const part of parts.slice(0, -1)) {
    directory = await directory.getDirectoryHandle(part, { create: false });
  }
  return directory.getFileHandle(parts.at(-1)!, { create: false });
};

const readNormalizedFile = async (
  handle: FileSystemFileHandle,
  relativePath: string,
): Promise<string> => {
  const file = await handle.getFile();
  const extension = relativePath.toLowerCase().split(".").at(-1) ?? "";
  const content = decodeSourceBytes(new Uint8Array(await file.arrayBuffer()), extension);
  if (content === null) throw new Error("The target file is not supported text source.");
  return content;
};

const replaceFile = async (handle: FileSystemFileHandle, content: string): Promise<void> => {
  const writable = await (handle as WritableFileHandle).createWritable({
    keepExistingData: false,
  });
  await writable.write(content);
  await writable.close();
};

export const applyApprovedPatchToSavedFolder = async (
  token: string,
  userId: string,
  projectId: string,
  task: ProjectReviewTask,
): Promise<SnapshotReceipt> => {
  const savedFolder = await getSavedFolder(userId, projectId);
  if (!savedFolder) {
    throw new Error("Reconnect this project's local folder before applying the patch.");
  }

  const authorization = await prepareProjectReviewTaskPatchApplication(
    token,
    projectId,
    task,
  );
  if (authorization.project_id !== projectId || authorization.task_id !== task.id) {
    throw new Error("The server returned a mismatched patch authorization.");
  }
  if (authorization.snapshot_id !== task.snapshot_id ||
      authorization.relative_path !== task.path ||
      authorization.proposed_sha256 !== task.patch?.proposed_sha256) {
    throw new Error("The server returned a changed patch authorization. Refresh this task.");
  }

  const currentSnapshot = await collectLocalSnapshot(savedFolder.handle);
  const currentSnapshotHash = await computeSnapshotSha256(currentSnapshot.files);
  if (currentSnapshotHash !== authorization.snapshot_sha256) {
    throw new Error(
      "The local folder has changed since this patch was generated. Upload a fresh snapshot first.",
    );
  }

  if (await requestFolderWritePermission(savedFolder.handle) !== "granted") {
    throw new Error("Write access to the selected local folder was not granted.");
  }

  const confirmedAuthorization = await prepareProjectReviewTaskPatchApplication(
    token,
    projectId,
    task,
  );
  if (confirmedAuthorization.snapshot_id !== authorization.snapshot_id ||
      confirmedAuthorization.snapshot_sha256 !== authorization.snapshot_sha256 ||
      confirmedAuthorization.relative_path !== authorization.relative_path ||
      confirmedAuthorization.original_sha256 !== authorization.original_sha256 ||
      confirmedAuthorization.proposed_sha256 !== authorization.proposed_sha256 ||
      confirmedAuthorization.proposed_code !== authorization.proposed_code) {
    throw new Error("The approved patch changed during verification. Refresh this task.");
  }

  const target = await existingFileHandle(savedFolder.handle, authorization.relative_path);
  const originalContent = await readNormalizedFile(target, authorization.relative_path);
  if (await sha256Text(originalContent) !== authorization.original_sha256) {
    throw new Error("The target file changed before the patch could be applied.");
  }
  if (await sha256Text(authorization.proposed_code) !== authorization.proposed_sha256) {
    throw new Error("The authorized patch failed its integrity check.");
  }

  try {
    await replaceFile(target, authorization.proposed_code);
    const writtenContent = await readNormalizedFile(target, authorization.relative_path);
    if (await sha256Text(writtenContent) !== authorization.proposed_sha256) {
      throw new Error("The browser could not verify the updated file.");
    }
  } catch (error) {
    try {
      await replaceFile(target, originalContent);
      const restoredContent = await readNormalizedFile(target, authorization.relative_path);
      if (await sha256Text(restoredContent) !== authorization.original_sha256) {
        throw new Error("The restored file did not match its original hash.", { cause: error });
      }
    } catch (restoreError) {
      throw new Error(
        "Patch verification failed and ForgePath could not restore the original file. Inspect it immediately.",
        { cause: restoreError },
      );
    }
    throw error;
  }

  let updatedSnapshot;
  try {
    updatedSnapshot = await collectLocalSnapshot(savedFolder.handle);
  } catch (error) {
    try {
      await replaceFile(target, originalContent);
      const restoredContent = await readNormalizedFile(target, authorization.relative_path);
      if (await sha256Text(restoredContent) !== authorization.original_sha256) {
        throw new Error("The restored file did not match its original hash.", { cause: error });
      }
    } catch (restoreError) {
      throw new Error(
        "The updated folder was unsafe to snapshot and ForgePath could not restore the original file. Inspect it immediately.",
        { cause: restoreError },
      );
    }
    throw new Error(
      "The patch was rolled back because the updated folder could not form a safe snapshot.",
      { cause: error },
    );
  }
  try {
    const receipt = await uploadProjectSnapshot(
      token,
      projectId,
      updatedSnapshot.files,
      updatedSnapshot.assetPaths,
      authorization.snapshot_id,
    );
    if (!receipt.applied_patch_task_ids.includes(task.id)) {
      throw new Error("The updated snapshot did not reconcile the approved patch.");
    }
    return receipt;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "snapshot upload failed";
    throw new Error(
      `The local file was updated, but ForgePath could not sync the new snapshot: ${reason}. ` +
      "Use Re-snapshot on Repositories to finish syncing it.",
      { cause: error },
    );
  }
};

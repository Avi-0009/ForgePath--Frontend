/* Browser-local folder references. No file contents are stored in IndexedDB. */

export type SavedFolderAccess = {
  id: string;
  userId: string;
  projectId: string;
  folderName: string;
  handle: FileSystemDirectoryHandle;
};

export const filterSavedFoldersForUser = (
  entries: SavedFolderAccess[],
  userId: string,
): SavedFolderAccess[] => entries.filter((entry) =>
  entry.userId === userId &&
  entry.id === `${userId}:${entry.projectId}`
);

const DATABASE_NAME = "forgepath-folder-permissions";
const STORE_NAME = "folders";

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const transact = async <T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const request = operation(transaction.objectStore(STORE_NAME));
      let result: T;
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
};

export const listSavedFolders = async (userId: string): Promise<SavedFolderAccess[]> =>
  filterSavedFoldersForUser(
    await transact("readonly", (store) => store.getAll()) as SavedFolderAccess[],
    userId,
  );

export const getSavedFolder = async (
  userId: string,
  projectId: string,
): Promise<SavedFolderAccess | null> => {
  const result = await transact(
    "readonly",
    (store) => store.get(`${userId}:${projectId}`),
  ) as SavedFolderAccess | undefined;
  return result?.userId === userId && result.projectId === projectId ? result : null;
};

export const saveFolder = async (
  userId: string,
  projectId: string,
  handle: FileSystemDirectoryHandle,
): Promise<void> => {
  await transact("readwrite", (store) => store.put({
    id: `${userId}:${projectId}`,
    userId,
    projectId,
    folderName: handle.name,
    handle,
  } satisfies SavedFolderAccess));
};

export const forgetFolder = async (userId: string, projectId: string): Promise<void> => {
  await transact("readwrite", (store) => store.delete(`${userId}:${projectId}`));
};

type FolderPermissionMode = "read" | "readwrite";

type PermissionAwareHandle = FileSystemDirectoryHandle & {
  queryPermission: (options: { mode: FolderPermissionMode }) => Promise<PermissionState>;
  requestPermission: (options: { mode: FolderPermissionMode }) => Promise<PermissionState>;
};

export const folderPermission = async (
  handle: FileSystemDirectoryHandle,
  request = false,
): Promise<PermissionState> => {
  const browserHandle = handle as PermissionAwareHandle;
  const method = request ? browserHandle.requestPermission : browserHandle.queryPermission;
  if (typeof method !== "function") return "prompt";
  return method.call(browserHandle, { mode: "read" });
};

export const requestFolderWritePermission = async (
  handle: FileSystemDirectoryHandle,
): Promise<PermissionState> => {
  const browserHandle = handle as PermissionAwareHandle;
  if (typeof browserHandle.requestPermission !== "function") return "denied";
  return browserHandle.requestPermission({ mode: "readwrite" });
};

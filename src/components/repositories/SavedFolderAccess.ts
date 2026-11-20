/* Browser-local folder references. No file contents are stored in IndexedDB. */

export type SavedFolderAccess = {
  id: string;
  userId: string;
  projectId: string;
  folderName: string;
  handle: FileSystemDirectoryHandle;
};

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
  (await transact("readonly", (store) => store.getAll()) as SavedFolderAccess[])
    .filter((entry) => entry.userId === userId);

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

type PermissionAwareHandle = FileSystemDirectoryHandle & {
  queryPermission: (options: { mode: "read" }) => Promise<PermissionState>;
  requestPermission: (options: { mode: "read" }) => Promise<PermissionState>;
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
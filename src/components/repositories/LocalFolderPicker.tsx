import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileCode2,
  Folder,
  FolderOpen,
  LoaderCircle,
  LockKeyhole,
  X,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import {
  createProject,
  getProject,
  getLatestProjectReview,
  startProjectReview,
  uploadProjectSnapshot,
  listProjects,
  type ActivatedProject,
  type ProjectReview,
  type SnapshotReceipt,
} from "../../Api/ProjectActivation";
import { collectLocalSnapshot } from "./LocalSnapshot";
import {
  folderPermission,
  forgetFolder,
  listSavedFolders,
  saveFolder,
  type SavedFolderAccess,
} from "./SavedFolderAccess";
import { setActiveProjectId, useActiveProjectId } from "../../store/useActiveProjectId";

type BrowserWithPicker = Window & {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: "read" | "readwrite";
  }) => Promise<FileSystemDirectoryHandle>;
};

type Entry = {
  name: string;
  kind: "file" | "directory";
  handle: FileSystemHandle;
};

type FolderLocation = {
  name: string;
  handle: FileSystemDirectoryHandle;
};

const MAX_ENTRIES = 300;
const MAX_PREVIEW_BYTES = 512 * 1024;

const blockedDirectories = new Set([
  ".git",
  ".svn",
  ".hg",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".nuxt",
  ".venv",
  "venv",
  "__pycache__",
  ".pytest_cache",
  "coverage",
  "vendor",
  "target",
]);

const blockedFileNames = new Set([
  ".env",
  ".npmrc",
  ".pypirc",
  ".netrc",
  "id_rsa",
  "id_ed25519",
  "credentials",
  "credentials.json",
  "secrets.json",
  "config.json.secret",
]);

const blockedExtensions = [
  ".pem",
  ".key",
  ".p12",
  ".pfx",
  ".jks",
  ".keystore",
  ".sqlite",
  ".db",
  ".exe",
  ".dll",
  ".bin",
  ".zip",
  ".7z",
  ".rar",
];

const allowedPreviewExtensions = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "py",
  "go",
  "rs",
  "java",
  "kt",
  "c",
  "h",
  "cpp",
  "hpp",
  "cs",
  "rb",
  "php",
  "swift",
  "html",
  "css",
  "scss",
  "json",
  "yaml",
  "yml",
  "toml",
  "md",
  "txt",
  "sql",
  "sh",
  "ps1",
  "xml",
  "vue",
  "svelte",
]);

const isBlocked = (
  name: string,
  kind: "file" | "directory",
): boolean => {
  const lower = name.toLowerCase();

  if (kind === "directory") {
    return (
      blockedDirectories.has(lower) ||
      lower === ".ssh" ||
      lower === ".aws" ||
      lower === ".azure" ||
      lower === ".config"
    );
  }

  return (
    blockedFileNames.has(lower) ||
    lower.startsWith(".env.") ||
    lower.includes("secret") ||
    lower.includes("credential") ||
    lower.includes("private_key") ||
    blockedExtensions.some((extension) =>
      lower.endsWith(extension),
    )
  );
};

const isPreviewable = (name: string): boolean => {
  const extension = name.toLowerCase().split(".").at(-1);
  return Boolean(
    extension && allowedPreviewExtensions.has(extension),
  );
};

const listDirectory = async (
  directory: FileSystemDirectoryHandle,
): Promise<{ entries: Entry[]; truncated: boolean }> => {
  const entries: Entry[] = [];
  let truncated = false;

  const iterable = directory as unknown as {
    values: () => AsyncIterable<FileSystemHandle>;
  };

  for await (const handle of iterable.values()) {
    if (isBlocked(handle.name, handle.kind)) {
      continue;
    }

    if (entries.length >= MAX_ENTRIES) {
      truncated = true;
      break;
    }

    entries.push({
      name: handle.name,
      kind: handle.kind,
      handle,
    });
  }

  entries.sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === "directory" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return { entries, truncated };
};

const LocalFolderPicker = () => {
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.user?.id);
  const activeProjectId = useActiveProjectId();
  const [locations, setLocations] = useState<FolderLocation[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [loadedProject, setActiveProject] =
    useState<ActivatedProject | null>(null);

  const activeProject =
    token && loadedProject?.id === activeProjectId
      ? loadedProject
      : null;

  const [receipt, setReceipt] = useState<SnapshotReceipt | null>(null);
  const [loadedReview, setReview] =
    useState<ProjectReview | null>(null);

  const review =
    token &&
    activeProject &&
    loadedReview?.project_id === activeProject.id
      ? loadedReview
      : null;

  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const [activationMessage, setActivationMessage] = useState("");

  const [ownedProjectsData, setOwnedProjectsData] =
    useState<{
      userId: string;
      items: ActivatedProject[];
    } | null>(null);

  const ownedProjects =
    ownedProjectsData &&
    userId &&
    ownedProjectsData.userId === userId
      ? ownedProjectsData.items
      : [];

  const [targetData, setTargetData] =
    useState<{
      userId: string;
      value: string;
    } | null>(null);

  const projectTarget =
    targetData &&
    userId &&
    targetData.userId === userId
      ? targetData.value
      : "";

  const setProjectTarget = (value: string) => {
    setTargetData(
      userId ? { userId, value } : null
    );
  };

  const [preparedSnapshot, setPreparedSnapshot] = useState<{
    handle: FileSystemDirectoryHandle;
    files: number;
    assetPaths: string[];
    bytes: number;
    skipped: number;
    skippedUnrecognizedText: string[];
    directories: number;
  } | null>(null);

  const [savedData, setSavedData] = useState<{
    userId: string;
    folders: SavedFolderAccess[];
    permissions: Record<string, PermissionState>;
  } | null>(null);

  const savedFolders = userId && savedData?.userId === userId
    ? savedData.folders
    : [];

  useEffect(() => {
    if (!userId || !token) return;
    let cancelled = false;

    void (async () => {
      try {
        const folders = await listSavedFolders(userId);
        const permissions: Record<string, PermissionState> = {};
        await Promise.all(folders.map(async (folder) => {
          try {
            permissions[folder.id] = await folderPermission(folder.handle);
          } catch {
            permissions[folder.id] = "denied";
          }
        }));
        if (!cancelled) setSavedData({ userId, folders, permissions });
      } catch {
        if (!cancelled) setError("Unable to load previously saved folder permissions.");
      }
    })();

    return () => { cancelled = true; };
  }, [token, userId]);

  const root = locations[0];
  const current = locations.at(-1);

  useEffect(() => {
    if (!token || !userId) {
      return;
    }

    let mounted = true;

    void listProjects(token)
      .then(({ items }) => {
        if (mounted) {
          setOwnedProjectsData({
            userId,
            items: items.filter(
              (project) => project.status !== "archived"
            ),
          });
        }
      })
      .catch(() => {
        if (mounted) {
          setOwnedProjectsData({
            userId,
            items: [],
          });
        }
      });

    return () => {
      mounted = false;
    };
  }, [token, userId]);

  useEffect(() => {
    if (!token || !userId) {
      return;
    }
    const savedId = activeProjectId;
    if (!savedId) {
      return;
    }

    let mounted = true;

    void getProject(token, savedId).then((project) => {
      if (mounted) setActiveProject(project);
    }).catch(() => {
      if (mounted) {
        setActiveProjectId(userId, null);
        setActiveProject(null);
      }
    });
    return () => { mounted = false; };
  }, [token, userId, activeProjectId]);

  useEffect(() => {
    if (!token || !activeProject?.id) {
      return;
    }
    let mounted = true;
    const refresh = async () => {
      try {
        const latest = await getLatestProjectReview(token, activeProject.id);
        if (mounted) setReview(latest);
      } catch {
        // No completed or running review yet. Project activation remains valid.
      }
    };
    void refresh();
    const poll = window.setInterval(() => void refresh(), 4000);
    return () => { mounted = false; window.clearInterval(poll); };
  }, [activeProject?.id, token]);

  const previewSelection = async () => {
    if (!current || loading) return;

    setLoading(true);
    setError("");
    setPreparedSnapshot(null);

    try {
      const snapshot = await collectLocalSnapshot(current.handle);

      setPreparedSnapshot({
        handle: current.handle,
        files: snapshot.files.length,
        assetPaths: snapshot.assetPaths,
        bytes: snapshot.totalBytes,
        skipped: snapshot.skippedFiles,
        skippedUnrecognizedText: snapshot.skippedUnrecognizedText,
        directories: snapshot.scannedDirectories,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to preview this folder.",
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmSelection = async () => {
    if (
      !current ||
      !token ||
      !userId ||
      !projectTarget ||
      loading ||
      preparedSnapshot?.handle !== current.handle
    ) {
      return;
    }

    setLoading(true);
    setError("");
    setActivationMessage("Preparing eligible source files locally…");

    try {
      const snapshot = await collectLocalSnapshot(current.handle);

      if (
        snapshot.files.length !== preparedSnapshot.files ||
        snapshot.totalBytes !== preparedSnapshot.bytes ||
        JSON.stringify(snapshot.assetPaths) !== JSON.stringify(preparedSnapshot.assetPaths) ||
        JSON.stringify(snapshot.skippedUnrecognizedText) !==
          JSON.stringify(preparedSnapshot.skippedUnrecognizedText)
      ) {
        setPreparedSnapshot(null);
        setProjectTarget("");

        throw new Error(
          "Files changed since preview. Preview the folder again before confirming.",
        );
      }

      setActivationMessage(
        `Uploading ${snapshot.files.length} permitted files…`,
      );

      const projectId =
        pendingProjectId ??
        (projectTarget === "new"
          ? (await createProject(token, current.name)).id
          : projectTarget);

      setPendingProjectId(projectId);

      const uploaded = await uploadProjectSnapshot(
        token,
        projectId,
        snapshot.files,
        snapshot.assetPaths,
      );

      const project = await getProject(token, projectId);

      setActiveProjectId(userId, project.id);
      setReceipt(uploaded);
      setActiveProject(project);

      setOwnedProjectsData((previous) => ({
        userId,
        items: [
          project,
          ...(
            previous?.userId === userId
              ? previous.items
              : []
          ).filter(
            (item) => item.id !== project.id
          ),
        ],
      }));

      setProjectTarget(project.id);
      setPreparedSnapshot(null);
      setPendingProjectId(null);

      try {
        await saveFolder(userId, project.id, current.handle);
        setSavedData((previous) => ({
          userId,
          folders: [
            {
              id: `${userId}:${project.id}`,
              userId,
              projectId: project.id,
              folderName: current.name,
              handle: current.handle,
            },
            ...(previous?.userId === userId ? previous.folders : [])
              .filter((item) => item.projectId !== project.id),
          ],
          permissions: {
            ...(previous?.userId === userId ? previous.permissions : {}),
            [`${userId}:${project.id}`]: "granted",
          },
        }));
      } catch {
        setError("Project saved, but this browser could not remember the folder handle.");
      }

      setActivationMessage(
        `${snapshot.files.length} source files saved ` +
        `(${snapshot.skippedFiles} skipped). ` +
        "Starting the initial review…",
      );

      try {
        setReview(await startProjectReview(token, project.id));

        setActivationMessage(
          "Project activated and initial codebase review queued." +
          (uploaded.applied_patch_count > 0
            ? ` Detected ${uploaded.applied_patch_count} approved patch${uploaded.applied_patch_count === 1 ? "" : "es"} in this snapshot.`
            : ""),
        );
      } catch {
        setActivationMessage(
          "Project activated. Review could not start; " +
          "check the backend migration and review service.",
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error && !("response" in cause)
          ? cause.message
          : "Project activation failed. Please check the backend and retry.",
      );

      setActivationMessage("");
    } finally {
      setLoading(false);
    }
  };

  const forgetActiveProject = () => {
    if (userId) setActiveProjectId(userId, null);
    setActiveProject(null);
    setReceipt(null);
    setReview(null);
    setActivationMessage("Active-project preference cleared. The saved project was not deleted.");
  };

  const reopenSavedFolder = async (folder: SavedFolderAccess) => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      // Request access only in response to the user's click.
      const permission = await folderPermission(folder.handle, true);
      if (permission !== "granted") {
        throw new Error("Folder access was not granted. Select it again with Open local folder.");
      }
      const result = await listDirectory(folder.handle);
      setLocations([{ name: folder.folderName, handle: folder.handle }]);
      setEntries(result.entries);
      setTruncated(result.truncated);
      setSelectedFile("");
      setPreview("");
      setPreparedSnapshot(null);
      setPendingProjectId(null);
      setProjectTarget(folder.projectId);
      setSavedData((previous) => {
        if (!previous || previous.userId !== userId) return previous;
        return {
          ...previous,
          permissions: { ...previous.permissions, [folder.id]: "granted" },
        };
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Saved folder is unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const disconnectSavedFolder = async (folder: SavedFolderAccess) => {
    if (!userId || loading) return;
    try {
      await forgetFolder(userId, folder.projectId);
      setSavedData((previous) => {
        if (!previous || previous.userId !== userId) return previous;
        return {
          ...previous,
          folders: previous.folders.filter((item) => item.id !== folder.id),
        };
      });
      if (locations.some((location) => location.handle === folder.handle)) {
        clearSelection();
      }
    } catch {
      setError("Could not forget the saved folder handle.");
    }
  };

  const openFolder = async () => {
    const picker = (window as BrowserWithPicker)
      .showDirectoryPicker;

    if (!picker || !window.isSecureContext) {
      setError(
        "This browser cannot open local folders here. " +
        "Use a supported browser on localhost or HTTPS.",
      );
      return;
    }

    try {
      // Call the picker directly from the click handler.
      const handle = await picker.call(window, {
        id: "forgepath-local-repository",
        mode: "read",
      });

      setLoading(true);
      setError("");
      setSelectedFile("");
      setPreview("");
      setPendingProjectId(null);
      setPreparedSnapshot(null);

      const result = await listDirectory(handle);

      setLocations([
        { name: handle.name, handle },
      ]);
      setEntries(result.entries);
      setTruncated(result.truncated);
    } catch (cause) {
      if (
        cause instanceof DOMException &&
        cause.name === "AbortError"
      ) {
        return;
      }

      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to open the selected folder.",
      );
    } finally {
      setLoading(false);
    }
  };

  const enterFolder = async (entry: Entry) => {
    if (entry.kind !== "directory" || loading) return;

    try {
      setLoading(true);
      setError("");

      const handle =
        entry.handle as FileSystemDirectoryHandle;
      const result = await listDirectory(handle);

      setLocations((previous) => [
        ...previous,
        { name: entry.name, handle },
      ]);
      setEntries(result.entries);
      setTruncated(result.truncated);
      setSelectedFile("");
      setPreview("");
      setPendingProjectId(null);
    } catch {
      setError("Unable to read this folder.");
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = async (index: number) => {
    const location = locations[index];
    if (!location || loading) return;

    try {
      setLoading(true);
      setError("");

      const result = await listDirectory(location.handle);

      setLocations((previous) =>
        previous.slice(0, index + 1),
      );
      setEntries(result.entries);
      setTruncated(result.truncated);
      setSelectedFile("");
      setPreview("");
      setPendingProjectId(null);
    } catch {
      setError("Unable to navigate to this folder.");
    } finally {
      setLoading(false);
    }
  };

  const openFile = async (entry: Entry) => {
    if (
      entry.kind !== "file" ||
      isBlocked(entry.name, "file")
    ) {
      return;
    }

    if (!isPreviewable(entry.name)) {
      setError("This file type is not enabled for preview.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const handle = entry.handle as FileSystemFileHandle;
      const file = await handle.getFile();

      if (file.size > MAX_PREVIEW_BYTES) {
        setError(
          "This file is too large for the local preview.",
        );
        return;
      }

      const text = await file.text();

      if (text.includes("\0")) {
        setError("Binary file preview is not permitted.");
        return;
      }

      setSelectedFile(entry.name);
      setPreview(text);
    } catch {
      setError("Unable to preview this file.");
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => {
    setLocations([]);
    setEntries([]);
    setSelectedFile("");
    setPreview("");
    setError("");
    setTruncated(false);
    setPendingProjectId(null);
    setPreparedSnapshot(null);
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-panel border border-app-line bg-app-panel shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-line p-4 sm:p-5">
        <div>
          <h2 className="text-[13px] font-bold text-app-text">
            Local folder explorer
          </h2>
          <p className="mt-1 text-2xs text-app-muted">
            Browse a repository in its original location
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {root && (
            <button
              type="button"
              onClick={clearSelection}
              className="btn"
            >
              <X size={14} />
              Clear
            </button>
          )}

          <button
            type="button"
            onClick={() => void openFolder()}
            disabled={loading}
            className="btn btn-primary disabled:opacity-50"
          >
            {loading ? (
              <LoaderCircle
                size={15}
                className="animate-spin"
              />
            ) : (
              <FolderOpen size={15} />
            )}
            Open local folder
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {savedFolders.length > 0 && (
          <section className="mb-4 rounded-lg border border-app-line bg-app-panel2 p-3" aria-label="Remembered local folders">
            <h3 className="text-xs font-semibold text-app-text">Your saved folders</h3>
            <p className="mt-1 text-2xs text-app-muted">
              Handles are kept in this browser. ForgePath checks permission before reading files.
            </p>
            <div className="mt-3 space-y-2">
              {savedFolders.map((folder) => (
                <div key={folder.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-app-line p-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-app-text">{folder.folderName}</p>
                    <p className="text-micro text-app-muted">
                      {savedData?.permissions[folder.id] === "granted" ? "Permission available" : "Permission must be confirmed"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn text-xs" disabled={loading}
                      onClick={() => void reopenSavedFolder(folder)}>
                      {savedData?.permissions[folder.id] === "granted" ? "Open" : "Reconnect"}
                    </button>
                    <button type="button" className="btn text-xs" disabled={loading}
                      onClick={() => void disconnectSavedFolder(folder)}>
                      Disconnect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-status-blue-line bg-status-blue-bg p-3">
          <LockKeyhole
            size={16}
            className="shrink-0 text-status-blue"
          />
          <p className="text-2xs leading-relaxed text-status-blue">
            Browsing is read-only. Confirm selection to upload an eligible-code
            snapshot to your private ForgePath project. Original files are never modified.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg border border-status-amber-line bg-status-amber-bg p-3 text-xs text-status-amber"
          >
            <AlertTriangle
              size={16}
              className="shrink-0"
            />
            {error}
          </div>
        )}

        {!root ? (
          <div className="px-4 py-10 text-center">
            <Folder
              size={27}
              className="mx-auto text-app-accent"
            />
            <h3 className="mt-3 text-sm font-semibold text-app-text">
              Choose your existing project folder
            </h3>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-app-muted">
              Browse to a repository on any accessible
              drive. You do not need to move or copy it.
            </p>
          </div>
        ) : (
          <>
            <div
              aria-label="Folder location"
              className="mb-3 flex flex-wrap items-center gap-1 text-2xs"
            >
              {locations.map((location, index) => (
                <div
                  key={`${index}:${location.name}`}
                  className="flex items-center gap-1"
                >
                  {index > 0 && (
                    <ChevronRight
                      size={13}
                      className="text-app-dim"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => void navigateTo(index)}
                    className="rounded-md px-2 py-1 font-mono text-app-accent hover:bg-app-panel3"
                  >
                    {location.name}
                  </button>
                </div>
              ))}
            </div>

            <div className="max-h-80 overflow-y-auto rounded-lg border border-app-line">
              {entries.length === 0 ? (
                <p className="p-7 text-center text-xs text-app-muted">
                  No supported files or subfolders are visible.
                </p>
              ) : (
                entries.map((entry) => (
                  <button
                    key={`${entry.kind}:${entry.name}`}
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      entry.kind === "directory"
                        ? void enterFolder(entry)
                        : void openFile(entry)
                    }
                    className="flex w-full min-w-0 items-center gap-3 border-b border-app-line-faint px-3 py-2.5 text-left text-xs text-app-text last:border-b-0 hover:bg-app-row-hover disabled:opacity-50"
                  >
                    {entry.kind === "directory" ? (
                      <Folder
                        size={16}
                        className="shrink-0 text-app-accent"
                      />
                    ) : (
                      <FileCode2
                        size={16}
                        className="shrink-0 text-app-muted"
                      />
                    )}

                    <span className="min-w-0 flex-1 truncate font-mono">
                      {entry.name}
                    </span>

                    {entry.kind === "directory" && (
                      <ChevronRight
                        size={14}
                        className="shrink-0 text-app-dim"
                      />
                    )}
                  </button>
                ))
              )}
            </div>

            {truncated && (
              <p className="mt-2 text-2xs text-status-amber">
                This folder exceeds the listing limit.
                Only the first permitted entries are shown.
              </p>
            )}

            {selectedFile && (
              <section className="mt-4 overflow-hidden rounded-lg border border-app-line">
                <div className="border-b border-app-line bg-app-panel2 px-3 py-2">
                  <h3 className="break-all font-mono text-2xs font-semibold text-app-text">
                    {selectedFile}
                  </h3>
                  <p className="mt-1 text-micro text-app-muted">
                    Read-only file preview
                  </p>
                </div>

                <pre className="max-h-96 overflow-auto whitespace-pre p-3 font-mono text-2xs leading-5 text-app-mono-text">
                  <code>{preview}</code>
                </pre>
              </section>
            )}

            <p className="mt-4 text-micro leading-relaxed text-app-dim">
              Selected folder: {current?.name ?? root.name}
              {current && locations.length > 1
                ? ` · Browsing ${current.name}`
                : ""}
            </p>

            <div className="mt-4 space-y-3 rounded-lg border border-app-line bg-app-panel2 p-4">
              <h3 className="text-xs font-semibold text-app-text">
                Activate selected codebase
              </h3>

              <p className="text-2xs leading-relaxed text-app-muted">
                Preview permitted source files locally before uploading.
                Confirmation uploads only eligible text files and starts
                a read-only review with at most four model requests.
                Original files are never modified.
              </p>

              {/* PREVIEW FILES */}
              <button
                type="button"
                onClick={() => void previewSelection()}
                disabled={loading || !current}
                className="btn disabled:opacity-50"
              >
                {loading ? (
                  <LoaderCircle
                    size={15}
                    className="animate-spin"
                  />
                ) : (
                  <FileCode2 size={15} />
                )}

                Preview eligible files
              </button>

              {/* SNAPSHOT PREVIEW RESULT */}
              {preparedSnapshot &&
                current &&
                preparedSnapshot.handle === current.handle && (
                  <div
                    role="status"
                    className="rounded-lg border border-status-blue-line bg-status-blue-bg p-3 text-2xs text-status-blue"
                  >
                    {preparedSnapshot.files} eligible files ·{" "}
                    {preparedSnapshot.assetPaths.length} SVG paths inventoried ·{" "}
                    {preparedSnapshot.directories} directories scanned ·{" "}
                    {preparedSnapshot.skipped} excluded entries ·{" "}
                    {preparedSnapshot.bytes.toLocaleString()} bytes.

                    <p className="mt-1">
                      No files have been uploaded and no AI requests
                      have been made.
                    </p>
                    {preparedSnapshot.skippedUnrecognizedText.length > 0 && (
                      <p className="mt-2 text-amber-300">
                        Skipped files that are not supported text: {preparedSnapshot.skippedUnrecognizedText.join(", ")}
                      </p>
                    )}
                  </div>
                )}

              {/* SELECT PROJECT */}
              <label
                htmlFor="forgepath-project-target"
                className="block text-2xs font-semibold text-app-text"
              >
                Save to project
              </label>

              <select
                id="forgepath-project-target"
                value={projectTarget}
                onChange={(event) => {
                  setProjectTarget(event.target.value);
                  setPendingProjectId(null);
                }}
                disabled={loading || !token}
                className="w-full rounded-lg border border-app-line bg-app-bg p-2 text-xs text-app-text"
              >
                <option value="" disabled>
                  Select an existing project or create a new one
                </option>

                <option value="new">
                  Create a new project
                </option>

                {ownedProjects.map((project) => (
                  <option
                    key={project.id}
                    value={project.id}
                  >
                    Update {project.name} ({project.id.slice(0, 8)})
                  </option>
                ))}
              </select>

              {/* EXISTING PROJECT WARNING */}
              {projectTarget && projectTarget !== "new" && (
                <p className="text-2xs text-status-amber">
                  You selected an existing project. Its current
                  snapshot will be replaced as the active version;
                  earlier review history is retained.
                </p>
              )}

              {/* CONFIRM SELECTION */}
              <button
                type="button"
                onClick={() => void confirmSelection()}
                disabled={
                  loading ||
                  !token ||
                  !current ||
                  !projectTarget ||
                  preparedSnapshot?.handle !== current.handle
                }
                className="btn btn-primary disabled:opacity-50"
              >
                {loading ? (
                  <LoaderCircle
                    size={15}
                    className="animate-spin"
                  />
                ) : (
                  <CheckCircle2 size={15} />
                )}

                Confirm selection: {current?.name}
              </button>

              {!token && (
                <p className="text-2xs text-status-amber">
                  Sign in before activating a project.
                </p>
              )}
            </div>
          </>
        )}

        {activeProject && (
          <div className="mt-4 rounded-lg border border-status-green-line bg-status-green-bg p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-status-green">
                <CheckCircle2 size={16} /> Active project: {activeProject.name}
              </div>
              <button type="button" onClick={forgetActiveProject} className="btn text-xs">
                Clear active project
              </button>
            </div>
            <p className="mt-2 break-all font-mono text-micro text-app-muted">
              Project ID: {activeProject.id}
            </p>
            {receipt && <p className="mt-2 text-2xs text-status-green">
              {receipt.file_count} source files stored · {receipt.total_bytes.toLocaleString()} bytes
              {receipt.applied_patch_count > 0 && (
                <> · {receipt.applied_patch_count} approved patch{receipt.applied_patch_count === 1 ? "" : "es"} detected</>
              )}
            </p>}
          </div>
        )}
        {activeProject && review && (
          <section className="mt-4 rounded-lg border border-app-line bg-app-panel2 p-4" aria-label="Initial codebase review">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-app-text">Automated codebase review</h3>
              <span className="rounded-md border border-app-line px-2 py-1 text-micro text-app-accent">
                {review.status === "partial" ? "Partial — review budget reached" : review.status}
              </span>
            </div>
            <p className="mt-2 text-2xs text-app-muted">
              Inventoried {review.files_scanned} files · AI-inspected {review.files_reviewed} files ·
              Model calls {review.ai_calls}/{review.max_ai_calls}
            </p>
            {review.error_message && <p role="alert" className="mt-2 text-2xs text-status-amber">{review.error_message}</p>}
            {review.result_text && (
              <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-app-line bg-app-bg p-3 font-mono text-2xs leading-relaxed text-app-text">
                {review.result_text}
              </pre>
            )}
          </section>
        )}
        {activationMessage && <p role="status" className="mt-3 text-2xs text-app-muted">{activationMessage}</p>}
      </div>
    </section>
  );
};

export default LocalFolderPicker;

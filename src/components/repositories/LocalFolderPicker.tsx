import { useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  FileCode2,
  Folder,
  FolderOpen,
  LoaderCircle,
  LockKeyhole,
  X,
} from "lucide-react";

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

  // The async iterator exists in browsers implementing the
  // File System Access API. This explicit type avoids relying
  // on a particular tsconfig DOM iterable library.
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
  const [locations, setLocations] = useState<FolderLocation[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);

  const root = locations[0];
  const current = locations.at(-1);

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
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-status-blue-line bg-status-blue-bg p-3">
          <LockKeyhole
            size={16}
            className="shrink-0 text-status-blue"
          />
          <p className="text-2xs leading-relaxed text-status-blue">
            Read-only browser access. Files remain in their
            original location. Nothing is uploaded, indexed,
            executed, or modified.
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
              Selected folder: {root.name}
              {current && locations.length > 1
                ? ` · Browsing ${current.name}`
                : ""}
            </p>
          </>
        )}
      </div>
    </section>
  );
};

export default LocalFolderPicker;
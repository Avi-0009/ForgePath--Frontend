import type { SnapshotFile } from "../../Api/ProjectActivation";

const MAX_FILES = 1000;
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_FILE_BYTES = 1_000_000;
const MAX_DEPTH = 12;

const excludedDirectories = new Set([
  ".git", ".svn", ".hg", ".next", ".nuxt", ".venv", "venv", "env",
  ".pytest_cache", ".mypy_cache", ".ruff_cache", ".ssh", ".aws",
  ".azure", ".gnupg", ".kube", ".docker", ".config", ".idea",
  ".vscode", ".terraform", ".local", "tmp", "node_modules",
  "dist", "build", "coverage", "vendor", "target", "__pycache__",
]);

const sourceExtensions = new Set([
  "py", "pyi", "cpp", "cc", "cxx", "hpp", "h", "c", "java",
  "js", "jsx", "ts", "tsx", "go", "rs", "cs", "php", "rb", "swift",
  "kt", "sql", "html", "css", "json", "yaml", "yml", "toml",
  "md", "sh", "ps1",
]);

const sensitiveFile = (name: string) => {
  const lower = name.toLowerCase();
  return lower.startsWith(".") || lower.includes("secret") ||
    lower.includes("credential") || lower.includes("private_key") ||
    lower.startsWith("id_rsa") || lower.startsWith("id_ed25519") ||
    lower.endsWith(".pem") || lower.endsWith(".key") ||
    lower.endsWith(".p12") || lower.endsWith(".pfx") ||
    lower.endsWith(".jks") || lower.endsWith(".keystore") ||
    lower.endsWith(".sqlite") || lower.endsWith(".db") ||
    lower.endsWith(".min.js") || lower.endsWith(".min.css") ||
    lower === "package-lock.json" || lower === "pnpm-lock.yaml" ||
    lower === "yarn.lock";
};

// Mirrors the backend's basic credential-pattern guard. Backend validation is authoritative.
const suspectedCredential = /-----BEGIN [A-Z ]*PRIVATE KEY-----|aws_secret_access_key\s*[:=]|authorization\s*[:=]\s*bearer\s+\S+|(?:api[_-]?key|password|access[_-]?token)\s*[:=]\s*['"]?[A-Za-z0-9_+\-/]{18,}/i;

type BuildResult = {
  files: SnapshotFile[];
  totalBytes: number;
  skippedFiles: number;
  scannedDirectories: number;
  skippedDirectories: number;
};

export const collectLocalSnapshot = async (
  root: FileSystemDirectoryHandle,
): Promise<BuildResult> => {
  const files: SnapshotFile[] = [];
  let totalBytes = 0;
  let skippedFiles = 0;
  let scannedDirectories = 0; 
  let skippedDirectories = 0;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8", { fatal: true });

  const scan = async (directory: FileSystemDirectoryHandle, parents: string[]): Promise<void> => {
    scannedDirectories += 1;
    const entries = directory as unknown as {
      values: () => AsyncIterable<FileSystemHandle>;
    };
    for await (const handle of entries.values()) {
      if (handle.name.startsWith(".") || handle.name.includes("/") ||
          handle.name.includes("\\") || handle.name.includes(":")) {
        skippedFiles += 1;
        continue;
      }
      if (handle.kind === "directory") {
        if (excludedDirectories.has(handle.name.toLowerCase())) {
          skippedDirectories += 1;
          continue;
        }
        if (parents.length + 2 > MAX_DEPTH) {
          throw new Error("Folder depth exceeds the 12-level snapshot limit.");
        }
        await scan(handle as FileSystemDirectoryHandle, [...parents, handle.name]);
        continue;
      }
      const extension = handle.name.toLowerCase().split(".").at(-1) ?? "";
      if (sensitiveFile(handle.name) || !sourceExtensions.has(extension)) {
        skippedFiles += 1;
        continue;
      }
      if (files.length >= MAX_FILES) throw new Error("Project exceeds the 1,000-file snapshot limit.");
      const file = await (handle as FileSystemFileHandle).getFile();
      if (file.size > MAX_FILE_BYTES) {
        throw new Error("A source file exceeds the 1 MB limit.");
      }
      let content: string;
      try {
        content = decoder.decode(await file.arrayBuffer());
      } catch {
        throw new Error("A source file is not valid UTF-8 text.");
      }
      if (content.includes("\0") || suspectedCredential.test(content)) {
        throw new Error("A source file may contain credentials or binary data. Review the folder before uploading.");
      }
      const bytes = encoder.encode(content).byteLength;
      totalBytes += bytes;
      if (totalBytes > MAX_BYTES) throw new Error("Project exceeds the 20 MB snapshot limit.");
      files.push({ relative_path: [...parents, handle.name].join("/"), content });
    }
  };

  await scan(root, []);
  if (files.length === 0)
    throw new Error("No eligible source files were found.");
  return {
    files,
    totalBytes,
    skippedFiles,
    scannedDirectories,
    skippedDirectories,
  };
};
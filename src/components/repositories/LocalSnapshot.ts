import type { SnapshotFile } from "../../Api/ProjectActivation";

const MAX_FILES = 1000;
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_FILE_BYTES = 1_000_000;
const MAX_DEPTH = 12;
const MAX_ASSET_PATHS = 1000;

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
const suspectedCredential = /(?:^|\r?\n)[ \t]*-----BEGIN [A-Z ]*PRIVATE KEY-----|authorization\s*[:=]\s*bearer\s+[A-Za-z0-9_+./=-]{18,}|(?:aws_secret_access_key|api[_-]?key|password|access[_-]?token)\s*[:=]\s*(['"])[A-Za-z0-9_+\-/=]{18,}\1|(?:aws_secret_access_key|api[_-]?key|password|access[_-]?token)\s*[:=]\s*(?:sk-[A-Za-z0-9_-]{18,}|ghp_[A-Za-z0-9]{18,}|AKIA[A-Z0-9]{16})(?![A-Za-z0-9_])/im;

// Do not guess an encoding for program source. Windows-authored Markdown can
// legitimately be UTF-16 or Windows-1252; normalize it to UTF-8 on upload.
export const decodeSourceBytes = (bytes: Uint8Array, extension: string): string | null => {
  let content: string;
  try {
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      content = new TextDecoder("utf-16le", { fatal: true }).decode(bytes);
    } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      content = new TextDecoder("utf-16be", { fatal: true }).decode(bytes);
    } else {
      content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
  } catch {
    if (extension !== "md") return null;
    try {
      content = new TextDecoder("windows-1252", { fatal: true }).decode(bytes);
    } catch {
      return null;
    }
  }

  // TextDecoder can decode some binary data, so check the resulting text.
  // Allow normal whitespace, but not NUL, other control characters or U+FFFD.
  for (const character of content) {
    const code = character.charCodeAt(0);
    if (code === 0xfffd || code === 0x7f ||
        (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) ||
        (code >= 0x80 && code <= 0x9f)) {
      return null;
    }
  }
  return content;
};

type BuildResult = {
  files: SnapshotFile[];
  assetPaths: string[];
  totalBytes: number;
  skippedFiles: number;
  skippedUnrecognizedText: string[];
  scannedDirectories: number;
  skippedDirectories: number;
};

const digestHex = async (bytes: Uint8Array): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")).join("");
};

export const sha256Text = async (content: string): Promise<string> =>
  digestHex(new TextEncoder().encode(content));

export const computeSnapshotSha256 = async (
  files: SnapshotFile[],
): Promise<string> => {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  for (const file of [...files].sort((left, right) =>
    left.relative_path < right.relative_path ? -1 :
      left.relative_path > right.relative_path ? 1 : 0)) {
    const path = encoder.encode(file.relative_path);
    const contentHash = new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(file.content) as BufferSource),
    );
    const chunk = new Uint8Array(path.byteLength + 1 + contentHash.byteLength);
    chunk.set(path);
    chunk.set(contentHash, path.byteLength + 1);
    chunks.push(chunk);
    byteLength += chunk.byteLength;
  }

  const combined = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return digestHex(combined);
};

export const collectLocalSnapshot = async (
  root: FileSystemDirectoryHandle,
): Promise<BuildResult> => {
  const files: SnapshotFile[] = [];
  const assetPaths: string[] = [];
  let totalBytes = 0;
  let skippedFiles = 0;
  const skippedUnrecognizedText: string[] = [];
  let scannedDirectories = 0; 
  let skippedDirectories = 0;
  const encoder = new TextEncoder();

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
      if (extension === "svg" && !sensitiveFile(handle.name)) {
        if (assetPaths.length >= MAX_ASSET_PATHS) {
          throw new Error("Project exceeds the 1,000 SVG-path inventory limit.");
        }
        // Record only its relative name. Never obtain a File or read SVG bytes.
        assetPaths.push([...parents, handle.name].join("/"));
        continue;
      }
      if (sensitiveFile(handle.name) || !sourceExtensions.has(extension)) {
        skippedFiles += 1;
        continue;
      }
      if (files.length >= MAX_FILES) throw new Error("Project exceeds the 1,000-file snapshot limit.");
      const file = await (handle as FileSystemFileHandle).getFile();
      if (file.size > MAX_FILE_BYTES) {
        throw new Error("A source file exceeds the 1 MB limit.");
      }
      const relativePath = [...parents, handle.name].join("/");
      const content = decodeSourceBytes(new Uint8Array(await file.arrayBuffer()), extension);
      if (content === null) {
        // One unreadable or non-text source must not block the entire repository.
        skippedFiles += 1;
        skippedUnrecognizedText.push(relativePath);
        continue;
      }
      if (suspectedCredential.test(content)) {
        throw new Error(
          `Cannot include ${relativePath}: ` +
          "possible credentials or binary data. Review this file before uploading.",
        );
      }
      const bytes = encoder.encode(content).byteLength;
      if (bytes > MAX_FILE_BYTES) {
        throw new Error(`Decoded source file ${relativePath} exceeds the 1 MB limit.`);
      }
      totalBytes += bytes;
      if (totalBytes > MAX_BYTES) throw new Error("Project exceeds the 20 MB snapshot limit.");
      files.push({ relative_path: relativePath, content });
    }
  };

  await scan(root, []);
  if (files.length === 0)
    throw new Error("No eligible source files were found.");
  assetPaths.sort();
  skippedUnrecognizedText.sort();
  return {
    files,
    assetPaths,
    totalBytes,
    skippedFiles,
    skippedUnrecognizedText,
    scannedDirectories,
    skippedDirectories,
  };
};

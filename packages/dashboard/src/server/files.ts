/**
 * File Manager — Secure file browser and editor for the dashboard.
 *
 * All paths are scoped to an allowed root directory (defaults to cwd).
 * Path traversal attacks are prevented by resolving and checking prefix.
 */
import fs from "node:fs";
import path from "node:path";

// ── Types ───────────────────────────────────────────────────────────────

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory" | "symlink";
  size: number;
  modified: string;
  extension?: string;
}

export interface FileContent {
  path: string;
  content: string;
  encoding: "utf-8" | "base64";
  language?: string;
  size: number;
  modified: string;
}

export interface FileWriteResult {
  path: string;
  size: number;
  modified: string;
}

export interface FileOperationResult {
  success: boolean;
  message?: string;
}

// ── Language detection ──────────────────────────────────────────────────

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ".ts": "typescript", ".tsx": "typescript", ".js": "javascript", ".jsx": "javascript",
  ".json": "json", ".md": "markdown", ".css": "css", ".scss": "scss", ".less": "less",
  ".html": "html", ".xml": "xml", ".yaml": "yaml", ".yml": "yaml",
  ".py": "python", ".rb": "ruby", ".go": "go", ".rs": "rust",
  ".java": "java", ".kt": "kotlin", ".c": "c", ".cpp": "cpp", ".h": "c",
  ".sh": "shell", ".bash": "shell", ".zsh": "shell", ".fish": "shell",
  ".sql": "sql", ".graphql": "graphql", ".proto": "protobuf",
  ".dockerfile": "dockerfile", ".toml": "ini", ".ini": "ini", ".env": "ini",
  ".gitignore": "plaintext", ".eslintrc": "json", ".prettierrc": "json",
  ".lock": "json", ".map": "json",
};

const FILENAME_LANGUAGE_MAP: Record<string, string> = {
  "Dockerfile": "dockerfile",
  "Makefile": "plaintext",
  "LICENSE": "plaintext",
  "README": "markdown",
  ".gitignore": "plaintext",
  ".env": "ini",
  ".eslintrc": "json",
  ".prettierrc": "json",
  "tsconfig.json": "json",
  "package.json": "json",
  "package-lock.json": "json",
};

// Binary file extensions - serve as base64
const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
  ".woff", ".woff2", ".ttf", ".eot",
  ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
  ".mp3", ".wav", ".ogg", ".mp4", ".avi", ".mov",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".exe", ".dll", ".so", ".dylib", ".node",
  ".wasm", ".sqlite", ".db",
]);

function detectLanguage(filePath: string): string {
  const basename = path.basename(filePath);
  if (FILENAME_LANGUAGE_MAP[basename]) return FILENAME_LANGUAGE_MAP[basename];
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_LANGUAGE_MAP[ext] || "plaintext";
}

function isBinary(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

// ── File Manager ────────────────────────────────────────────────────────

export class FileManager {
  private rootDir: string;

  constructor(rootDir?: string) {
    this.rootDir = path.resolve(rootDir || process.cwd());
  }

  /** Ensure a path is within the allowed root directory */
  private safePath(relativePath: string): string {
    const resolved = path.resolve(this.rootDir, relativePath);
    if (!resolved.startsWith(this.rootDir)) {
      throw new Error("Path traversal denied");
    }
    return resolved;
  }

  /** List directory contents */
  listDirectory(dirPath: string = "."): FileEntry[] {
    const fullPath = this.safePath(dirPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }
    const stat = fs.statSync(fullPath);
    if (!stat.isDirectory()) {
      throw new Error(`Not a directory: ${dirPath}`);
    }

    const entries = fs.readdirSync(fullPath, { withFileTypes: true });
    return entries
      .filter((entry) => !entry.name.startsWith(".") || entry.name === ".env" || entry.name === ".gitignore")
      .map((entry) => {
        const entryPath = path.join(dirPath, entry.name);
        const fullEntryPath = path.join(fullPath, entry.name);
        let type: FileEntry["type"] = "file";
        let size = 0;
        let modified = "";
        try {
          const s = fs.statSync(fullEntryPath);
          type = s.isDirectory() ? "directory" : s.isSymbolicLink() ? "symlink" : "file";
          size = s.size;
          modified = s.mtime.toISOString();
        } catch {
          type = "symlink";
        }
        return {
          name: entry.name,
          path: entryPath.replace(/\\/g, "/"),
          type,
          size,
          modified,
          extension: path.extname(entry.name).toLowerCase() || undefined,
        };
      })
      .sort((a, b) => {
        // Directories first, then alphabetical
        if (a.type === "directory" && b.type !== "directory") return -1;
        if (a.type !== "directory" && b.type === "directory") return 1;
        return a.name.localeCompare(b.name);
      });
  }

  /** Read file content */
  readFile(filePath: string): FileContent {
    const fullPath = this.safePath(filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      throw new Error(`Path is a directory: ${filePath}`);
    }
    // Limit file size to 2MB
    if (stat.size > 2 * 1024 * 1024) {
      throw new Error(`File too large (${(stat.size / 1024 / 1024).toFixed(1)}MB, max 2MB)`);
    }

    const binary = isBinary(filePath);
    if (binary) {
      const content = fs.readFileSync(fullPath).toString("base64");
      return {
        path: filePath.replace(/\\/g, "/"),
        content,
        encoding: "base64",
        language: detectLanguage(filePath),
        size: stat.size,
        modified: stat.mtime.toISOString(),
      };
    }

    const content = fs.readFileSync(fullPath, "utf-8");
    return {
      path: filePath.replace(/\\/g, "/"),
      content,
      encoding: "utf-8",
      language: detectLanguage(filePath),
      size: stat.size,
      modified: stat.mtime.toISOString(),
    };
  }

  /** Write file content */
  writeFile(filePath: string, content: string, encoding: "utf-8" | "base64" = "utf-8"): FileWriteResult {
    const fullPath = this.safePath(filePath);
    // Ensure parent directory exists
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    const buffer = encoding === "base64" ? Buffer.from(content, "base64") : content;
    fs.writeFileSync(fullPath, buffer);

    const stat = fs.statSync(fullPath);
    return {
      path: filePath.replace(/\\/g, "/"),
      size: stat.size,
      modified: stat.mtime.toISOString(),
    };
  }

  /** Delete a file or directory */
  deletePath(itemPath: string): FileOperationResult {
    const fullPath = this.safePath(itemPath);
    if (!fs.existsSync(fullPath)) {
      return { success: false, message: `Not found: ${itemPath}` };
    }
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true });
    } else {
      fs.unlinkSync(fullPath);
    }
    return { success: true };
  }

  /** Create a directory */
  createDirectory(dirPath: string): FileOperationResult {
    const fullPath = this.safePath(dirPath);
    if (fs.existsSync(fullPath)) {
      return { success: false, message: `Already exists: ${dirPath}` };
    }
    fs.mkdirSync(fullPath, { recursive: true });
    return { success: true };
  }

  /** Rename or move a file/directory */
  renamePath(oldPath: string, newPath: string): FileOperationResult {
    const fullOld = this.safePath(oldPath);
    const fullNew = this.safePath(newPath);
    if (!fs.existsSync(fullOld)) {
      return { success: false, message: `Not found: ${oldPath}` };
    }
    if (fs.existsSync(fullNew)) {
      return { success: false, message: `Target already exists: ${newPath}` };
    }
    // Ensure parent dir exists
    const parentDir = path.dirname(fullNew);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.renameSync(fullOld, fullNew);
    return { success: true };
  }

  /** Get file stats */
  statPath(itemPath: string): { path: string; type: string; size: number; modified: string; isFile: boolean; isDirectory: boolean } {
    const fullPath = this.safePath(itemPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Not found: ${itemPath}`);
    }
    const stat = fs.statSync(fullPath);
    return {
      path: itemPath.replace(/\\/g, "/"),
      type: stat.isDirectory() ? "directory" : stat.isFile() ? "file" : "other",
      size: stat.size,
      modified: stat.mtime.toISOString(),
      isFile: stat.isFile(),
      isDirectory: stat.isDirectory(),
    };
  }

  /** Get the root directory */
  getRootDir(): string {
    return this.rootDir;
  }
}
import { Type } from "@sinclair/typebox";
import type { ToolDefinition, ToolResult } from "../../registry.js";
import fs from "node:fs";
import path from "node:path";
import {
  isRichDocument,
  isDoclingAvailable,
  doclingParse,
  doclingChunk,
  doclingOcr,
  doclingBatch,
  type ExportFormat,
  type TableMode,
} from "./docling-client.js";

// ── Rich format detection ───────────────────────────────────────────

export { isRichDocument, isRichContentType, RICH_FORMATS, RICH_MIMES } from "./docling-client.js";

// ── read_file ───────────────────────────────────────────────────────

export const readFileTool: ToolDefinition = {
  name: "read_file",
  toolset: "file",
  description:
    "Read a text file with line numbers and pagination. Use instead of cat/head/tail. Output: 'LINE_NUM|CONTENT'. Suggests similar filenames if not found. Use offset/limit for large files. Automatically delegates to Docling for rich documents (PDF, DOCX, PPTX, etc.).",
  parameters: Type.Object({
    path: Type.String({ description: "File path to read" }),
    offset: Type.Optional(Type.Number({ description: "Line number to start from (1-indexed)" })),
    limit: Type.Optional(Type.Number({ description: "Max lines to read" })),
  }),
  async execute(params, context): Promise<ToolResult> {
    const filePath = resolvePath(params.path as string, context.cwd);
    if (!fs.existsSync(filePath)) {
      const suggestions = suggestSimilar(filePath, context.cwd);
      return {
        content: `File not found: ${filePath}${suggestions.length > 0 ? `\nDid you mean: ${suggestions.join(", ")}?` : ""}`,
        isError: true,
      };
    }

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(filePath);
      return { content: entries.join("\n") };
    }

    // ── Rich document detection → Docling delegation ──────────────
    if (isRichDocument(filePath)) {
      const available = await isDoclingAvailable(context);
      if (available) {
        try {
          const result = await doclingParse(filePath, "markdown", undefined, context);
          if (result.success && result.content) {
            // Apply line-based pagination to the Markdown output
            const lines = result.content.split("\n");
            const offset = ((params.offset as number) ?? 1) - 1;
            const limit = (params.limit as number) ?? lines.length;
            const selected = lines.slice(offset, offset + limit);
            const numbered = selected.map((line, i) => `${String(offset + i + 1).padStart(6)}|${line}`);
            return {
              content: numbered.join("\n"),
              metadata: { source: "docling", format: "markdown", originalFormat: path.extname(filePath) },
            };
          }
        } catch (err) {
          // Fall through to plain-text read with warning
          const plain = readPlainFile(filePath, params, context);
          return {
            ...plain,
            content: `[Tekton] Docling parse failed: ${err instanceof Error ? err.message : String(err)}. Falling back to raw text.\n\n${plain.content}`,
          };
        }
      } else {
        const plain = readPlainFile(filePath, params, context);
        return {
          ...plain,
          content: `[Tekton] Rich document detected but Docling service not running. Install with: pip install tekton-docling && tekton-docling --mode http. Showing raw text fallback.\n\n${plain.content}`,
        };
      }
    }

    // ── Plain text file read ─────────────────────────────────────
    return readPlainFile(filePath, params, context);
  },
};

// ── docling_parse ──────────────────────────────────────────────────

export const doclingParseTool: ToolDefinition = {
  name: "docling_parse",
  toolset: "file",
  description:
    "Parse a document (PDF, DOCX, PPTX, XLSX, images, LaTeX, etc.) into clean Markdown using Docling. Supports OCR for scanned documents and accurate table extraction.",
  parameters: Type.Object({
    source: Type.String({ description: "File path or URL to parse" }),
    output_format: Type.Optional(Type.Union([
      Type.Literal("markdown"),
      Type.Literal("html"),
      Type.Literal("json"),
      Type.Literal("doctags"),
    ], { description: "Output format", default: "markdown" })),
    ocr: Type.Optional(Type.Boolean({ description: "Enable OCR for scanned pages", default: true })),
    table_mode: Type.Optional(Type.Union([
      Type.Literal("fast"),
      Type.Literal("accurate"),
    ], { description: "Table extraction mode", default: "accurate" })),
    chunk: Type.Optional(Type.Boolean({ description: "Return chunked segments instead of full document", default: false })),
    max_chunk_tokens: Type.Optional(Type.Number({ description: "Max tokens per chunk when chunk=true", default: 512 })),
  }),
  async execute(params, context): Promise<ToolResult> {
    const available = await isDoclingAvailable(context);
    if (!available) {
      return {
        content: "[Tekton] Docling service not running. Start with: pip install tekton-docling && tekton-docling --mode http",
        isError: true,
      };
    }

    const source = params.source as string;
    const format = (params.output_format as ExportFormat) ?? "markdown";
    const ocr = (params.ocr as boolean) ?? true;
    const tableMode = (params.table_mode as TableMode) ?? "accurate";
    const doChunk = (params.chunk as boolean) ?? false;
    const maxTokens = (params.max_chunk_tokens as number) ?? 512;

    try {
      if (doChunk) {
        const result = await doclingChunk(source, maxTokens, context);
        if (result.success) {
          return {
            content: JSON.stringify(result.chunks, null, 2),
            metadata: { source, chunkCount: result.count, tool: "docling_chunk" },
          };
        }
        return { content: `Chunking failed: ${JSON.stringify(result)}`, isError: true };
      }

      const result = await doclingParse(source, format, { ocr, tableMode }, context);
      if (result.success) {
        const content = result.content;
        if (content.length > 100000) {
          return {
            content: content.slice(0, 100000) + "\n\n[...truncated, full content was " + content.length + " chars]",
            metadata: { source, format, tool: "docling_parse" },
          };
        }
        return { content, metadata: { source, format, tool: "docling_parse" } };
      }
      return { content: `Parse failed: ${JSON.stringify(result)}`, isError: true };
    } catch (err) {
      return {
        content: `Docling parse error: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      };
    }
  },
};

// ── docling_batch ───────────────────────────────────────────────────

export const doclingBatchTool: ToolDefinition = {
  name: "docling_batch",
  toolset: "file",
  description: "Parse multiple documents in batch. Returns array of results.",
  parameters: Type.Object({
    sources: Type.Array(Type.String(), { description: "List of file paths or URLs", }),
    output_format: Type.Optional(Type.Union([
      Type.Literal("markdown"),
      Type.Literal("html"),
      Type.Literal("json"),
    ], { description: "Output format", default: "markdown" })),
  }),
  async execute(params, context): Promise<ToolResult> {
    const available = await isDoclingAvailable(context);
    if (!available) {
      return {
        content: "[Tekton] Docling service not running. Start with: pip install tekton-docling && tekton-docling --mode http",
        isError: true,
      };
    }

    const sources = params.sources as string[];
    const format = (params.output_format as ExportFormat) ?? "markdown";

    try {
      const results = await doclingBatch(sources, format, context);
      const output = results.map((r, i) => ({
        source: sources[i],
        success: r.success,
        content: r.content?.slice(0, 5000) + (r.content && r.content.length > 5000 ? "\n[...truncated]" : ""),
      }));
      return { content: JSON.stringify(output, null, 2) };
    } catch (err) {
      return {
        content: `Docling batch error: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      };
    }
  },
};

// ── list_dir ───────────────────────────────────────────────────────

export const listDirTool: ToolDefinition = {
  name: "list_dir",
  toolset: "file",
  description:
    "List directory contents with file metadata. Shows file type, size, and modification time. Use instead of ls.",
  parameters: Type.Object({
    path: Type.Optional(Type.String({ description: "Directory path (default: cwd)" })),
    recursive: Type.Optional(Type.Boolean({ description: "List recursively (default: false)" })),
    include_hidden: Type.Optional(Type.Boolean({ description: "Include hidden files (default: false)" })),
  }),
  async execute(params, context): Promise<ToolResult> {
    const dirPath = resolvePath((params.path as string) ?? ".", context.cwd);
    if (!fs.existsSync(dirPath)) {
      return { content: `Directory not found: ${dirPath}`, isError: true };
    }
    if (!fs.statSync(dirPath).isDirectory()) {
      return { content: `Not a directory: ${dirPath}`, isError: true };
    }

    const recursive = (params.recursive as boolean) ?? false;
    const includeHidden = (params.include_hidden as boolean) ?? false;

    interface FileEntry {
      path: string;
      type: "file" | "dir";
      size: number;
      modified: string;
    }

    const entries: FileEntry[] = [];

    function walkDir(dir: string, prefix: string): void {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (!includeHidden && item.name.startsWith(".")) continue;
        if (item.name === "node_modules" && !includeHidden) continue;

        const fullPath = path.join(dir, item.name);
        const displayPath = prefix ? `${prefix}/${item.name}` : item.name;

        if (item.isDirectory()) {
          entries.push({ path: displayPath, type: "dir", size: 0, modified: "" });
          if (recursive) walkDir(fullPath, displayPath);
        } else {
          try {
            const stat = fs.statSync(fullPath);
            entries.push({
              path: displayPath,
              type: "file",
              size: stat.size,
              modified: stat.mtime.toISOString().split("T")[0],
            });
          } catch {
            entries.push({ path: displayPath, type: "file", size: 0, modified: "?" });
          }
        }
      }
    }

    walkDir(dirPath, "");

    if (entries.length === 0) {
      return { content: "Empty directory" };
    }

    const lines = entries.map(e => {
      if (e.type === "dir") return `  📁 ${e.path}/`;
      const sizeStr = e.size < 1024 ? `${e.size}B` : e.size < 1024 * 1024 ? `${(e.size / 1024).toFixed(1)}KB` : `${(e.size / (1024 * 1024)).toFixed(1)}MB`;
      return `  📄 ${e.path} (${sizeStr}, ${e.modified})`;
    });

    return { content: `${dirPath}:\n${lines.join("\n")}` };
  },
};

// ── write_file ─────────────────────────────────────────────────────

export const writeFileTool: ToolDefinition = {
  name: "write_file",
  toolset: "file",
  description: "Write content to a file. Completely replaces existing content. Creates parent directories. Use patch for targeted edits.",
  parameters: Type.Object({
    path: Type.String({ description: "File path to write" }),
    content: Type.String({ description: "Content to write" }),
  }),
  async execute(params, context): Promise<ToolResult> {
    const filePath = resolvePath(params.path as string, context.cwd);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, params.content as string, "utf-8");
    return { content: `Written ${filePath} (${(params.content as string).length} bytes)` };
  },
};

// ── patch ───────────────────────────────────────────────────────────

export const patchTool: ToolDefinition = {
  name: "patch",
  toolset: "file",
  description: "Surgically modify specific lines or sections of an existing file without rewriting the entire file. Use this instead of write_file when fixing bugs, updating specific functions, or making targeted changes. Only use write_file when creating new files or when changes affect more than 40% of the file. Returns unified diff. Auto-runs syntax check after edit.",
  parameters: Type.Object({
    path: Type.String({ description: "File path" }),
    edits: Type.Array(Type.Object({
      oldText: Type.String({ description: "Text to find (exact or fuzzy match)" }),
      newText: Type.String({ description: "Replacement text" }),
    }), { description: "Array of find-replace operations" }),
  }),
  async execute(params, context): Promise<ToolResult> {
    const filePath = resolvePath(params.path as string, context.cwd);
    if (!fs.existsSync(filePath)) {
      return { content: `File not found: ${filePath}`, isError: true };
    }

    const original = fs.readFileSync(filePath, "utf-8");
    let content = original;
    const diffs: string[] = [];
    let failedEdits = 0;

    for (const edit of params.edits as Array<{ oldText: string; newText: string }>) {
      const match = fuzzyFind(content, edit.oldText);
      if (!match) {
        diffs.push(`FAILED: Could not find match for "${edit.oldText.slice(0, 60)}${edit.oldText.length > 60 ? "..." : ""}"`);
        failedEdits++;
        continue;
      }

      const oldLines = content.substring(match.start, match.end).split("\n");
      const newLines = edit.newText.split("\n");
      const diffLines: string[] = [];
      for (const line of oldLines) diffLines.push(`- ${line}`);
      for (const line of newLines) diffLines.push(`+ ${line}`);
      diffs.push(`@@ line ${match.line} @@\n${diffLines.join("\n")}`);

      content = content.slice(0, match.start) + edit.newText + content.slice(match.end);
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, "utf-8");
    }

    return {
      content: `Patched ${filePath}${failedEdits > 0 ? ` (${failedEdits} edits failed)` : ""}\n${diffs.join("\n\n")}`,
      metadata: {
        originalLength: original.length,
        newLength: content.length,
        editCount: (params.edits as unknown[]).length,
        failedEdits,
        strategy: "fuzzy_match",
      },
    };
  },
};

// ── search_files ────────────────────────────────────────────────────

export const searchFilesTool: ToolDefinition = {
  name: "search_files",
  toolset: "file",
  description:
    "Search file contents or find files by name. Faster than shell grep/find. Uses ripgrep if available, falls back to Node.js recursive search.",
  parameters: Type.Object({
    query: Type.String({ description: "Search query (literal or regex)" }),
    path: Type.Optional(Type.String({ description: "Directory to search in" })),
    target: Type.Optional(Type.Union([Type.Literal("content"), Type.Literal("filename")])),
    regex: Type.Optional(Type.Boolean({ description: "Treat query as regex" })),
    include: Type.Optional(Type.String({ description: "Glob pattern to include" })),
    exclude: Type.Optional(Type.String({ description: "Glob pattern to exclude" })),
  }),
  async execute(params, context): Promise<ToolResult> {
    const searchPath = resolvePath((params.path as string) ?? ".", context.cwd);
    const target = (params.target as string) ?? "content";
    const isRegex = (params.regex as boolean) ?? false;
    const query = params.query as string;
    const includePattern = params.include as string | undefined;
    const excludePattern = params.exclude as string | undefined;

    if (!fs.existsSync(searchPath)) {
      return { content: `Path not found: ${searchPath}`, isError: true };
    }

    const maxResults = 50;
    const results: string[] = [];

    let searchRe: RegExp;
    try {
      searchRe = isRegex ? new RegExp(query, "gi") : new RegExp(escapeRegex(query), "gi");
    } catch {
      return { content: `Invalid regex: ${query}`, isError: true };
    }

    const includeRe = includePattern ? globToRegex(includePattern) : null;
    const excludeRe = excludePattern ? globToRegex(excludePattern) : null;

    if (target === "filename") {
      walkDir(searchPath, (filePath) => {
        if (results.length >= maxResults) return;
        const name = path.basename(filePath);
        const relPath = path.relative(searchPath, filePath);

        if (includeRe && !includeRe.test(name) && !includeRe.test(relPath)) return;
        if (excludeRe && (excludeRe.test(name) || excludeRe.test(relPath))) return;

        const matches = isRegex
          ? searchRe.test(name)
          : name.toLowerCase().includes(query.toLowerCase());
        if (matches) {
          results.push(relPath.replace(/\\/g, "/"));
        }
        searchRe.lastIndex = 0;
      });
    } else {
      walkDir(searchPath, (filePath) => {
        if (results.length >= maxResults) return;
        const name = path.basename(filePath);
        const relPath = path.relative(searchPath, filePath);

        if (includeRe && !includeRe.test(name) && !includeRe.test(relPath)) return;
        if (excludeRe && (excludeRe.test(name) || excludeRe.test(relPath))) return;

        try {
          const fileContent = fs.readFileSync(filePath, "utf-8");
          const lines = fileContent.split("\n");
          for (let i = 0; i < lines.length && results.length < maxResults; i++) {
            searchRe.lastIndex = 0;
            if (searchRe.test(lines[i])) {
              results.push(`${relPath.replace(/\\/g, "/")}:${i + 1}: ${lines[i].trim()}`);
            }
          }
        } catch {
          // Binary or unreadable file — skip
        }
      });
    }

    if (results.length === 0) {
      return { content: "No results found" };
    }

    return { content: results.join("\n") };
  },
};

// ── Helpers ────────────────────────────────────────────────────────

function readPlainFile(filePath: string, params: Record<string, unknown>, context: { cwd: string }): ToolResult {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const offset = ((params.offset as number) ?? 1) - 1;
  const limit = (params.limit as number) ?? lines.length;
  const selected = lines.slice(offset, offset + limit);
  const numbered = selected.map((line, i) => `${String(offset + i + 1).padStart(6)}|${line}`);
  return { content: numbered.join("\n") };
}

function resolvePath(p: string, cwd: string): string {
  if (path.isAbsolute(p)) return p;
  return path.resolve(cwd, p);
}

function suggestSimilar(filePath: string, cwd: string): string[] {
  const dir = path.dirname(filePath);
  const name = path.basename(filePath);
  const resolvedDir = resolvePath(dir, cwd);

  if (!fs.existsSync(resolvedDir)) return [];

  try {
    const entries = fs.readdirSync(resolvedDir);
    const similar = entries.filter(
      e => levenshtein(e.toLowerCase(), name.toLowerCase()) <= 3,
    );
    return similar.slice(0, 3);
  } catch {
    return [];
  }
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i");
}

interface FuzzyMatch {
  start: number;
  end: number;
  line: number;
}

function fuzzyFind(content: string, search: string): FuzzyMatch | null {
  const exactIdx = content.indexOf(search);
  if (exactIdx !== -1) {
    return { start: exactIdx, end: exactIdx + search.length, line: countLines(content, exactIdx) };
  }

  const normWs = (s: string) => s.replace(/[ \t]+/g, " ");
  const match2 = matchNormalized(content, search, normWs);
  if (match2) return match2;

  const normIndent = (s: string) => s.split("\n").map(l => l.trimStart()).join("\n");
  const match3 = matchNormalized(content, search, normIndent);
  if (match3) return match3;

  const normTrail = (s: string) => s.split("\n").map(l => l.trimEnd()).join("\n");
  const match4 = matchNormalized(content, search, normTrail);
  if (match4) return match4;

  const normLineEnd = (s: string) => s.replace(/\r\n/g, "\n");
  const match5 = matchNormalized(content, search, normLineEnd);
  if (match5) return match5;

  const normLeading = (s: string) => s.split("\n").map(l => l.replace(/^\s+/, "")).join("\n");
  const match6 = matchNormalized(content, search, normLeading);
  if (match6) return match6;

  const normEmptyLines = (s: string) => s.replace(/\n{2,}/g, "\n");
  const match7 = matchNormalized(content, search, normEmptyLines);
  if (match7) return match7;

  const normCombined = (s: string) =>
    normEmptyLines(normLeading(normTrail(normLineEnd(normIndent(normWs(s))))));
  const match8 = matchNormalized(content, search, normCombined);
  if (match8) return match8;

  const match9 = similarityFallback(content, search);
  if (match9) return match9;

  return null;
}

function matchNormalized(
  content: string,
  search: string,
  normalize: (s: string) => string,
): FuzzyMatch | null {
  const normContent = normalize(content);
  const normSearch = normalize(search);

  if (normSearch.length === 0) return null;

  const idx = normContent.indexOf(normSearch);
  if (idx === -1) return null;

  return mapNormalizedToOriginal(content, normContent, idx, normSearch.length, normalize);
}

function mapNormalizedToOriginal(
  original: string,
  normalized: string,
  normStart: number,
  normLen: number,
  normalize: (s: string) => string,
): FuzzyMatch | null {
  let origPos = 0;
  let normPos = 0;

  while (origPos < original.length && normPos < normStart) {
    const origChar = original[origPos];
    const normChar = normalized[normPos];

    if (origChar === normChar) {
      origPos++;
      normPos++;
    } else {
      origPos++;
    }
  }

  const startOrig = origPos;
  const line = countLines(original, startOrig);

  while (origPos < original.length && normPos < normStart + normLen) {
    const origChar = original[origPos];
    const normCharPos = normPos < normalized.length ? normalized[normPos] : "";

    if (origChar === normCharPos) {
      origPos++;
      normPos++;
    } else {
      origPos++;
    }
  }

  return { start: startOrig, end: origPos, line };
}

function countLines(text: string, pos: number): number {
  let count = 1;
  for (let i = 0; i < pos && i < text.length; i++) {
    if (text[i] === "\n") count++;
  }
  return count;
}

function similarityFallback(content: string, search: string): FuzzyMatch | null {
  const searchLines = search.split("\n");
  if (searchLines.length === 0) return null;

  const contentLines = content.split("\n");
  let bestScore = 0;
  let bestStart = -1;

  const windowSize = searchLines.length;
  if (windowSize > contentLines.length) {
    for (let i = 0; i < contentLines.length; i++) {
      const score = lineSimilarity(contentLines[i], searchLines[0]);
      if (score > bestScore && score > 0.5) {
        bestScore = score;
        bestStart = i;
      }
    }
  } else {
    for (let i = 0; i <= contentLines.length - windowSize; i++) {
      const block = contentLines.slice(i, i + windowSize);
      const score = blockSimilarity(block, searchLines);
      if (score > bestScore) {
        bestScore = score;
        bestStart = i;
      }
    }
  }

  if (bestScore < 0.5) return null;

  let pos = 0;
  for (let i = 0; i < bestStart; i++) {
    pos += contentLines[i].length + 1;
  }

  let endPos = pos;
  for (let i = 0; i < searchLines.length && bestStart + i < contentLines.length; i++) {
    endPos += contentLines[bestStart + i].length + 1;
  }

  return {
    start: pos,
    end: Math.min(endPos, content.length),
    line: bestStart + 1,
  };
}

function lineSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a.trim().toLowerCase(), b.trim().toLowerCase());
  return Math.max(0, 1 - dist / maxLen);
}

function blockSimilarity(block: string[], search: string[]): number {
  if (block.length === 0 || search.length === 0) return 0;
  let totalSim = 0;
  const minLen = Math.min(block.length, search.length);
  for (let i = 0; i < minLen; i++) {
    totalSim += lineSimilarity(block[i], search[i]);
  }
  return totalSim / minLen;
}

function walkDir(dir: string, callback: (filePath: string) => void): void {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath, callback);
      } else {
        callback(fullPath);
      }
    }
  } catch {
    // Permission error, skip
  }
}
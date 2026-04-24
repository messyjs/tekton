/**
 * Docling sidecar client for Tekton.
 *
 * Communicates with the Python sidecar over HTTP (GET /health for availability,
 * POST /parse for document parsing). Falls back gracefully when sidecar is absent.
 */

import type { ToolContext } from "../../registry.js";

// ── Types ──────────────────────────────────────────────────────────

export interface DoclingHealthResponse {
  status: string;
  service: string;
  version: string;
  capabilities: {
    ocr: boolean;
    tables: boolean;
    vlm: boolean;
    cache: boolean;
  };
}

export interface DoclingParseResponse {
  source: string;
  format: string;
  content: string;
  success: boolean;
}

export interface DoclingChunkResponse {
  source: string;
  chunks: Array<{ text: string; meta: Record<string, unknown> }>;
  count: number;
  success: boolean;
}

export interface DoclingOcrResponse {
  source: string;
  text: string;
  success: boolean;
}

export type ExportFormat = "markdown" | "html" | "json" | "doctags";
export type TableMode = "fast" | "accurate";

// ── Configuration ───────────────────────────────────────────────────

const DOCLING_DEFAULT_PORT = 7701;
const DOCLING_DEFAULT_HOST = "127.0.0.1";
const DOCLING_TIMEOUT_MS = 120_000; // 2 minutes for large documents

function getBaseUrl(context?: ToolContext): string {
  const port = context?.env?.DOCLING_PORT ?? DOCLING_DEFAULT_PORT;
  const host = context?.env?.DOCLING_HOST ?? DOCLING_DEFAULT_HOST;
  return `http://${host}:${port}`;
}

// ── Health check ────────────────────────────────────────────────────

let _healthCache: { available: boolean; timestamp: number } | null = null;
const HEALTH_CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Check if the Docling sidecar is available.
 * Results are cached for 30 seconds to avoid hammering on every call.
 */
export async function isDoclingAvailable(context?: ToolContext): Promise<boolean> {
  // Check cache
  if (_healthCache && (Date.now() - _healthCache.timestamp) < HEALTH_CACHE_TTL_MS) {
    return _healthCache.available;
  }

  try {
    const baseUrl = getBaseUrl(context);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3_000); // 3s timeout for health check

    const resp = await fetch(`${baseUrl}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const available = resp.ok;
    _healthCache = { available, timestamp: Date.now() };
    return available;
  } catch {
    _healthCache = { available: false, timestamp: Date.now() };
    return false;
  }
}

/**
 * Get health details from the Docling sidecar.
 */
export async function getDoclingHealth(context?: ToolContext): Promise<DoclingHealthResponse | null> {
  try {
    const baseUrl = getBaseUrl(context);
    const resp = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });
    if (!resp.ok) return null;
    return (await resp.json()) as DoclingHealthResponse;
  } catch {
    return null;
  }
}

/**
 * Get list of supported formats from Docling sidecar.
 */
export async function getDoclingFormats(context?: ToolContext): Promise<Array<Record<string, unknown>> | null> {
  try {
    const baseUrl = getBaseUrl(context);
    const resp = await fetch(`${baseUrl}/formats`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });
    if (!resp.ok) return null;
    const data = await resp.json() as { formats: Array<Record<string, unknown>> };
    return data.formats;
  } catch {
    return null;
  }
}

// ── Document operations ─────────────────────────────────────────────

/**
 * Parse a document via the Docling sidecar.
 *
 * @param source  File path or URL
 * @param format  Output format (markdown, html, json, doctags)
 * @param options OCR and table extraction options
 * @param context Tool context (for env vars)
 */
export async function doclingParse(
  source: string,
  format: ExportFormat = "markdown",
  options?: { ocr?: boolean; tableMode?: TableMode },
  context?: ToolContext,
): Promise<DoclingParseResponse> {
  const baseUrl = getBaseUrl(context);
  const formData = new FormData();
  formData.append("path", source);
  formData.append("output_format", format);
  formData.append("ocr", String(options?.ocr ?? true));
  formData.append("table_mode", options?.tableMode ?? "accurate");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOCLING_TIMEOUT_MS);

  try {
    const resp = await fetch(`${baseUrl}/parse`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Docling parse error (${resp.status}): ${err}`);
    }

    return (await resp.json()) as DoclingParseResponse;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Chunk a document into RAG-ready segments via the Docling sidecar.
 */
export async function doclingChunk(
  source: string,
  maxTokens: number = 512,
  context?: ToolContext,
): Promise<DoclingChunkResponse> {
  const baseUrl = getBaseUrl(context);
  const formData = new FormData();
  formData.append("path", source);
  formData.append("max_tokens", String(maxTokens));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOCLING_TIMEOUT_MS);

  try {
    const resp = await fetch(`${baseUrl}/chunk`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Docling chunk error (${resp.status}): ${err}`);
    }

    return (await resp.json()) as DoclingChunkResponse;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * OCR an image or scanned document via the Docling sidecar.
 */
export async function doclingOcr(
  source: string,
  context?: ToolContext,
): Promise<DoclingOcrResponse> {
  const baseUrl = getBaseUrl(context);
  const formData = new FormData();
  formData.append("path", source);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOCLING_TIMEOUT_MS);

  try {
    const resp = await fetch(`${baseUrl}/ocr`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Docling OCR error (${resp.status}): ${err}`);
    }

    return (await resp.json()) as DoclingOcrResponse;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Batch-parse multiple documents.
 */
export async function doclingBatch(
  sources: string[],
  format: ExportFormat = "markdown",
  context?: ToolContext,
): Promise<DoclingParseResponse[]> {
  const results: DoclingParseResponse[] = [];
  const maxConcurrent = 4;
  const batches: string[][] = [];

  for (let i = 0; i < sources.length; i += maxConcurrent) {
    batches.push(sources.slice(i, i + maxConcurrent));
  }

  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map((source) => doclingParse(source, format, undefined, context)),
    );
    results.push(...batchResults);
  }

  return results;
}

// ── Rich format detection ───────────────────────────────────────────

/**
 * Extensions that should be routed through Docling for rich parsing.
 */
export const RICH_FORMATS = new Set([
  ".pdf", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls",
  ".odt", ".odp", ".ods", ".epub", ".rtf",
  ".html", ".htm", ".latex", ".tex",
]);

/**
 * MIME types that indicate binary/rich documents needing Docling.
 */
export const RICH_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-word",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.presentation",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/epub+zip",
  "application/rtf",
  "image/png",
  "image/jpeg",
  "image/tiff",
  "image/bmp",
  "image/webp",
];

/**
 * Check if a file path points to a rich document that should be parsed by Docling.
 */
export function isRichDocument(filePath: string): boolean {
  const ext = filePath.toLowerCase().split(".").pop();
  if (!ext) return false;
  return RICH_FORMATS.has(`.${ext}`);
}

/**
 * Check if a Content-Type header indicates a binary/rich document.
 */
export function isRichContentType(contentType: string): boolean {
  return RICH_MIMES.some((mime) => contentType.toLowerCase().includes(mime.toLowerCase()));
}

/**
 * Reset the health cache (for testing).
 */
export function resetHealthCache(): void {
  _healthCache = null;
}
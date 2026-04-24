import { Type } from "@sinclair/typebox";
import type { ToolDefinition, ToolResult } from "../../registry.js";
import { isRichContentType, isDoclingAvailable, doclingParse } from "../file/docling-client.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export const webSearchTool: ToolDefinition = {
  name: "web_search",
  toolset: "web",
  description: "Search the web. Returns up to 10 results with titles, URLs, descriptions.",
  parameters: Type.Object({
    query: Type.String({ description: "Search query" }),
    count: Type.Optional(Type.Number({ description: "Max results (default 5)" })),
  }),
  requiresEnv: [],
  async execute(params, context): Promise<ToolResult> {
    const query = params.query as string;
    const count = (params.count as number) ?? 5;

    // Try providers in priority order
    if (context.env.EXA_API_KEY) {
      return exaSearch(query, count, context.env.EXA_API_KEY);
    }
    if (context.env.TAVILY_API_KEY) {
      return tavilySearch(query, count, context.env.TAVILY_API_KEY);
    }
    if (context.env.FIRECRAWL_API_KEY) {
      return firecrawlSearch(query, count, context.env.FIRECRAWL_API_KEY);
    }
    if (context.env.PARALLEL_API_KEY) {
      return parallelSearch(query, count, context.env.PARALLEL_API_KEY);
    }

    // Free fallback: DuckDuckGo HTML scraping
    return duckDuckGoSearch(query, count);
  },
};

export const webExtractTool: ToolDefinition = {
  name: "web_extract",
  toolset: "web",
  description: "Extract content from a URL as markdown. Works with web pages and PDFs.",
  parameters: Type.Object({
    url: Type.String({ description: "URL to extract content from" }),
    format: Type.Optional(Type.Union([Type.Literal("markdown"), Type.Literal("text")])),
  }),
  async execute(params, context): Promise<ToolResult> {
    const url = params.url as string;

    // Try Firecrawl for extraction (best quality)
    if (context.env.FIRECRAWL_API_KEY) {
      try {
        const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${context.env.FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url, formats: ["markdown"] }),
        });
        const data = await resp.json() as { data?: { markdown?: string; content?: string } };
        const content = data.data?.markdown ?? data.data?.content ?? "";
        if (content) {
          return { content: content.length > 5000 ? content.slice(0, 5000) + "\n\n[...truncated]" : content };
        }
      } catch {
        // Fall through to basic extraction
      }
    }

    // Content extraction with Docling support for binary/rich documents
    try {
      const resp = await fetch(url, { headers: { "User-Agent": "Tekton/0.1" } });
      const contentType = resp.headers.get("content-type") ?? "";

      // ── Rich/binary content → delegate to Docling sidecar ──────
      if (isRichContentType(contentType)) {
        const doclingAvailable = await isDoclingAvailable(context);
        if (doclingAvailable) {
          // Save downloaded content to temp file, parse via Docling, clean up
          const tmpDir = path.join(os.homedir(), ".tekton", "tmp");
          fs.mkdirSync(tmpDir, { recursive: true });
          const ext = extFromContentType(contentType) || extFromUrl(url) || ".bin";
          const tmpFile = path.join(tmpDir, `docling-download-${Date.now()}${ext}`);
          try {
            const buffer = Buffer.from(await resp.arrayBuffer());
            fs.writeFileSync(tmpFile, buffer);
            const result = await doclingParse(tmpFile, "markdown", undefined, context);
            if (result.success && result.content) {
              const content = result.content;
              if (content.length > 5000) {
                return { content: content.slice(0, 5000) + `\n\n[...truncated, full content was ${content.length} chars]` };
              }
              return { content };
            }
            return { content: `Docling parse returned no content for ${url}`, isError: true };
          } catch (parseErr) {
            return {
              content: `[Tekton] Docling parse failed for downloaded file: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}. URL: ${url}`,
              isError: true,
            };
          } finally {
            try { fs.unlinkSync(tmpFile); } catch { /* ignore cleanup errors */ }
          }
        } else {
          return {
            content: `[Tekton] Binary document at ${url} (Content-Type: ${contentType}). Docling service not running for rich parsing. Install with: pip install tekton-docling && tekton-docling --mode http.`,
          };
        }
      }

      // ── Plain text/HTML content ─────────────────────────────────
      const html = await resp.text();
      const text = htmlToText(html);

      if (text.length > 5000) {
        return { content: text.slice(0, 5000) + `\n\n[...truncated, full content was ${text.length} chars]` };
      }

      return { content: text || "No content extracted" };
    } catch (err) {
      return { content: `Extraction error: ${err}`, isError: true };
    }
  },
};

// --- Provider implementations ---

async function exaSearch(query: string, count: number, apiKey: string): Promise<ToolResult> {
  try {
    const resp = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ query, numResults: count, type: "neural", contents: { text: true } }),
    });
    const data = await resp.json() as { results: Array<{ url: string; title: string; text: string }> };
    const results = (data.results ?? []).map(r => `[${r.title}](${r.url})\n${r.text?.slice(0, 200) ?? ""}`).join("\n\n");
    return { content: results || "No results found" };
  } catch (err) {
    return { content: `EXA search error: ${err}`, isError: true };
  }
}

async function tavilySearch(query: string, count: number, apiKey: string): Promise<ToolResult> {
  try {
    const resp = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, query, max_results: count }),
    });
    const data = await resp.json() as { results: Array<{ url: string; title: string; content: string }> };
    const results = (data.results ?? []).map(r => `[${r.title}](${r.url})\n${r.content?.slice(0, 200) ?? ""}`).join("\n\n");
    return { content: results || "No results found" };
  } catch (err) {
    return { content: `Tavily search error: ${err}`, isError: true };
  }
}

async function firecrawlSearch(query: string, count: number, apiKey: string): Promise<ToolResult> {
  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit: count, scrapeOptions: { formats: ["markdown"] } }),
    });
    const data = await resp.json() as { data?: Array<{ url?: string; title?: string; markdown?: string }> };
    const results = (data.data ?? []).map(r => `[${r.title ?? "Untitled"}](${r.url ?? "#"})\n${(r.markdown ?? "").slice(0, 200)}`).join("\n\n");
    return { content: results || "No results found" };
  } catch (err) {
    return { content: `Firecrawl search error: ${err}`, isError: true };
  }
}

async function parallelSearch(query: string, count: number, apiKey: string): Promise<ToolResult> {
  try {
    const resp = await fetch("https://api.parallel.ai/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, num_results: count }),
    });
    const data = await resp.json() as { results?: Array<{ url?: string; title?: string; snippet?: string }> };
    const results = (data.results ?? []).map(r => `[${r.title ?? "Untitled"}](${r.url ?? "#"})\n${r.snippet ?? ""}`).join("\n\n");
    return { content: results || "No results found" };
  } catch (err) {
    return { content: `Parallel search error: ${err}`, isError: true };
  }
}

async function duckDuckGoSearch(query: string, count: number): Promise<ToolResult> {
  try {
    const resp = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
    const html = await resp.text();
    const results: string[] = [];
    const resultRe = /<a rel="nofollow" class="result__a" href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    let match;
    let i = 0;
    while ((match = resultRe.exec(html)) !== null && i < count) {
      results.push(`[${match[2]}](${match[1]})`);
      i++;
    }
    return {
      content: results.length > 0
        ? results.join("\n")
        : "No results found. Set EXA_API_KEY, TAVILY_API_KEY, FIRECRAWL_API_KEY, or PARALLEL_API_KEY for better results.",
    };
  } catch (err) {
    return { content: `Search error: ${err}. Set an API key for web search.`, isError: true };
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ── Content-Type to extension mapping ───────────────────────────────

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/msword": ".doc",
  "application/vnd.ms-word": ".doc",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.oasis.opendocument.text": ".odt",
  "application/vnd.oasis.opendocument.presentation": ".odp",
  "application/vnd.oasis.opendocument.spreadsheet": ".ods",
  "application/epub+zip": ".epub",
  "application/rtf": ".rtf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/tiff": ".tiff",
  "image/bmp": ".bmp",
  "image/webp": ".webp",
};

function extFromContentType(contentType: string): string {
  const lower = contentType.toLowerCase().split(";")[0].trim();
  for (const [mime, ext] of Object.entries(CONTENT_TYPE_EXTENSIONS)) {
    if (lower.includes(mime)) return ext;
  }
  return "";
}

function extFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname);
    return ext || "";
  } catch {
    return "";
  }
}
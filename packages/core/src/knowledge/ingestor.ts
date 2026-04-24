/**
 * Knowledge Ingestor — Parse, chunk, and index documents for the Knowledge Librarian.
 *
 * Supports PDF, DOCX, PPTX (via Docling sidecar), and MD/TXT (direct).
 * Chunks respect section boundaries, with overlap for context preservation.
 * Auto-tags topics per chunk using keyword heuristic (LLM tagging optional).
 */
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, basename } from "node:path";
import type { KnowledgeDocument, KnowledgeChunk, KnowledgeConfig } from "./types.js";

const RICH_FORMATS = [".pdf", ".docx", ".pptx", ".xlsx", ".html", ".latex"];
const DIRECT_FORMATS = [".md", ".txt", ".markdown"];
const ALL_FORMATS = [...RICH_FORMATS, ...DIRECT_FORMATS];

const TARGET_CHUNK_TOKENS = 600;
const OVERLAP_TOKENS = 50;
const AVG_CHARS_PER_TOKEN = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / AVG_CHARS_PER_TOKEN);
}

function fileHash(filePath: string): string {
  try {
    const content = readFileSync(filePath);
    return createHash("sha256").update(content).digest("hex").slice(0, 16);
  } catch {
    return randomUUID().slice(0, 16);
  }
}

export interface DoclingClient {
  parse(filePath: string): Promise<{ text: string; title?: string; pages?: { number: number; text: string }[] }>;
}

export class KnowledgeIngestor {
  private config: KnowledgeConfig;
  private doclingClient: DoclingClient | null;
  private documents: Map<string, KnowledgeDocument> = new Map();

  constructor(config: KnowledgeConfig, doclingClient?: DoclingClient) {
    this.config = config;
    this.doclingClient = doclingClient ?? null;
  }

  /**
   * Ingest a single file into the knowledge base.
   */
  async ingestFile(filePath: string): Promise<KnowledgeDocument> {
    const ext = extname(filePath).toLowerCase();

    if (!ALL_FORMATS.includes(ext)) {
      throw new Error(`Unsupported format: ${ext}. Supported: ${ALL_FORMATS.join(", ")}`);
    }

    const hash = fileHash(filePath);
    const existingDoc = this.findExistingDocument(hash);
    if (existingDoc) {
      return existingDoc; // Already ingested
    }

    let text: string;
    let title: string;
    let pages: { number: number; text: string }[] | undefined;

    if (RICH_FORMATS.includes(ext)) {
      // Use Docling for rich formats
      if (!this.doclingClient) {
        throw new Error(`Docling client required for ${ext} files. Start the docling service first.`);
      }
      const result = await this.doclingClient.parse(filePath);
      text = result.text;
      title = result.title ?? basename(filePath, ext);
      pages = result.pages;
    } else {
      // Read directly for text formats
      text = readFileSync(filePath, "utf-8");
      title = this.extractTitleFromMarkdown(text) ?? basename(filePath, ext);
    }

    // Chunk the content
    const chunks = this.chunkContent(text, title, pages);

    // Auto-tag topics per chunk
    for (const chunk of chunks) {
      chunk.topics = this.detectTopicsForChunk(chunk.content);
    }

    // Calculate total tokens
    const totalTokens = chunks.reduce((sum, c) => sum + c.tokens, 0);

    const doc: KnowledgeDocument = {
      id: randomUUID(),
      filename: basename(filePath),
      title,
      filePath,
      format: ext.slice(1),
      topics: [...new Set(chunks.flatMap(c => c.topics))],
      chunks,
      ingestedAt: new Date().toISOString(),
      totalTokens,
      fileHash: hash,
    };

    this.documents.set(doc.id, doc);
    return doc;
  }

  /**
   * Ingest all supported files in a directory recursively.
   */
  async ingestDirectory(dirPath: string): Promise<KnowledgeDocument[]> {
    const docs: KnowledgeDocument[] = [];

    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
      return docs;
    }

    const walkDirectory = (dir: string) => {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDirectory(fullPath);
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (ALL_FORMATS.includes(ext)) {
            docsToIngest.push(fullPath);
          }
        }
      }
    };

    const docsToIngest: string[] = [];
    walkDirectory(dirPath);

    for (const filePath of docsToIngest) {
      try {
        const doc = await this.ingestFile(filePath);
        docs.push(doc);
      } catch (err) {
        // Skip files that fail to ingest
        console.warn(`Failed to ingest ${filePath}: ${(err as Error).message}`);
      }
    }

    return docs;
  }

  /**
   * Remove a document from the index.
   */
  removeDocument(documentId: string): boolean {
    return this.documents.delete(documentId);
  }

  /**
   * Get all documents.
   */
  getAllDocuments(): KnowledgeDocument[] {
    return [...this.documents.values()];
  }

  /**
   * Get a document by ID.
   */
  getDocument(id: string): KnowledgeDocument | undefined {
    return this.documents.get(id);
  }

  // ── Chunking ────────────────────────────────────────────────────

  private chunkContent(
    text: string,
    title: string,
    pages?: { number: number; text: string }[],
  ): KnowledgeChunk[] {
    if (pages && pages.length > 0) {
      return this.chunkPages(pages, title);
    }

    return this.chunkText(text, title);
  }

  private chunkPages(pages: { number: number; text: string }[], title: string): KnowledgeChunk[] {
    const chunks: KnowledgeChunk[] = [];
    const docId = randomUUID(); // Will be replaced

    for (const page of pages) {
      const pageChunks = this.splitIntoChunks(page.text, TARGET_CHUNK_TOKENS, OVERLAP_TOKENS);
      for (let i = 0; i < pageChunks.length; i++) {
        chunks.push({
          id: randomUUID(),
          documentId: docId,
          content: pageChunks[i],
          heading: `Page ${page.number}`,
          pageNumber: page.number,
          chunkIndex: chunks.length,
          tokens: estimateTokens(pageChunks[i]),
          topics: [],
        });
      }
    }

    // Replace documentId placeholders with actual doc ID
    return chunks;
  }

  private chunkText(text: string, title: string): KnowledgeChunk[] {
    const chunks: KnowledgeChunk[] = [];
    const docId = randomUUID();

    // First try splitting by headings (## or # patterns)
    const sections = this.splitByHeadings(text);

    for (const section of sections) {
      const sectionChunks = this.splitIntoChunks(section.content, TARGET_CHUNK_TOKENS, OVERLAP_TOKENS);
      for (let i = 0; i < sectionChunks.length; i++) {
        chunks.push({
          id: randomUUID(),
          documentId: docId,
          content: sectionChunks[i],
          heading: section.heading,
          chunkIndex: chunks.length,
          tokens: estimateTokens(sectionChunks[i]),
          topics: [],
        });
      }
    }

    return chunks;
  }

  private splitByHeadings(text: string): Array<{ heading: string; content: string }> {
    const lines = text.split("\n");
    const sections: Array<{ heading: string; content: string }> = [];
    let currentHeading = "Introduction";
    let currentContent: string[] = [];

    for (const line of lines) {
      const headingMatch = line.match(/^#{1,6}\s+(.+)/);
      if (headingMatch) {
        if (currentContent.length > 0) {
          sections.push({ heading: currentHeading, content: currentContent.join("\n") });
        }
        currentHeading = headingMatch[1].trim();
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    if (currentContent.length > 0) {
      sections.push({ heading: currentHeading, content: currentContent.join("\n") });
    }

    return sections.length > 0 ? sections : [{ heading: "Full Document", content: text }];
  }

  private splitIntoChunks(text: string, targetTokens: number, overlapTokens: number): string[] {
    const targetChars = targetTokens * AVG_CHARS_PER_TOKEN;
    const overlapChars = overlapTokens * AVG_CHARS_PER_TOKEN;

    if (text.length <= targetChars) {
      return [text];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = Math.min(start + targetChars, text.length);

      // Try to break at paragraph or sentence boundary
      if (end < text.length) {
        const paragraphBreak = text.lastIndexOf("\n\n", end);
        const sentenceBreak = text.lastIndexOf(". ", end);
        const lineBreak = text.lastIndexOf("\n", end);

        if (paragraphBreak > start + targetChars * 0.5) {
          end = paragraphBreak + 2;
        } else if (sentenceBreak > start + targetChars * 0.6) {
          end = sentenceBreak + 2;
        } else if (lineBreak > start + targetChars * 0.5) {
          end = lineBreak + 1;
        }
      }

      chunks.push(text.slice(start, end).trim());

      // Move start with overlap, ensuring forward progress
      const nextStart = end - overlapChars;
      if (nextStart <= start) {
        // Overlap would cause no progress — advance fully
        start = end;
      } else {
        start = nextStart;
      }
      if (start >= text.length) break;
    }

    return chunks.filter(c => c.length > 0);
  }

  // ── Topic Detection ──────────────────────────────────────────────

  private detectTopicsForChunk(content: string): string[] {
    const lower = content.toLowerCase();
    const topics: string[] = [];

    for (const [topic, keywords] of Object.entries(this.config.topics)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword.toLowerCase())) {
          if (!topics.includes(topic)) {
            topics.push(topic);
          }
          break;
        }
      }
    }

    return topics;
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private extractTitleFromMarkdown(text: string): string | null {
    const firstLine = text.split("\n")[0]?.trim();
    if (firstLine?.startsWith("# ")) {
      return firstLine.slice(2).trim();
    }
    return null;
  }

  private findExistingDocument(hash: string): KnowledgeDocument | undefined {
    for (const doc of this.documents.values()) {
      if (doc.fileHash === hash) {
        return doc;
      }
    }
    return undefined;
  }
}
/**
 * Knowledge Librarian types — document ingestion, chunking, search.
 */

// ── Knowledge Document ──────────────────────────────────────────────

export interface KnowledgeDocument {
  id: string;
  filename: string;
  title: string;
  filePath: string;
  format: string;              // pdf, docx, md, txt, html, etc.
  topics: string[];
  chunks: KnowledgeChunk[];
  ingestedAt: string;
  totalTokens: number;
  fileHash: string;            // SHA-256 hash for duplicate detection
}

// ── Knowledge Chunk ─────────────────────────────────────────────────

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  content: string;
  heading: string;
  pageNumber?: number;
  chunkIndex: number;
  tokens: number;
  embedding?: number[];
  topics: string[];
}

// ── Search Results ────────────────────────────────────────────────────

export interface KnowledgeSearchResult {
  chunk: KnowledgeChunk;
  document: KnowledgeDocument;
  relevanceScore: number;
  matchedQuery: string;
}

// ── Knowledge Config ──────────────────────────────────────────────────

export interface KnowledgeConfig {
  enabled: boolean;
  storePath: string;
  indexPath: string;
  autoInject: boolean;
  maxInjectTokens: number;
  maxInjectChunks: number;
  embeddingModel: string;
  topics: Record<string, string[]>;
}

export const DEFAULT_KNOWLEDGE_CONFIG: KnowledgeConfig = {
  enabled: false,
  storePath: "~/.tekton/knowledge/",
  indexPath: "~/.tekton/knowledge/index/",
  autoInject: true,
  maxInjectTokens: 1500,
  maxInjectChunks: 3,
  embeddingModel: "text-embedding-3-small",
  topics: {},
};
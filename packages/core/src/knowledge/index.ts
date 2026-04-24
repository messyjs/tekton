/**
 * Knowledge Librarian module — document ingestion, indexing, and auto-injection.
 */
export { KnowledgeIngestor } from "./ingestor.js";
export type { DoclingClient } from "./ingestor.js";
export { KnowledgeIndexStore } from "./index-store.js";
export { KnowledgeLibrarian } from "./librarian.js";
export type { LibrarianResult, LLMCallerForLibrarian } from "./librarian.js";
export type {
  KnowledgeDocument,
  KnowledgeChunk,
  KnowledgeSearchResult,
  KnowledgeConfig,
} from "./types.js";
export { DEFAULT_KNOWLEDGE_CONFIG } from "./types.js";
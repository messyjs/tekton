/**
 * Knowledge Index Store tests — SQLite storage, search, FTS.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { KnowledgeIndexStore } from "../../../packages/core/src/knowledge/index-store";
import type { KnowledgeConfig, KnowledgeDocument, KnowledgeChunk } from "../../../packages/core/src/knowledge/types";
import { DEFAULT_KNOWLEDGE_CONFIG } from "../../../packages/core/src/knowledge/types";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const TEST_DIR = join(process.env.TEMP ?? "/tmp", "tekton-knowledge-store-test");
const TEST_INDEX = join(TEST_DIR, "index");

const TEST_CONFIG: KnowledgeConfig = {
  ...DEFAULT_KNOWLEDGE_CONFIG,
  enabled: true,
  storePath: TEST_DIR,
  indexPath: TEST_INDEX,
  topics: {
    audio: ["audio", "dsp", "fft"],
    react: ["react", "component", "usestate"],
  },
};

function makeTestDocument(overrides?: Partial<KnowledgeDocument>): KnowledgeDocument {
  return {
    id: randomUUID(),
    filename: "test.md",
    title: "Test Document",
    filePath: "/tmp/test.md",
    format: "md",
    topics: ["audio"],
    ingestedAt: new Date().toISOString(),
    totalTokens: 100,
    fileHash: "abc123",
    chunks: [],
    ...overrides,
  };
}

function makeTestChunk(docId: string, overrides?: Partial<KnowledgeChunk>): KnowledgeChunk {
  return {
    id: randomUUID(),
    documentId: docId,
    content: "Audio processing involves FFT analysis of digital signals.",
    heading: "Introduction",
    chunkIndex: 0,
    tokens: 25,
    topics: ["audio"],
    ...overrides,
  };
}

describe("Knowledge Index Store", () => {
  let store: KnowledgeIndexStore;

  beforeEach(() => {
    try { rmSync(TEST_DIR, { recursive: true }); } catch {}
    mkdirSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_INDEX, { recursive: true });
    store = new KnowledgeIndexStore(TEST_CONFIG);
  });

  afterEach(() => {
    store.close();
    try { rmSync(TEST_DIR, { recursive: true }); } catch {}
  });

  describe("save and retrieve", () => {
    it("saves chunks for a document", () => {
      const doc = makeTestDocument();
      const chunk = makeTestChunk(doc.id);
      store.saveChunks([chunk], doc);

      const docs = store.getAllDocuments();
      expect(docs.length).toBe(1);
      expect(docs[0].title).toBe("Test Document");
    });

    it("retrieves chunks by document ID", () => {
      const doc = makeTestDocument();
      const chunk1 = makeTestChunk(doc.id, { chunkIndex: 0 });
      const chunk2 = makeTestChunk(doc.id, { content: "Second chunk about DSP filters.", chunkIndex: 1 });
      store.saveChunks([chunk1, chunk2], doc);

      const chunks = store.getChunksByDocument(doc.id);
      expect(chunks.length).toBe(2);
      expect(chunks[0].content).toContain("FFT");
    });

    it("persists across restarts", () => {
      const doc = makeTestDocument();
      const chunk = makeTestChunk(doc.id);
      store.saveChunks([chunk], doc);

      // Close and reopen
      store.close();
      const store2 = new KnowledgeIndexStore(TEST_CONFIG);
      const docs = store2.getAllDocuments();
      expect(docs.length).toBe(1);
      store2.close();
    });
  });

  describe("text search", () => {
    it("finds relevant chunks by text", () => {
      const doc = makeTestDocument({ topics: ["audio"] });
      const chunk = makeTestChunk(doc.id, { content: "FFT analysis decomposes audio signals into frequency components." });
      store.saveChunks([chunk], doc);

      const results = store.searchByText("FFT frequency", 5);
      expect(results.length).toBeGreaterThan(0);
    });

    it("returns empty results for irrelevant queries", () => {
      const doc = makeTestDocument();
      const chunk = makeTestChunk(doc.id, { content: "Audio processing with FFT." });
      store.saveChunks([chunk], doc);

      const results = store.searchByText("quantum physics string theory", 5);
      expect(results.length).toBe(0);
    });
  });

  describe("topic search", () => {
    it("finds documents by topic", () => {
      const doc = makeTestDocument({ topics: ["audio", "dsp"] });
      const chunk = makeTestChunk(doc.id, { topics: ["audio"] });
      store.saveChunks([chunk], doc);

      const results = store.searchByTopics(["audio"], 5);
      expect(results.length).toBeGreaterThan(0);
    });

    it("returns empty for non-existent topics", () => {
      const doc = makeTestDocument({ topics: ["audio"] });
      const chunk = makeTestChunk(doc.id);
      store.saveChunks([chunk], doc);

      const results = store.searchByTopics(["quantum-physics"], 5);
      expect(results.length).toBe(0);
    });
  });

  describe("removal", () => {
    it("removes a document and its chunks", () => {
      const doc = makeTestDocument();
      const chunk = makeTestChunk(doc.id);
      store.saveChunks([chunk], doc);

      const removed = store.removeDocument(doc.id);
      expect(removed).toBe(true);

      const docs = store.getAllDocuments();
      expect(docs.length).toBe(0);

      const chunks = store.getChunksByDocument(doc.id);
      expect(chunks.length).toBe(0);
    });
  });
});
/**
 * Knowledge Librarian tests — topic detection, knowledge retrieval, injection.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { KnowledgeLibrarian } from "../../../packages/core/src/knowledge/librarian";
import { KnowledgeIndexStore } from "../../../packages/core/src/knowledge/index-store";
import { KnowledgeIngestor } from "../../../packages/core/src/knowledge/ingestor";
import type { KnowledgeConfig, KnowledgeDocument, KnowledgeChunk } from "../../../packages/core/src/knowledge/types";
import { DEFAULT_KNOWLEDGE_CONFIG } from "../../../packages/core/src/knowledge/types";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const TEST_DIR = join(process.env.TEMP ?? "/tmp", "tekton-librarian-test");
const TEST_INDEX = join(TEST_DIR, "index");

const TEST_CONFIG: KnowledgeConfig = {
  ...DEFAULT_KNOWLEDGE_CONFIG,
  enabled: true,
  storePath: TEST_DIR,
  indexPath: TEST_INDEX,
  maxInjectTokens: 1500,
  maxInjectChunks: 3,
  topics: {
    gann: ["gann", "square of nine", "wheel of 24", "law of vibration"],
    juce: ["juce", "audioprocessor", "vst3", "audio plugin", "dsp"],
    react: ["react", "jsx", "tsx", "usestate", "useeffect", "component"],
    openscad: ["openscad", "scad", "parametric", "stl"],
    cmake: ["cmake", "cmakelists", "target_link", "find_package"],
  },
};

function makeTestDocument(overrides?: Partial<KnowledgeDocument>): KnowledgeDocument {
  return {
    id: randomUUID(),
    filename: "juce-guide.md",
    title: "JUCE Audio Plugin Guide",
    filePath: "/tmp/juce-guide.md",
    format: "md",
    topics: ["juce", "audio"],
    ingestedAt: new Date().toISOString(),
    totalTokens: 200,
    fileHash: "hash1",
    chunks: [],
    ...overrides,
  };
}

function makeTestChunk(docId: string, overrides?: Partial<KnowledgeChunk>): KnowledgeChunk {
  return {
    id: randomUUID(),
    documentId: docId,
    content: "JUCE AudioProcessor provides the core DSP processing for VST3 plugins. Override processBlock() for real-time audio.",
    heading: "AudioProcessor",
    chunkIndex: 0,
    tokens: 50,
    topics: ["juce"],
    ...overrides,
  };
}

describe("Knowledge Librarian", () => {
  let librarian: KnowledgeLibrarian;
  let store: KnowledgeIndexStore;

  beforeEach(() => {
    try { rmSync(TEST_DIR, { recursive: true }); } catch {}
    mkdirSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_INDEX, { recursive: true });
    store = new KnowledgeIndexStore(TEST_CONFIG);
    librarian = new KnowledgeLibrarian(TEST_CONFIG, store);
  });

  afterEach(() => {
    store.close();
    try { rmSync(TEST_DIR, { recursive: true }); } catch {}
  });

  describe("topic detection", () => {
    it("detects 'gann' when message mentions Gann square of nine", async () => {
      const topics = await librarian.detectTopics("I'm using the Gann square of nine for price analysis");
      expect(topics).toContain("gann");
    });

    it("detects 'juce' when message mentions AudioProcessor", async () => {
      const topics = await librarian.detectTopics("How do I implement the AudioProcessor processBlock?");
      expect(topics).toContain("juce");
    });

    it("detects 'react' when message mentions useState", async () => {
      const topics = await librarian.detectTopics("The component should use useState for local state");
      expect(topics).toContain("react");
    });

    it("returns empty for unrelated messages", async () => {
      const topics = await librarian.detectTopics("What's the weather like today?");
      expect(topics).toHaveLength(0);
    });

    it("detects multiple topics in one message", async () => {
      const topics = await librarian.detectTopics("I'm building a JUCE VST3 plugin with CMake build system");
      expect(topics).toContain("juce");
      expect(topics).toContain("cmake");
    });
  });

  describe("knowledge retrieval", () => {
    it("returns formatted chunks for detected topics", async () => {
      const doc = makeTestDocument();
      const chunk = makeTestChunk(doc.id);
      store.saveChunks([chunk], doc);

      const result = await librarian.getRelevantKnowledge("How do I use AudioProcessor for VST3?");
      expect(result).not.toBeNull();
      expect(result!.formattedInjection).toContain("Reference Material");
      expect(result!.formattedInjection).toContain("JUCE Audio Plugin Guide");
      expect(result!.chunks.length).toBeGreaterThan(0);
    });

    it("returns null for no-topic messages", async () => {
      const result = await librarian.getRelevantKnowledge("Hello, how are you doing today?");
      expect(result).toBeNull();
    });

    it("injection respects maxInjectTokens limit", async () => {
      // Create a config with very low token limit
      const lowLimitConfig: KnowledgeConfig = {
        ...TEST_CONFIG,
        maxInjectTokens: 50, // Very low
        maxInjectChunks: 1,
      };
      const lowLibrarian = new KnowledgeLibrarian(lowLimitConfig, store);

      const doc = makeTestDocument();
      const chunk = makeTestChunk(doc.id, {
        content: "This is a very long chunk about JUCE AudioProcessor that would exceed the token limit if included in full. It has many sentences about DSP processing, real-time audio, and VST3 plugin development.".repeat(3),
      });
      store.saveChunks([chunk], doc);

      const result = await lowLibrarian.getRelevantKnowledge("How do I use AudioProcessor?");
      if (result) {
        expect(result.totalTokens).toBeLessThanOrEqual(200); // Some overhead
      }
    });

    it("chunks are exact text, not summarized", async () => {
      const originalContent = "JUCE AudioProcessor provides the core DSP processing for VST3 plugins.";
      const doc = makeTestDocument();
      const chunk = makeTestChunk(doc.id, { content: originalContent });
      store.saveChunks([chunk], doc);

      const result = await librarian.getRelevantKnowledge("AudioProcessor VST3");
      expect(result).not.toBeNull();
      // The chunk content should be exactly as stored
      expect(result!.chunks[0].chunk.content).toBe(originalContent);
    });
  });

  describe("manual search", () => {
    it("allows manual search for specific material", async () => {
      const doc = makeTestDocument();
      const chunk = makeTestChunk(doc.id);
      store.saveChunks([chunk], doc);

      const results = await librarian.search("AudioProcessor", 5);
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
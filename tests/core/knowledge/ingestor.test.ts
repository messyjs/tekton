/**
 * Knowledge Ingestor tests — document parsing, chunking, topic detection.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { KnowledgeIngestor } from "../../../packages/core/src/knowledge/ingestor";
import { KnowledgeIndexStore } from "../../../packages/core/src/knowledge/index-store";
import type { KnowledgeConfig, KnowledgeDocument } from "../../../packages/core/src/knowledge/types";
import { DEFAULT_KNOWLEDGE_CONFIG } from "../../../packages/core/src/knowledge/types";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(process.env.TEMP ?? "/tmp", "tekton-knowledge-test");
const TEST_INDEX = join(TEST_DIR, "index");

const TEST_CONFIG: KnowledgeConfig = {
  ...DEFAULT_KNOWLEDGE_CONFIG,
  enabled: true,
  storePath: TEST_DIR,
  indexPath: TEST_INDEX,
  topics: {
    audio: ["audio", "dsp", "filter", "fft", "reverb", "compressor"],
    react: ["react", "jsx", "component", "usestate", "useeffect"],
    cmake: ["cmake", "cmakelists", "target_link"],
  },
};

// Mock Docling client for rich format tests
const mockDoclingClient = {
  async parse(filePath: string) {
    return {
      text: "Parsed PDF content about audio processing and FFT analysis.",
      title: "Audio Processing Guide",
      pages: [
        { number: 1, text: "Audio processing involves digital signal processing techniques." },
        { number: 2, text: "FFT analysis decomposes signals into frequency components." },
      ],
    };
  },
};

describe("Knowledge Ingestor", () => {
  let ingestor: KnowledgeIngestor;

  beforeEach(() => {
    ingestor = new KnowledgeIngestor(TEST_CONFIG, mockDoclingClient);
    // Clean test directory
    try { rmSync(TEST_DIR, { recursive: true }); } catch {}
    mkdirSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_INDEX, { recursive: true });
  });

  afterEach(() => {
    try { rmSync(TEST_DIR, { recursive: true }); } catch {}
  });

  describe("markdown ingestion", () => {
    it("ingests a markdown file and produces chunks", async () => {
      const mdPath = join(TEST_DIR, "test.md");
      writeFileSync(mdPath, `# Audio Processing Guide

## Introduction
Audio processing involves digital signal processing techniques.
We use FFT to analyze frequency content.

## Filter Design
The filter should have a cutoff frequency of 1kHz.
Use a Butterworth design for flat passband response.

## Implementation
The DSP pipeline processes 2048 sample buffers at 48kHz.
Always use real-time safe memory allocation patterns.
`);

      const doc = await ingestor.ingestFile(mdPath);
      expect(doc.id).toBeDefined();
      expect(doc.filename).toBe("test.md");
      expect(doc.title).toBe("Audio Processing Guide");
      expect(doc.format).toBe("md");
      expect(doc.chunks.length).toBeGreaterThan(0);
      expect(doc.totalTokens).toBeGreaterThan(0);
    });

    it("chunks respect size limits", async () => {
      const mdPath = join(TEST_DIR, "large.md");
      // Create a large document
      const lines = Array.from({ length: 200 }, (_, i) => `Line ${i}: This is a test line with some content about audio processing.`);
      writeFileSync(mdPath, `# Large Document\n\n${lines.join("\n")}`);

      const doc = await ingestor.ingestFile(mdPath);
      // Each chunk should be reasonably sized
      for (const chunk of doc.chunks) {
        expect(chunk.tokens).toBeLessThanOrEqual(1200); // Some overhead beyond target
      }
    });

    it("assigns topics to chunks", async () => {
      const mdPath = join(TEST_DIR, "audio.md");
      writeFileSync(mdPath, `# Audio Guide\n\nFFT analysis of audio signals with DSP filter design.`);

      const doc = await ingestor.ingestFile(mdPath);
      const topicsFound = doc.chunks.flatMap(c => c.topics);
      expect(topicsFound).toContain("audio");
    });

    it("skips already-ingested files", async () => {
      const mdPath = join(TEST_DIR, "dup.md");
      writeFileSync(mdPath, `# Test Doc\n\nContent here.`);

      const doc1 = await ingestor.ingestFile(mdPath);
      const doc2 = await ingestor.ingestFile(mdPath);
      expect(doc1.id).toBe(doc2.id);
    });

    it("extracts title from markdown heading", async () => {
      const mdPath = join(TEST_DIR, "titled.md");
      writeFileSync(mdPath, `# My Document Title\n\nSome content here.`);

      const doc = await ingestor.ingestFile(mdPath);
      expect(doc.title).toBe("My Document Title");
    });
  });

  describe("text file ingestion", () => {
    it("ingests a plain text file", async () => {
      const txtPath = join(TEST_DIR, "notes.txt");
      writeFileSync(txtPath, "Notes about React component patterns and useState hooks.");

      const doc = await ingestor.ingestFile(txtPath);
      expect(doc.format).toBe("txt");
      expect(doc.chunks.length).toBeGreaterThan(0);
    });
  });

  describe("rich format ingestion", () => {
    it("uses Docling client for PDF files", async () => {
      const pdfPath = join(TEST_DIR, "audio-guide.pdf");
      writeFileSync(pdfPath, "fake pdf content");

      const doc = await ingestor.ingestFile(pdfPath);
      expect(doc.format).toBe("pdf");
      expect(doc.title).toBe("Audio Processing Guide");
      expect(doc.chunks.length).toBeGreaterThan(0);
    });

    it("throws for rich formats without Docling client", async () => {
      const noDocling = new KnowledgeIngestor(TEST_CONFIG);
      const pdfPath = join(TEST_DIR, "test.pdf");
      writeFileSync(pdfPath, "fake pdf");

      await expect(noDocling.ingestFile(pdfPath)).rejects.toThrow("Docling client required");
    });
  });

  describe("document management", () => {
    it("removes a document from the index", async () => {
      const mdPath = join(TEST_DIR, "remove.md");
      writeFileSync(mdPath, `# Remove Me\n\nContent here.`);

      const doc = await ingestor.ingestFile(mdPath);
      expect(ingestor.getAllDocuments().length).toBe(1);

      const removed = ingestor.removeDocument(doc.id);
      expect(removed).toBe(true);
      expect(ingestor.getAllDocuments().length).toBe(0);
    });

    it("gets a document by ID", async () => {
      const mdPath = join(TEST_DIR, "get.md");
      writeFileSync(mdPath, `# Get Me\n\nContent here.`);

      const doc = await ingestor.ingestFile(mdPath);
      const retrieved = ingestor.getDocument(doc.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.title).toBe("Get Me");
    });
  });
});
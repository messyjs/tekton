import { describe, it, expect } from "vitest";
import { compress, decompress, getCompressionRatio, estimateTokens } from "../../packages/core/src/compression/caveman.ts";
import type { CompressionTier } from "../../packages/core/src/compression/caveman.ts";
import { detectTier } from "../../packages/core/src/compression/tiers.ts";

describe("Caveman Compression", () => {
  describe("tier detection", () => {
    it("returns 'none' for user ↔ tekton", () => {
      expect(detectTier({ source: "user", destination: "tekton", isSubAgent: false })).toBe("none");
      expect(detectTier({ source: "tekton", destination: "user", isSubAgent: false })).toBe("none");
    });

    it("returns 'ultra' for sub-agents", () => {
      expect(detectTier({ source: "tekton", destination: "model", isSubAgent: true })).toBe("ultra");
    });

    it("returns 'full' for tekton ↔ model", () => {
      expect(detectTier({ source: "tekton", destination: "model", isSubAgent: false })).toBe("full");
    });
  });

  describe("none tier", () => {
    it("passes text through unchanged", () => {
      const text = "The quick brown fox jumps over the lazy dog.";
      expect(compress(text, "none")).toBe(text);
    });
  });

  describe("lite tier", () => {
    it("removes articles", () => {
      const text = "The cat sat on a mat";
      const compressed = compress(text, "lite");
      expect(compressed.toLowerCase()).not.toMatch(/\bthe\b/);
    });

    it("contracts negations", () => {
      const text = "This is not valid";
      const compressed = compress(text, "lite");
      expect(compressed).toContain("isn't");
    });
  });

  describe("full tier", () => {
    it("shortens common phrases", () => {
      const text = "In order to run the test, as well as verify the output";
      const compressed = compress(text, "full");
      expect(compressed).toContain("to run");
      expect(compressed).toContain("and");
      expect(compressed).not.toContain("In order to");
      expect(compressed).not.toContain("as well as");
    });
  });

  describe("ultra tier", () => {
    it("abbreviates programming terms", () => {
      const text = "The function takes a parameter and returns a configuration";
      const compressed = compress(text, "ultra");
      expect(compressed).toContain("fn");
      expect(compressed).toContain("param");
      expect(compressed).toContain("cfg");
    });
  });

  describe("code protection", () => {
    it("preserves code blocks", () => {
      const text = "Here is some code:\n```python\ndef function(x):\n    return x + 1\n```\nThat was a function.";
      const compressed = compress(text, "ultra");
      expect(compressed).toContain("def function(x):");
      expect(compressed).toContain("return x + 1");
    });

    it("preserves URLs", () => {
      const text = "Visit https://example.com/docs for more info";
      const compressed = compress(text, "ultra");
      expect(compressed).toContain("https://example.com/docs");
    });
  });

  describe("compression ratio", () => {
    it("calculates ratio correctly", () => {
      const original = "This is a test string";
      const compressed = compress(original, "full");
      const ratio = getCompressionRatio(original, compressed);
      expect(ratio).toBeGreaterThan(0);
      expect(ratio).toBeLessThanOrEqual(1);
    });

    it("returns 1 for empty string", () => {
      expect(getCompressionRatio("", "")).toBe(1);
    });
  });

  describe("token estimation", () => {
    it("estimates tokens for text", () => {
      const tokens = estimateTokens("This is a test string with some words");
      expect(tokens).toBeGreaterThan(0);
    });

    it("estimates more tokens for longer text", () => {
      const short = estimateTokens("hello");
      const long = estimateTokens("This is a much longer string with many more words and characters");
      expect(long).toBeGreaterThan(short);
    });
  });

  describe("decompress", () => {
    it("returns text as-is (rule-based compression is lossy)", () => {
      const text = "isn't valid param";
      expect(decompress(text)).toBe(text);
    });
  });
});
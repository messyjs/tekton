/**
 * Integration Test — Compression across all tiers
 */
import { describe, it, expect } from "vitest";
import { compress, decompress, estimateTokens, getCompressionRatio, detectTier } from "@tekton/core";

describe("Compression Integration", () => {
  const simple = "Hello world";
  const complex = "Quantum computing harnesses collective properties of quantum states such as superposition interference and entanglement to perform calculations. The devices that perform quantum computations are known as quantum computers. They are expected to be capable of solving certain computational problems substantially faster than classical computers.";

  it("detects compression tiers", () => {
    const tier = detectTier(complex);
    expect(["lite", "compact", "full"]).toContain(tier);
  });

  it("compresses and decompresses across all tiers", () => {
    const tiers: Array<"lite" | "compact" | "full"> = ["lite", "compact", "full"];
    for (const tier of tiers) {
      const compressed = compress(complex, tier);
      expect(compressed).toBeTruthy();
      expect(compressed.length).toBeGreaterThan(0);

      const decompressed = decompress(compressed);
      expect(decompressed.length).toBeGreaterThan(0);
    }
  });

  it("estimates tokens consistently", () => {
    const tokens = estimateTokens(complex);
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(complex.length);
  });

  it("calculates compression ratio", () => {
    const compressed = compress(complex, "full");
    const ratio = getCompressionRatio(complex, compressed);
    expect(ratio).toBeGreaterThan(0);
    expect(ratio).toBeLessThanOrEqual(1.0);
  });

  it("handles empty strings gracefully", () => {
    expect(compress("", "lite")).toBe("");
    expect(decompress("")).toBe("");
    expect(estimateTokens("")).toBe(0);
  });

  it("full compression reduces text size", () => {
    const compressed = compress(complex, "full");
    // Full compression should produce output shorter than input or equal
    expect(compressed.length).toBeLessThanOrEqual(complex.length);
  });
});
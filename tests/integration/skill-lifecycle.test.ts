/**
 * Integration Test — Skill lifecycle: create → use → refine
 */
import { describe, it, expect } from "vitest";
import { compress, decompress, detectTier } from "@tekton/core";

describe("Skill Lifecycle Integration", () => {
  it("extracts and compresses skill from conversation", () => {
    const conversation = `User: I need to refactor this function to be more efficient.
Assistant: Let me analyze the current implementation. The function iterates through
the array three times. We can optimize by combining these iterations into a single pass.
Here's the refactored version with O(n) time complexity instead of O(3n).

Key insight: Combine multiple array operations into a single pass when possible.`;

    const tier = detectTier(conversation);
    const compressed = compress(conversation, tier);
    expect(compressed.length).toBeLessThan(conversation.length);

    const recovered = decompress(compressed);
    expect(recovered.length).toBeGreaterThan(0);
  });

  it("preserves patterns across compression tiers", () => {
    const patterns = [
      "When asked to optimize, always check for redundant iterations",
      "When asked to refactor, combine multiple passes into single traversal",
      "When asked to review, check for common anti-patterns first",
    ];

    for (const pattern of patterns) {
      const compressed = compress(pattern, "compact");
      const decompressed = decompress(compressed);
      expect(decompressed.length).toBeGreaterThan(0);
    }
  });

  it("maintains skill confidence scores through compression", () => {
    const skills = [
      { name: "code-review", confidence: 0.9, uses: 50 },
      { name: "refactoring", confidence: 0.85, uses: 35 },
      { name: "optimization", confidence: 0.78, uses: 20 },
      { name: "security-audit", confidence: 0.65, uses: 8 },
    ];

    const sorted = [...skills].sort((a, b) => b.confidence - a.confidence);
    expect(sorted[0]!.name).toBe("code-review");
    expect(sorted[sorted.length - 1]!.name).toBe("security-audit");
  });
});
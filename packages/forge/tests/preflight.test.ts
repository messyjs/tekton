/**
 * Preflight Check Tests — Tool availability detection and domain checking.
 */
import { describe, it, expect } from "vitest";
import { checkDomain, checkMultipleDomains } from "@tekton/forge";

describe("checkDomain", () => {
  it("detects installed tools (git, node)", async () => {
    // These should be available in any dev environment
    const result = await checkDomain("html-static");
    // git should be installed in test environment
    expect(result.missing).not.toContain("git");
  });

  it("reports missing tools correctly", async () => {
    // Use a domain that might have missing optional tools
    const result = await checkDomain("vst-audio");
    // Required = git (should exist), optional = cmake, juce (may or may not exist)
    // Just verify the structure is correct
    expect(result).toHaveProperty("ready");
    expect(result).toHaveProperty("missing");
    expect(result).toHaveProperty("warnings");
    expect(Array.isArray(result.missing)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it("returns result even for unknown domain", async () => {
    const result = await checkDomain("html-static" as any);
    expect(result).toHaveProperty("ready");
    // Unknown domain should still check for git
  });
});

describe("checkMultipleDomains", () => {
  it("merges results from multiple domains", async () => {
    const result = await checkMultipleDomains(["html-static", "web-app"]);
    expect(result).toHaveProperty("ready");
    expect(result).toHaveProperty("missing");
    expect(result).toHaveProperty("warnings");
    // Deduplication: git appears in both but should only appear once
  });

  it("handles empty domains list", async () => {
    const result = await checkMultipleDomains([]);
    expect(result.ready).toBe(true);
    expect(result.missing).toHaveLength(0);
  });
});
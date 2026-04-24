/**
 * Integration Test — Full end-to-end session flow
 */
import { describe, it, expect } from "vitest";
import {
  ModelRouter,
  scoreComplexity,
  compress,
  decompress,
  estimateTokens,
  detectTier,
  loadConfig,
  DEFAULT_CONFIG,
} from "@tekton/core";

describe("Full Session Integration", () => {
  it("scores complexity for different prompts", () => {
    const simpleContext = { prompt: "what is 2+2?", tokenCount: 10, hasCodeBlocks: false, matchingSkills: [], sessionComplexityHistory: [] };
    const complexContext = { prompt: "write a full React app with TypeScript, routing, and state management", tokenCount: 200, hasCodeBlocks: true, matchingSkills: ["coding"], sessionComplexityHistory: [] };
    const simple = scoreComplexity(simpleContext);
    const complex = scoreComplexity(complexContext);
    expect(simple).toBeLessThan(complex);
  });

  it("routes a prompt with Router", () => {
    const config = {
      fastModel: DEFAULT_CONFIG.models.fast.model,
      fastProvider: DEFAULT_CONFIG.models.fast.provider,
      deepModel: DEFAULT_CONFIG.models.deep.model,
      deepProvider: DEFAULT_CONFIG.models.deep.provider,
      fallbackChain: [],
      complexityThreshold: 0.6,
      simpleThreshold: 0.3,
    };
    const router = new ModelRouter(config);
    const decision = router.route({
      prompt: "explain quantum computing",
      tokenCount: 100,
      hasCodeBlocks: false,
      matchingSkills: [],
      sessionComplexityHistory: [],
    });
    expect(decision.model).toBeDefined();
    expect(decision.reason).toBeDefined();
  });

  it("compresses and decompresses", () => {
    const text = "User: Hello, I need help.\nAssistant: I can help!\nUser: Great, thanks.";
    const tier = detectTier(text);
    const compressed = compress(text, tier);
    const decompressed = decompress(compressed);
    expect(compressed.length).toBeLessThanOrEqual(text.length);
    expect(decompressed.length).toBeGreaterThan(0);
  });

  it("estimates token usage", () => {
    const tokens = estimateTokens("Explain quantum computing in simple terms.");
    expect(tokens).toBeGreaterThan(0);
  });

  it("loads config and verifies defaults", () => {
    const config = loadConfig();
    expect(config).toBeDefined();
    expect(config.identity.name).toBe("tekton");
    expect(config.compression.enabled).toBe(true);
  });
});
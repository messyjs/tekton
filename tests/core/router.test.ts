import { describe, it, expect } from "vitest";
import { ModelRouter } from "../../packages/core/src/models/router.ts";
import type { RoutingContext } from "../../packages/core/src/models/router.ts";
import { scoreComplexity } from "../../packages/core/src/models/complexity.ts";

const testConfig = {
  fastModel: "gemma3:12b",
  fastProvider: "ollama",
  deepModel: "gemma3:27b",
  deepProvider: "ollama",
  fallbackChain: [] as Array<{ model: string; provider: string }>,
  complexityThreshold: 0.6,
  simpleThreshold: 0.3,
};

function makeContext(overrides: Partial<RoutingContext> = {}): RoutingContext {
  return {
    prompt: "hello",
    tokenCount: 50,
    hasCodeBlocks: false,
    matchingSkills: [],
    sessionComplexityHistory: [],
    ...overrides,
  };
}

describe("ModelRouter", () => {
  it("routes simple prompts to fast model", () => {
    const router = new ModelRouter(testConfig);
    const decision = router.route(makeContext({
      prompt: "fix a typo in the readme",
      tokenCount: 20,
    }));
    expect(decision.model).toBe("gemma3:12b");
  });

  it("routes complex prompts to deep model", () => {
    const router = new ModelRouter(testConfig);
    const decision = router.route(makeContext({
      prompt: "Please architect and design a distributed system for concurrent processing with race condition handling",
      tokenCount: 500,
    }));
    expect(decision.model).toBe("gemma3:27b");
  });

  it("respects manual override", () => {
    const router = new ModelRouter(testConfig);
    const decision = router.route(makeContext({
      userOverride: "claude-3.5-sonnet",
    }));
    expect(decision.model).toBe("claude-3.5-sonnet");
    expect(decision.provider).toBe("manual");
  });

  it("skill match reduces complexity routing", () => {
    const router = new ModelRouter(testConfig);
    const withoutSkill = router.route(makeContext({
      prompt: "debug complex issue in the system",
      tokenCount: 200,
      matchingSkills: [],
    }));
    const withSkill = router.route(makeContext({
      prompt: "debug complex issue in the system",
      tokenCount: 200,
      matchingSkills: ["debug-helper"],
    }));
    expect(withSkill.complexityScore).toBeLessThanOrEqual(withoutSkill.complexityScore);
  });

  it("fast mode always uses fast model", () => {
    const router = new ModelRouter(testConfig);
    router.setMode("fast");
    const decision = router.route(makeContext({
      prompt: "architect a complex distributed system",
      tokenCount: 5000,
    }));
    expect(decision.model).toBe("gemma3:12b");
  });

  it("deep mode always uses deep model", () => {
    const router = new ModelRouter(testConfig);
    router.setMode("deep");
    const decision = router.route(makeContext({
      prompt: "fix a typo",
      tokenCount: 10,
    }));
    expect(decision.model).toBe("gemma3:27b");
  });

  it("records recent decisions", () => {
    const router = new ModelRouter(testConfig);
    router.route(makeContext({ prompt: "test", tokenCount: 100 }));
    router.route(makeContext({ prompt: "hello world", tokenCount: 20 }));
    const recent = router.getRecentDecisions();
    expect(recent.length).toBe(2);
  });

  it("getMode returns current mode", () => {
    const router = new ModelRouter(testConfig);
    expect(router.getMode()).toBe("auto");
    router.setMode("fast");
    expect(router.getMode()).toBe("fast");
  });
});

describe("Complexity Scoring", () => {
  it("returns score between 0 and 1", () => {
    const score = scoreComplexity(makeContext());
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("escalation keywords increase score", () => {
    const simple = scoreComplexity(makeContext({
      prompt: "fix a typo",
      tokenCount: 20,
    }));
    const complex = scoreComplexity(makeContext({
      prompt: "architect a distributed system with concurrent processing",
      tokenCount: 500,
    }));
    expect(complex).toBeGreaterThan(simple);
  });

  it("skill match reduces score", () => {
    const without = scoreComplexity(makeContext({ matchingSkills: [] }));
    const withSkill = scoreComplexity(makeContext({ matchingSkills: ["test-skill"] }));
    expect(withSkill).toBeLessThan(without);
  });

  it("code blocks increase score", () => {
    const without = scoreComplexity(makeContext({ hasCodeBlocks: false }));
    const withBlocks = scoreComplexity(makeContext({ hasCodeBlocks: true }));
    expect(withBlocks).toBeGreaterThan(without);
  });
});
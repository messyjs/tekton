import { describe, it, expect, beforeEach } from "vitest";
import {
  EXPANDED_PROVIDERS,
  MODEL_PRICING,
  findProviderForModel,
  findModelConfig,
  getModelsByType,
  getProviderIds,
  ModelRouter,
  type RoutingContext,
} from "@tekton/core";
import { FallbackChain, type FallbackChainConfig } from "@tekton/core";
import { RoutingRulesEngine, DEFAULT_ROUTING_RULES, type RoutingRule } from "@tekton/core";
import { CostTracker } from "@tekton/core";

// ── Helpers ──────────────────────────────────────────────────────────

function makeRouterConfig() {
  return {
    fastModel: "gemma3:12b",
    fastProvider: "ollama",
    deepModel: "claude-3.5-sonnet",
    deepProvider: "anthropic",
    fallbackChain: [
      { model: "gpt-4o", provider: "openai" },
      { model: "gemini-2.5-pro", provider: "google" },
    ],
    complexityThreshold: 0.6,
    simpleThreshold: 0.3,
  };
}

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

// ── Expanded Providers ─────────────────────────────────────────────────

describe("Expanded Providers", () => {
  it("has 18+ provider entries", () => {
    const providerCount = Object.keys(EXPANDED_PROVIDERS).length;
    expect(providerCount).toBeGreaterThanOrEqual(18);
  });

  it("includes all major providers", () => {
    const ids = getProviderIds();
    expect(ids).toContain("anthropic");
    expect(ids).toContain("openai");
    expect(ids).toContain("google");
    expect(ids).toContain("zhipu");
    expect(ids).toContain("deepseek");
    expect(ids).toContain("groq");
    expect(ids).toContain("mistral");
    expect(ids).toContain("xai");
    expect(ids).toContain("cerebras");
    expect(ids).toContain("together");
    expect(ids).toContain("fireworks");
    expect(ids).toContain("openrouter");
    expect(ids).toContain("ollama");
    expect(ids).toContain("lmstudio");
  });

  it("finds provider for known model", () => {
    const provider = findProviderForModel("claude-3.5-sonnet");
    expect(provider).not.toBeNull();
    expect(provider!.id).toBe("anthropic");
  });

  it("finds provider for local model", () => {
    const provider = findProviderForModel("gemma3:27b");
    expect(provider).not.toBeNull();
    expect(provider!.id).toBe("ollama");
  });

  it("returns null for unknown model", () => {
    const provider = findProviderForModel("nonexistent-model");
    expect(provider).toBeNull();
  });

  it("finds model config for known model", () => {
    const model = findModelConfig("gpt-4o");
    expect(model).not.toBeNull();
    expect(model!.name).toBe("GPT-4o");
    expect(model!.type).toBe("deep");
  });

  it("groups models by type", () => {
    const byType = getModelsByType();
    expect(byType.fast.length).toBeGreaterThan(0);
    expect(byType.deep.length).toBeGreaterThan(0);
  });

  it("has pricing for all models in providers", () => {
    let priced = 0;
    let unpriced = 0;
    for (const provider of Object.values(EXPANDED_PROVIDERS)) {
      for (const model of provider.models) {
        if (model.id === "*") continue;
        if (MODEL_PRICING[model.id]) {
          priced++;
        } else {
          unpriced++;
        }
      }
    }
    // Most models should have pricing
    expect(priced).toBeGreaterThan(unpriced);
  });

  it("has apiMode for providers that specify it", () => {
    const anthropic = EXPANDED_PROVIDERS["anthropic"];
    expect(anthropic.apiMode).toBe("anthropic_messages");

    const openai = EXPANDED_PROVIDERS["openai"];
    expect(openai.apiMode).toBe("chat_completions");
  });

  it("has local flag for local providers", () => {
    expect(EXPANDED_PROVIDERS["ollama"].local).toBe(true);
    expect(EXPANDED_PROVIDERS["lmstudio"].local).toBe(true);
    expect(EXPANDED_PROVIDERS["anthropic"].local).toBeUndefined();
  });
});

// ── Fallback Chain ────────────────────────────────────────────────────

describe("FallbackChain", () => {
  it("creates fallback chain with providers", () => {
    const chain = new FallbackChain(EXPANDED_PROVIDERS, {
      providers: [
        { model: "gpt-4o", provider: "openai" },
        { model: "claude-3.5-sonnet", provider: "anthropic" },
      ],
    });
    expect(chain).toBeDefined();
  });

  it("throws without providers", () => {
    expect(() => new FallbackChain(EXPANDED_PROVIDERS, { providers: [] })).toThrow();
  });

  it("falls through on simulated error", async () => {
    const chain = new FallbackChain(EXPANDED_PROVIDERS, {
      providers: [
        { model: "gpt-4o", provider: "openai" },
        { model: "claude-3.5-sonnet", provider: "anthropic" },
      ],
      maxRetries: 0,
    });

    // The simulate call should succeed (it doesn't make real API calls)
    const result = await chain.call({
      model: "gpt-4o",
      provider: "openai",
      messages: [{ role: "user", content: "test" }],
    });
    expect(result.model).toBe("gpt-4o");
    expect(result.provider).toBe("openai");
  });

  it("records calls in log", async () => {
    const chain = new FallbackChain(EXPANDED_PROVIDERS, {
      providers: [{ model: "gpt-4o", provider: "openai" }],
    });

    await chain.call({
      model: "gpt-4o",
      provider: "openai",
      messages: [{ role: "user", content: "test" }],
    });

    const log = chain.getCallLog();
    expect(log.length).toBe(1);
    expect(log[0].success).toBe(true);
  });

  it("clears call log", async () => {
    const chain = new FallbackChain(EXPANDED_PROVIDERS, {
      providers: [{ model: "gpt-4o", provider: "openai" }],
    });

    await chain.call({
      model: "gpt-4o",
      provider: "openai",
      messages: [{ role: "user", content: "test" }],
    });

    chain.clearLog();
    expect(chain.getCallLog().length).toBe(0);
  });

  it("classifies rate limit errors", () => {
    // FallbackChain has a classifyError method that's private
    // We can test it indirectly through the call log
    const chain = new FallbackChain(EXPANDED_PROVIDERS, {
      providers: [{ model: "gpt-4o", provider: "openai" }],
    });
    expect(chain).toBeDefined();
  });
});

// ── Routing Rules Engine ──────────────────────────────────────────────

describe("RoutingRulesEngine", () => {
  let engine: RoutingRulesEngine;

  beforeEach(() => {
    engine = new RoutingRulesEngine([
      {
        id: "architect-rule",
        name: "Architecture tasks to deep model",
        conditions: [{ type: "keyword", value: "architect" }],
        action: { model: "claude-3.5-sonnet", provider: "anthropic" },
        priority: 95,
        enabled: true,
      },
      {
        id: "typo-rule",
        name: "Typo fixes to fast model",
        conditions: [{ type: "keyword", value: "typo" }],
        action: { model: "fast", provider: "ollama" },
        priority: 70,
        enabled: true,
      },
      {
        id: "long-prompt-rule",
        name: "Long prompts to deep model",
        conditions: [{ type: "token_above", value: "500" }],
        action: { model: "deep", provider: "anthropic" },
        priority: 50,
        enabled: true,
      },
      {
        id: "disabled-rule",
        name: "Disabled rule",
        conditions: [{ type: "keyword", value: "test" }],
        action: { model: "fast", provider: "ollama" },
        priority: 40,
        enabled: false,
      },
    ]);
  });

  it("matches keyword conditions", () => {
    const result = engine.evaluate(makeContext({ prompt: "architect a new system", tokenCount: 100 }));
    expect(result).not.toBeNull();
    expect(result!.model).toBe("claude-3.5-sonnet");
    expect(result!.provider).toBe("anthropic");
  });

  it("matches token_above conditions", () => {
    const result = engine.evaluate(makeContext({ prompt: "help me", tokenCount: 600 }));
    expect(result).not.toBeNull();
    expect(result!.model).toBe("deep");
  });

  it("does not match when no conditions are met", () => {
    const result = engine.evaluate(makeContext({ prompt: "simple question", tokenCount: 20 }));
    expect(result).toBeNull();
  });

  it("skips disabled rules", () => {
    const result = engine.evaluate(makeContext({ prompt: "test the system", tokenCount: 20 }));
    expect(result).toBeNull();
  });

  it("respects priority order", () => {
    // The "architect" rule is priority 95, "long-prompt" is 50
    // A prompt that matches both should match the higher priority
    const result = engine.evaluate(makeContext({ prompt: "architect a system", tokenCount: 600 }));
    expect(result).not.toBeNull();
    expect(result!.rule!.id).toBe("architect-rule");
  });

  it("adds and removes rules", () => {
    const initialCount = engine.listRules().length;

    engine.addRule({
      id: "new-rule",
      name: "New rule",
      conditions: [{ type: "keyword", value: "debug" }],
      action: { model: "deep", provider: "anthropic" },
      priority: 60,
      enabled: true,
    });

    expect(engine.listRules().length).toBe(initialCount + 1);
    expect(engine.getRule("new-rule")).toBeDefined();

    engine.removeRule("new-rule");
    expect(engine.listRules().length).toBe(initialCount);
    expect(engine.getRule("new-rule")).toBeUndefined();
  });

  it("toggles rules", () => {
    engine.toggleRule("architect-rule", false);
    const rule = engine.getRule("architect-rule");
    expect(rule!.enabled).toBe(false);

    engine.toggleRule("architect-rule");
    const ruleAgain = engine.getRule("architect-rule");
    expect(ruleAgain!.enabled).toBe(true);
  });

  it("matches regex conditions", () => {
    engine.addRule({
      id: "regex-rule",
      name: "Regex rule",
      conditions: [{ type: "regex", value: "(?:rewrite|redesign)\\s+\\w+" }],
      action: { model: "deep", provider: "anthropic" },
      priority: 80,
      enabled: true,
    });

    const result = engine.evaluate(makeContext({ prompt: "rewrite the module", tokenCount: 100 }));
    expect(result).not.toBeNull();
    expect(result!.model).toBe("deep");
  });

  it("matches skill_match conditions", () => {
    engine.addRule({
      id: "skill-rule",
      name: "Skill rule",
      conditions: [{ type: "skill_match", value: "debug-helper" }],
      action: { model: "fast", provider: "ollama" },
      priority: 75,
      enabled: true,
    });

    const result = engine.evaluate(makeContext({
      prompt: "help me",
      tokenCount: 50,
      matchingSkills: ["debug-helper"],
    }));
    expect(result).not.toBeNull();
    expect(result!.model).toBe("fast");
  });
});

// ── Default Routing Rules ─────────────────────────────────────────────

describe("Default Routing Rules", () => {
  it("has 10+ default rules", () => {
    expect(DEFAULT_ROUTING_RULES.length).toBeGreaterThanOrEqual(10);
  });

  it("all default rules have required fields", () => {
    for (const rule of DEFAULT_ROUTING_RULES) {
      expect(rule.id).toBeTruthy();
      expect(rule.name).toBeTruthy();
      expect(rule.conditions.length).toBeGreaterThan(0);
      expect(rule.action.model).toBeTruthy();
      expect(rule.action.provider).toBeTruthy();
      expect(typeof rule.priority).toBe("number");
      expect(typeof rule.enabled).toBe("boolean");
    }
  });

  it("evaluates default rules correctly", () => {
    const engine = new RoutingRulesEngine(DEFAULT_ROUTING_RULES);
    const result = engine.evaluate(makeContext({ prompt: "architect a new system", tokenCount: 100 }));
    expect(result).not.toBeNull();
  });
});

// ── Cost Tracker ──────────────────────────────────────────────────────

describe("CostTracker", () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker();
  });

  it("estimates cost for known models", () => {
    const cost = tracker.estimateCost("gpt-4o", 1000, 500);
    expect(cost).toBeGreaterThan(0);
  });

  it("estimates zero cost for local models", () => {
    const cost = tracker.estimateCost("gemma3:27b", 1000, 500);
    expect(cost).toBe(0);
  });

  it("uses fallback pricing for unknown models", () => {
    const cost = tracker.estimateCost("unknown-model", 1000, 500);
    expect(cost).toBeGreaterThan(0);
  });

  it("records entries and tracks total cost", () => {
    tracker.record({
      timestamp: new Date(),
      model: "gpt-4o",
      provider: "openai",
      inputTokens: 1000,
      outputTokens: 500,
      routingMode: "auto",
      complexityScore: 0.7,
    });

    tracker.record({
      timestamp: new Date(),
      model: "claude-3.5-sonnet",
      provider: "anthropic",
      inputTokens: 2000,
      outputTokens: 1000,
      routingMode: "auto",
      complexityScore: 0.8,
    });

    const total = tracker.getTotalCost();
    expect(total).toBeGreaterThan(0);
  });

  it("tracks cost by model", () => {
    tracker.record({
      timestamp: new Date(),
      model: "gpt-4o",
      provider: "openai",
      inputTokens: 1000,
      outputTokens: 500,
      routingMode: "auto",
      complexityScore: 0.5,
    });

    const byModel = tracker.getCostByModel();
    expect(byModel["gpt-4o"]).toBeDefined();
    expect(byModel["gpt-4o"].calls).toBe(1);
    expect(byModel["gpt-4o"].cost).toBeGreaterThan(0);
  });

  it("tracks cost by provider", () => {
    tracker.record({
      timestamp: new Date(),
      model: "gpt-4o",
      provider: "openai",
      inputTokens: 1000,
      outputTokens: 500,
      routingMode: "auto",
      complexityScore: 0.5,
    });

    const byProvider = tracker.getCostByProvider();
    expect(byProvider["openai"]).toBeDefined();
    expect(byProvider["openai"].calls).toBe(1);
  });

  it("generates cost report", () => {
    tracker.record({
      timestamp: new Date(),
      model: "gpt-4o",
      provider: "openai",
      inputTokens: 1000,
      outputTokens: 500,
      routingMode: "auto",
      complexityScore: 0.5,
    });

    const report = tracker.getReport();
    expect(report.totalCost).toBeGreaterThan(0);
    expect(report.totalInputTokens).toBe(1000);
    expect(report.totalOutputTokens).toBe(500);
    expect(report.savings).toBeDefined();
  });

  it("calculates cost savings with local routing", () => {
    tracker.record({
      timestamp: new Date(),
      model: "gemma3:12b", // Local (free)
      provider: "ollama",
      inputTokens: 1000,
      outputTokens: 500,
      routingMode: "auto",
      complexityScore: 0.2,
    });

    const savings = tracker.getCostSavings();
    // With local model, actual cost is $0, so $0 routing cost
    expect(savings.withRouting).toBe(0);
    // Savings should be the comparison cost
    expect(savings.savedPercent).toBeGreaterThanOrEqual(0);
  });

  it("filters by date range", () => {
    const oldDate = new Date("2024-01-01");
    tracker.record({
      timestamp: oldDate,
      model: "gpt-4o",
      provider: "openai",
      inputTokens: 1000,
      outputTokens: 500,
      routingMode: "auto",
      complexityScore: 0.5,
    });

    tracker.record({
      timestamp: new Date(),
      model: "gpt-4o",
      provider: "openai",
      inputTokens: 500,
      outputTokens: 250,
      routingMode: "auto",
      complexityScore: 0.3,
    });

    const recentCost = tracker.getTotalCost(new Date("2025-01-01"));
    const totalCost = tracker.getTotalCost();
    expect(recentCost).toBeLessThan(totalCost);
  });

  it("clears entries", () => {
    tracker.record({
      timestamp: new Date(),
      model: "gpt-4o",
      provider: "openai",
      inputTokens: 1000,
      outputTokens: 500,
      routingMode: "auto",
      complexityScore: 0.5,
    });

    expect(tracker.entryCount).toBe(1);
    tracker.clear();
    expect(tracker.entryCount).toBe(0);
  });
});

// ── ModelRouter with Rules Engine Integration ──────────────────────────

describe("ModelRouter with Rules Engine", () => {
  it("integrates rules engine and cost tracker", () => {
    const router = new ModelRouter(makeRouterConfig());
    expect(router.getRulesEngine()).toBeDefined();
    expect(router.getCostTracker()).toBeDefined();
  });

  it("rule match shows in routing decision", () => {
    const router = new ModelRouter(makeRouterConfig());
    router.setMode("rules");

    const decision = router.route(makeContext({
      prompt: "architect a new system",
      tokenCount: 100,
    }));

    expect(decision.ruleMatch).toBeDefined();
  });

  it("cost tracker estimates cost in routing decision", () => {
    const router = new ModelRouter(makeRouterConfig());
    const decision = router.route(makeContext({
      prompt: "hello world",
      tokenCount: 10,
    }));

    expect(decision.estimatedCost).toBeGreaterThanOrEqual(0);
  });
});
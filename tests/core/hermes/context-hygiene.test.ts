import { describe, it, expect } from "vitest";
import { ContextHygiene, type HygieneConfig } from "../../../packages/hermes-bridge/src/context-hygiene.js";
import type { AgentMessage } from "../../../packages/hermes-bridge/src/evaluator.js";

describe("ContextHygiene", () => {
  const defaultConfig: Partial<HygieneConfig> = {
    maxTurnsBeforeRefresh: 20,
    compactThreshold: 0.6,
    pruneOlderThanTurns: 10,
  };

  function makeMessages(turns: number): AgentMessage[] {
    const messages: AgentMessage[] = [];
    for (let i = 0; i < turns; i++) {
      messages.push({ role: "user", content: `User message turn ${i}` });
      messages.push({ role: "assistant", content: `Assistant response turn ${i}` });
    }
    return messages;
  }

  function makeMessagesWithToolResults(turns: number, oldResults: number): AgentMessage[] {
    const messages: AgentMessage[] = [];
    // Old turns with tool results
    for (let i = 0; i < oldResults; i++) {
      messages.push({ role: "user", content: `Old user message ${i}` });
      messages.push({
        role: "assistant",
        content: `Old result ${i}`,
        toolResults: [
          { content: `Tool result ${i} with lots of data`.repeat(20), isError: false },
        ],
      });
    }
    // Recent turns
    for (let i = 0; i < turns - oldResults; i++) {
      messages.push({ role: "user", content: `Recent user message ${i}` });
      messages.push({ role: "assistant", content: `Recent response ${i}` });
    }
    return messages;
  }

  describe("shouldCompact", () => {
    it("returns true when context exceeds threshold", () => {
      const hygiene = new ContextHygiene(defaultConfig);
      // Create messages that exceed 60% of a small context window
      const messages = makeMessages(50);
      const result = hygiene.shouldCompact({ messages, contextWindow: 100 });
      expect(result).toBe(true);
    });

    it("returns false when context is within threshold", () => {
      const hygiene = new ContextHygiene(defaultConfig);
      const messages: AgentMessage[] = [
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello" },
      ];
      const result = hygiene.shouldCompact({ messages, contextWindow: 128000 });
      expect(result).toBe(false);
    });
  });

  describe("shouldRefresh", () => {
    it("returns true when turn count exceeds threshold", () => {
      const hygiene = new ContextHygiene(defaultConfig);
      expect(hygiene.shouldRefresh({ turnCount: 25 })).toBe(true);
    });

    it("returns false when turn count is below threshold", () => {
      const hygiene = new ContextHygiene(defaultConfig);
      expect(hygiene.shouldRefresh({ turnCount: 10 })).toBe(false);
    });
  });

  describe("pruneHistory", () => {
    it("prunes old tool results", () => {
      const hygiene = new ContextHygiene({ ...defaultConfig, pruneOlderThanTurns: 3 });
      const messages = makeMessagesWithToolResults(15, 10);

      const pruned = hygiene.pruneHistory(messages, 3);
      // Should have pruned old tool results to summaries
      const prunedContent = pruned.map(m => m.content).join(" ");
      expect(prunedContent).toContain("Earlier tool results");
    });

    it("keeps recent messages intact", () => {
      const hygiene = new ContextHygiene(defaultConfig);
      const recentMessage = "This is a recent important message that should not be pruned";
      const messages: AgentMessage[] = [
        { role: "user", content: "Old message" },
        { role: "assistant", content: "Old response" },
        { role: "user", content: recentMessage },
      ];

      // With no pruning needed (all recent)
      const pruned = hygiene.pruneHistory(messages, 10);
      expect(pruned.some(m => m.content.includes(recentMessage))).toBe(true);
    });
  });

  describe("getContextUsage", () => {
    it("estimates context usage correctly", () => {
      const hygiene = new ContextHygiene(defaultConfig);
      // estimateTokens divides text by 4, so 4000 chars ≈ 1000 tokens
      // For 8000 context window, we need ~5000 tokens (6000+ chars) for 60%+
      const messages: AgentMessage[] = [
        { role: "user", content: "A".repeat(10000) },
        { role: "assistant", content: "B".repeat(10000) },
      ];

      const usage = hygiene.getContextUsage(messages, 10000);
      expect(usage).toBeGreaterThan(0.5);
    });

    it("returns low usage for small messages", () => {
      const hygiene = new ContextHygiene(defaultConfig);
      const messages: AgentMessage[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there" },
      ];

      const usage = hygiene.getContextUsage(messages, 128000);
      expect(usage).toBeLessThan(0.01);
    });
  });

  describe("getRecommendations", () => {
    it("recommends compaction when context is large", () => {
      const hygiene = new ContextHygiene(defaultConfig);
      // Very large messages
      const messages: AgentMessage[] = [];
      for (let i = 0; i < 100; i++) {
        messages.push({ role: "user", content: "X".repeat(1000) });
        messages.push({ role: "assistant", content: "Y".repeat(1000) });
      }

      const recommendations = hygiene.getRecommendations({
        messages,
        contextWindow: 50000,
        turnCount: 5,
      });

      expect(recommendations.some(r => r.action === "compact")).toBe(true);
    });

    it("recommends refresh when turn count is high", () => {
      const hygiene = new ContextHygiene(defaultConfig);
      const recommendations = hygiene.getRecommendations({
        messages: makeMessages(25),
        contextWindow: 128000,
        turnCount: 25,
      });

      expect(recommendations.some(r => r.action === "refresh")).toBe(true);
    });

    it("returns empty recommendations for healthy sessions", () => {
      const hygiene = new ContextHygiene(defaultConfig);
      const recommendations = hygiene.getRecommendations({
        messages: makeMessages(3),
        contextWindow: 128000,
        turnCount: 3,
      });

      // No urgent recommendations for a healthy session
      const urgentRecommendations = recommendations.filter(r => r.urgency === "high");
      expect(urgentRecommendations.length).toBe(0);
    });
  });
});
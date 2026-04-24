import { describe, it, expect } from "vitest";
import { Evaluator, type AgentMessage } from "../../../packages/hermes-bridge/src/evaluator.js";
import type { ToolResult } from "@tekton/tools";

describe("Evaluator", () => {
  const evaluator = new Evaluator();

  function makeMessages(overrides?: Partial<AgentMessage>[]): AgentMessage[] {
    return [
      { role: "user", content: "Help me debug a TypeScript error" },
      { role: "assistant", content: "I'll help you debug. Let me check the files.", toolCalls: [
        { name: "read_file", params: { path: "src/main.ts" } },
        { name: "terminal", params: { command: "npm run build" } },
      ]},
      { role: "tool", content: "Found the error in main.ts" },
      { role: "assistant", content: "The error is on line 42. Here's the fix.", toolCalls: [
        { name: "patch", params: { path: "src/main.ts", edits: [] } },
      ]},
      { role: "assistant", content: "I've fixed the error. Let me verify.", toolCalls: [
        { name: "terminal", params: { command: "npm run build" } },
      ]},
    ];
  }

  describe("evaluate", () => {
    it("evaluates a successful task", () => {
      const result = evaluator.evaluate({
        messages: makeMessages(),
        toolResults: [{ content: "Build successful", isError: false }],
        userCorrections: [],
        startTime: Date.now() - 10000,
        endTime: Date.now(),
        patternHistory: new Map(),
      });

      expect(result.success).toBe(true);
      expect(result.hadErrors).toBe(false);
      expect(result.hadUserCorrections).toBe(false);
      expect(result.toolCallCount).toBe(4); // read_file + terminal + patch + terminal
    });

    it("detects errors in tool results", () => {
      const result = evaluator.evaluate({
        messages: makeMessages(),
        toolResults: [{ content: "Build failed", isError: true }],
        userCorrections: [],
        startTime: Date.now() - 10000,
        endTime: Date.now(),
        patternHistory: new Map(),
      });

      expect(result.hadErrors).toBe(true);
    });

    it("detects user corrections", () => {
      const result = evaluator.evaluate({
        messages: makeMessages(),
        toolResults: [],
        userCorrections: ["use const instead of var"],
        startTime: Date.now() - 10000,
        endTime: Date.now(),
        patternHistory: new Map(),
      });

      expect(result.hadUserCorrections).toBe(true);
    });

    it("recommends skill extraction for complex successful tasks", () => {
      // Create messages with 5+ tool calls
      const messages: AgentMessage[] = [
        { role: "user", content: "Complex task requiring many steps" },
        { role: "assistant", content: "Step 1", toolCalls: [
          { name: "read_file", params: { path: "a.ts" } },
          { name: "read_file", params: { path: "b.ts" } },
          { name: "terminal", params: { command: "npm test" } },
          { name: "patch", params: { path: "a.ts", edits: [] } },
          { name: "terminal", params: { command: "npm run build" } },
        ]},
      ];

      const result = evaluator.evaluate({
        messages,
        toolResults: [{ content: "OK", isError: false }],
        userCorrections: [],
        startTime: Date.now() - 30000,
        endTime: Date.now(),
        patternHistory: new Map(),
      });

      expect(result.shouldExtractSkill).toBe(true);
      expect(result.extractionReason).toContain("tool calls");
    });

    it("recommends skill extraction for error recovery", () => {
      const messages: AgentMessage[] = [
        { role: "user", content: "Fix a build error" },
        { role: "assistant", content: "Trying approach 1", toolCalls: [
          { name: "terminal", params: { command: "npm run build" } },
        ]},
      ];

      const result = evaluator.evaluate({
        messages,
        toolResults: [{ content: "Build failed initially, then succeeded", isError: true }],
        userCorrections: [],
        startTime: Date.now() - 5000,
        endTime: Date.now(),
        patternHistory: new Map(),
      });

      expect(result.shouldExtractSkill).toBe(true);
    });

    it("recommends skill extraction for user corrections", () => {
      const result = evaluator.evaluate({
        messages: makeMessages(),
        toolResults: [],
        userCorrections: ["Actually, use this approach instead"],
        startTime: Date.now() - 5000,
        endTime: Date.now(),
        patternHistory: new Map(),
      });

      expect(result.shouldExtractSkill).toBe(true);
      expect(result.extractionReason).toContain("correction");
    });

    it("recommends skill extraction for recurring patterns", () => {
      const patternHistory = new Map<string, number>();
      patternHistory.set("debug typescript error in project", 5);

      const result = evaluator.evaluate({
        messages: [{ role: "user", content: "debug typescript error in project" }],
        toolResults: [],
        userCorrections: [],
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        patternHistory,
      });

      expect(result.shouldExtractSkill).toBe(true);
      expect(result.extractionReason).toContain("5 times");
    });

    it("does not recommend extraction for simple tasks", () => {
      const messages: AgentMessage[] = [
        { role: "user", content: "What time is it?" },
        { role: "assistant", content: "It's 3pm." },
      ];

      const result = evaluator.evaluate({
        messages,
        toolResults: [],
        userCorrections: [],
        startTime: Date.now() - 500,
        endTime: Date.now(),
        patternHistory: new Map(),
      });

      expect(result.shouldExtractSkill).toBe(false);
    });

    it("calculates quality correctly", () => {
      const result = evaluator.evaluate({
        messages: makeMessages(),
        toolResults: [{ content: "Success", isError: false }],
        userCorrections: [],
        startTime: Date.now() - 500,
        endTime: Date.now(),
        patternHistory: new Map(),
      });

      expect(["excellent", "good", "partial", "failed"]).toContain(result.quality);
    });
  });
});
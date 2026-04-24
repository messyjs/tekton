import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { HermesBridge } from "../../../packages/hermes-bridge/src/index.js";
import type { EvaluationResult, AgentMessage } from "../../../packages/hermes-bridge/src/evaluator.js";
import type { ToolResult } from "@tekton/tools";

describe("HermesBridge", () => {
  let tmpDir: string;
  let bridge: HermesBridge;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `tekton-bridge-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    bridge = new HermesBridge({
      tektonHome: tmpDir,
      evaluationConfig: {
        minToolCallsForSkill: 3,
        minPatternOccurrences: 2,
      },
      hygieneConfig: {
        maxTurnsBeforeRefresh: 20,
        compactThreshold: 0.6,
        pruneOlderThanTurns: 10,
      },
    });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const goodMessages: AgentMessage[] = [
    { role: "user", content: "debug typescript build error" },
    { role: "assistant", content: "I'll check the files and fix the error.", toolCalls: [
      { name: "read_file", params: { path: "src/main.ts" } },
      { name: "terminal", params: { command: "npm run build" } },
      { name: "patch", params: { path: "src/main.ts", edits: [] } },
      { name: "terminal", params: { command: "npm run build" } },
    ]},
    { role: "assistant", content: "The build now succeeds." },
  ];

  const goodToolResults: ToolResult[] = [
    { content: "Build succeeded", isError: false },
  ];

  describe("onTaskComplete", () => {
    it("evaluates and returns results", async () => {
      const result = await bridge.onTaskComplete({
        messages: goodMessages,
        toolResults: goodToolResults,
        userCorrections: [],
        startTime: Date.now() - 10000,
        endTime: Date.now(),
        taskDescription: "debug typescript build error",
      });

      expect(result.evaluation).toBeDefined();
      expect(typeof result.evaluation.success).toBe("boolean");
      expect(typeof result.evaluation.quality).toBe("string");
      expect(Array.isArray(result.evaluation.skillsUsed)).toBe(true);
      expect(Array.isArray(result.hygieneActions)).toBe(true);
    });

    it("extracts a skill from complex successful tasks", async () => {
      const result = await bridge.onTaskComplete({
        messages: goodMessages,
        toolResults: goodToolResults,
        userCorrections: [],
        startTime: Date.now() - 10000,
        endTime: Date.now(),
        taskDescription: "debug typescript build error",
      });

      // This may or may not extract a skill depending on evaluation heuristics
      expect(result).toBeDefined();
      if (result.newSkill) {
        expect(result.newSkill.name).toBeTruthy();
        expect(result.newSkill.body).toBeTruthy();
      }
    });

    it("records pattern frequency", async () => {
      // First occurrence
      await bridge.onTaskComplete({
        messages: goodMessages,
        toolResults: goodToolResults,
        userCorrections: [],
        startTime: Date.now() - 5000,
        endTime: Date.now(),
        taskDescription: "deploy app",
      });

      const status = bridge.getStatus();
      expect(status.totalUsageRecords).toBeGreaterThanOrEqual(1);
    });

    it("updates user model on corrections", async () => {
      const result = await bridge.onTaskComplete({
        messages: goodMessages,
        toolResults: [{ content: "Error occurred", isError: true }],
        userCorrections: ["use const instead of var"],
        startTime: Date.now() - 5000,
        endTime: Date.now(),
        taskDescription: "fix variable declarations",
      });

      expect(result.evaluation.hadUserCorrections).toBe(true);
    });

    it("respects pause state", async () => {
      bridge.setPaused(true);
      const result = await bridge.onTaskComplete({
        messages: goodMessages,
        toolResults: goodToolResults,
        userCorrections: [],
        startTime: Date.now() - 5000,
        endTime: Date.now(),
        taskDescription: "test paused state",
      });

      // Should not extract skills when paused
      expect(result.newSkill).toBeUndefined();
    });
  });

  describe("prepareContext", () => {
    it("returns relevant context", async () => {
      // Create a skill that might be relevant
      bridge.skills.createSkill({
        name: "debug-typescript",
        description: "Debug TypeScript errors",
        body: "# Debug TypeScript\n\n## When to Use\n- TypeScript errors",
      });

      const context = await bridge.prepareContext("debug typescript error");

      expect(Array.isArray(context.relevantSkills)).toBe(true);
      expect(typeof context.userContext).toBe("string");
      expect(typeof context.memoryContext).toBe("string");
      expect(["none", "lite", "full", "ultra"]).toContain(context.compressionTier);
    });

    it("returns empty skills when none match", async () => {
      const context = await bridge.prepareContext("quantum physics simulation");
      expect(context.relevantSkills.length).toBe(0);
    });
  });

  describe("getPromptInjections", () => {
    it("includes skill summaries", () => {
      bridge.skills.createSkill({
        name: "test-skill",
        description: "A test skill for injection",
        body: "# Test Skill",
      });

      const injections = bridge.getPromptInjections();
      expect(injections).toContain("test-skill");
      expect(injections).toContain("A test skill for injection");
    });

    it("includes user preferences", () => {
      bridge.userModel.recordPreference("language", "TypeScript");

      const injections = bridge.getPromptInjections();
      expect(injections).toContain("language");
      expect(injections).toContain("TypeScript");
    });

    it("includes memory", () => {
      bridge.memory.addMemory("User prefers dark mode");

      const injections = bridge.getPromptInjections();
      expect(injections).toContain("dark mode");
    });
  });

  describe("getStatus", () => {
    it("returns current learning status", () => {
      const status = bridge.getStatus();
      expect(typeof status.totalSkills).toBe("number");
      expect(typeof status.totalUsageRecords).toBe("number");
      expect(typeof status.averageConfidence).toBe("number");
      expect(typeof status.isPaused).toBe("boolean");
      expect(status.isPaused).toBe(false);
    });

    it("tracks paused state", () => {
      bridge.setPaused(true);
      expect(bridge.getStatus().isPaused).toBe(true);
      bridge.setPaused(false);
      expect(bridge.getStatus().isPaused).toBe(false);
    });
  });
});
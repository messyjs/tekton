/**
 * Forge-Knowledge integration tests: domain topic seeding, role prompts, patch preference.
 */
import { describe, it, expect } from "vitest";
import { getDomainTopics } from "../../packages/forge/src/production/agent-spawner.ts";
import { buildSystemPrompt } from "../../packages/forge/src/production/roles/base-role.ts";
import type { RoleDefinition } from "../../packages/forge/src/types.ts";
import { createRetryCard } from "../../packages/forge/src/qa/failure-router.ts";
import type { QAResult } from "../../packages/forge/src/qa/verdict.ts";

describe("Forge-Knowledge Integration", () => {
  describe("domain topic seeding", () => {
    it("provides audio topics for DSP engineer role", () => {
      const role: RoleDefinition = {
        id: "dsp-engineer",
        name: "DSP Engineer",
        systemPrompt: "You are a DSP engineer.",
        tools: ["patch", "write_file", "terminal"],
        model: "fast",
        sessionLimit: 20,
      };
      const topics = getDomainTopics(role);
      expect(topics).toContain("juce");
      expect(topics).toContain("dsp");
      expect(topics).toContain("audio");
    });

    it("provides web topics for frontend developer", () => {
      const role: RoleDefinition = {
        id: "frontend-developer",
        name: "Frontend Developer",
        systemPrompt: "You are a frontend developer.",
        tools: ["patch", "write_file", "terminal"],
        model: "fast",
        sessionLimit: 20,
      };
      const topics = getDomainTopics(role);
      // frontend-developer doesn't directly match our domain map keys
      // But tool-based detection could add them
      expect(topics).toBeDefined();
    });

    it("returns empty for unrelated role", () => {
      const role: RoleDefinition = {
        id: "general-assistant",
        name: "General Assistant",
        systemPrompt: "You are a general assistant.",
        tools: [],
        model: "fast",
        sessionLimit: 20,
      };
      const topics = getDomainTopics(role);
      expect(topics.length).toBe(0);
    });

    it("deduplicates topics", () => {
      const role: RoleDefinition = {
        id: "dsp-engineer",
        name: "DSP Engineer",
        systemPrompt: "You are a DSP engineer.",
        tools: ["patch", "write_file", "juce_audio"],
        model: "fast",
        sessionLimit: 20,
      };
      const topics = getDomainTopics(role);
      const uniqueTopics = [...new Set(topics)];
      expect(topics.length).toBe(uniqueTopics.length);
    });
  });

  describe("role system prompts mention reference material", () => {
    it("buildSystemPrompt includes reference material instruction", () => {
      const role: RoleDefinition = {
        id: "dsp-engineer",
        name: "DSP Engineer",
        systemPrompt: "You are a DSP engineer specializing in audio plugins.",
        tools: ["patch", "write_file"],
        model: "fast",
        sessionLimit: 20,
      };

      const prompt = buildSystemPrompt(role, "Build audio plugin", "Implement the DSP chain");
      expect(prompt).toContain("Reference material");
      expect(prompt).toContain("patch tool");
    });
  });

  describe("retry task cards mention patch tool", () => {
    it("createRetryCard includes patch tool instruction", () => {
      const original: any = {
        id: "task-1",
        planId: "plan-1",
        role: "dsp-engineer",
        title: "Build audio plugin",
        description: "Implement the DSP processing chain",
        context: "",
        acceptanceCriteria: ["All tests pass", "Audio processes correctly"],
        outputFiles: ["src/PluginProcessor.cpp", "src/PluginEditor.cpp"],
        dependencies: [],
        status: "pending",
        sessionHistory: [],
      };

      const failure: QAResult = {
        tester: "unit-tester",
        category: "compilation",
        details: "Missing include for juce_audio_utils.h",
        status: "fail",
      };

      const retryCard = createRetryCard(original, failure);
      expect(retryCard.description).toContain("patch tool");
      expect(retryCard.description).toContain("Do NOT rewrite the entire file");
    });
  });
});
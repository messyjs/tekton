import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { Learner } from "../../../packages/hermes-bridge/src/learner.js";
import { SkillManager } from "../../../packages/hermes-bridge/src/skill-manager.js";
import { UserModelManager } from "../../../packages/hermes-bridge/src/user-model.js";
import type { EvaluationResult, AgentMessage } from "../../../packages/hermes-bridge/src/evaluator.js";

describe("Learner", () => {
  let tmpDir: string;
  let skillManager: SkillManager;
  let userModel: UserModelManager;
  let learner: Learner;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `tekton-learner-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    skillManager = new SkillManager({ primaryDir: path.join(tmpDir, "skills"), externalDirs: [] });
    userModel = new UserModelManager(path.join(tmpDir, "USER.md"));
    learner = new Learner(skillManager, userModel);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const goodEvaluation: EvaluationResult = {
    success: true,
    quality: "good",
    toolCallCount: 5,
    hadErrors: false,
    hadUserCorrections: false,
    routingCorrect: true,
    compressionLossless: true,
    tokensUsed: 1000,
    skillsUsed: ["terminal", "read_file"],
    shouldExtractSkill: true,
    durationMs: 10000,
  };

  const excellentEvaluation: EvaluationResult = {
    success: true,
    quality: "excellent",
    toolCallCount: 8,
    hadErrors: false,
    hadUserCorrections: false,
    routingCorrect: true,
    compressionLossless: true,
    tokensUsed: 2000,
    skillsUsed: ["terminal", "read_file", "patch"],
    shouldExtractSkill: true,
    durationMs: 15000,
  };

  const failedEvaluation: EvaluationResult = {
    success: false,
    quality: "failed",
    toolCallCount: 2,
    hadErrors: true,
    hadUserCorrections: false,
    routingCorrect: true,
    compressionLossless: false,
    tokensUsed: 500,
    skillsUsed: [],
    shouldExtractSkill: false,
    durationMs: 5000,
  };

  function makeConversation(taskDescription: string): AgentMessage[] {
    return [
      { role: "user", content: taskDescription },
      { role: "assistant", content: "I'll help you with that. Let me check the files.", toolCalls: [
        { name: "read_file", params: { path: "src/index.ts" } },
      ]},
      { role: "tool", content: "File content here" },
      { role: "assistant", content: "I see the issue. Let me fix it.", toolCalls: [
        { name: "patch", params: { path: "src/index.ts", edits: [{ oldText: "var", newText: "const" }] } },
      ]},
      { role: "assistant", content: "Now let me verify the fix.", toolCalls: [
        { name: "terminal", params: { command: "npm run build" } },
      ]},
    ];
  }

  describe("extractSkill", () => {
    it("extracts a skill from a successful conversation", () => {
      const skill = learner.extractSkill({
        messages: makeConversation("debug typescript build error"),
        evaluation: goodEvaluation,
        taskDescription: "debug typescript build error",
      });

      expect(skill).toBeDefined();
      expect(skill!.name).toMatch(/debug/);
      expect(skill!.body).toContain("Procedure");
      expect(skill!.metadata?.tekton?.confidence).toBe(0.5);
    });

    it("does not extract from failed tasks", () => {
      const skill = learner.extractSkill({
        messages: makeConversation("impossible task"),
        evaluation: failedEvaluation,
        taskDescription: "impossible task",
      });

      expect(skill).toBeNull();
    });

    it("extracts tags from conversation", () => {
      const skill = learner.extractSkill({
        messages: makeConversation("fix typescript error in react component"),
        evaluation: goodEvaluation,
        taskDescription: "fix typescript error in react component",
      });

      expect(skill).toBeDefined();
      // Should detect typescript and react tags
      const tags = skill!.metadata?.tekton?.tags ?? [];
      expect(tags.length).toBeGreaterThan(0);
    });

    it("does not extract when high-confidence skill exists", () => {
      // Create a skill with high confidence
      const existing = skillManager.createSkill({
        name: "debug-typescript-build-error",
        description: "Debug TypeScript build errors",
        body: "# Debug TypeScript\n\n## Procedure\n1. Check files",
        metadata: { tekton: { confidence: 0.9 } },
      });

      const skill = learner.extractSkill({
        messages: makeConversation("debug typescript build error"),
        evaluation: goodEvaluation,
        taskDescription: "debug typescript build error",
      });

      // Should return null because high-confidence skill exists
      expect(skill).toBeNull();
    });

    it("generates valid skill name from description", () => {
      const skill = learner.extractSkill({
        messages: makeConversation("deploy application to AWS"),
        evaluation: excellentEvaluation,
        taskDescription: "deploy application to AWS",
      });

      expect(skill).toBeDefined();
      expect(skill!.name).toMatch(/^[a-z0-9-]+$/);
    });
  });

  describe("refineSkill", () => {
    it("refines a skill with better approach", () => {
      const existing = skillManager.createSkill({
        name: "existing-skill",
        description: "An existing skill",
        body: "# Old approach\n1. Old step",
        metadata: { tekton: { confidence: 0.3 } },
      });

      const update = learner.refineSkill(existing, {
        messages: makeConversation("improved approach"),
        evaluation: excellentEvaluation,
      });

      // Should return an update since confidence is low and quality is excellent
      expect(update).toBeDefined();
      expect(update!.version).toBe("0.1.1"); // Patch version increment
      expect(update!.metadata?.tekton?.confidence).toBeGreaterThan(0.3);
    });

    it("returns null when existing skill is already high quality", () => {
      const existing = skillManager.createSkill({
        name: "high-quality",
        description: "Already great",
        body: "# Best approach",
        metadata: { tekton: { confidence: 0.95 } },
      });

      const update = learner.refineSkill(existing, {
        messages: makeConversation("some approach"),
        evaluation: goodEvaluation,
      });

      // Should not refine if confidence already high and not user-corrected
      expect(update).toBeNull();
    });
  });

  describe("isBetterApproach", () => {
    it("returns true for excellent eval with low confidence existing", () => {
      const skill = skillManager.createSkill({
        name: "test",
        description: "test",
        body: "# Test",
        metadata: { tekton: { confidence: 0.3 } },
      });

      expect(learner.isBetterApproach(skill, excellentEvaluation)).toBe(true);
    });

    it("returns true for user corrections", () => {
      const skill = skillManager.createSkill({
        name: "test",
        description: "test",
        body: "# Test",
        metadata: { tekton: { confidence: 0.8 } },
      });

      const evalWithCorrections: EvaluationResult = {
        ...goodEvaluation,
        hadUserCorrections: true,
      };

      expect(learner.isBetterApproach(skill, evalWithCorrections)).toBe(true);
    });

    it("returns false for good eval with high confidence existing", () => {
      const skill = skillManager.createSkill({
        name: "test",
        description: "test",
        body: "# Test",
        metadata: { tekton: { confidence: 0.9 } },
      });

      expect(learner.isBetterApproach(skill, goodEvaluation)).toBe(false);
    });
  });

  describe("forceExtract", () => {
    it("force extracts a skill even if it wouldn't normally qualify", () => {
      const skill = learner.forceExtract(
        makeConversation("quick simple task"),
        "quick simple task",
      );

      expect(skill).toBeDefined();
      expect(skill.name).toMatch(/quick-simple/);
      expect(skill.metadata?.tekton?.confidence).toBe(0.6);
    });

    it("overwrites existing skill on force extract", () => {
      skillManager.createSkill({
        name: "force-me",
        description: "Original",
        body: "# Original",
      });

      const skill = learner.forceExtract(
        makeConversation("force me"),
        "force me",
      );

      expect(skill).toBeDefined();
      expect(skill.name).toBe("force-me");
    });
  });
});
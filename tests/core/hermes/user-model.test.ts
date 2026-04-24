import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { UserModelManager, type TaskSummary } from "../../../packages/hermes-bridge/src/user-model.js";

describe("UserModelManager", () => {
  let tmpDir: string;
  let userModel: UserModelManager;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `tekton-user-model-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    userModel = new UserModelManager(path.join(tmpDir, "USER.md"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("initial state", () => {
    it("returns default model", () => {
      const model = userModel.getModel();
      expect(model.preferences).toEqual({});
      expect(model.corrections).toEqual([]);
      expect(model.commonPatterns).toEqual([]);
      expect(model.techStack).toEqual([]);
    });
  });

  describe("recordPreference", () => {
    it("stores preferences", () => {
      userModel.recordPreference("language", "TypeScript");
      userModel.recordPreference("editor", "vim");

      const prefs = userModel.getPreferences();
      expect(prefs.language).toBe("TypeScript");
      expect(prefs.editor).toBe("vim");
    });

    it("overwrites existing preferences", () => {
      userModel.recordPreference("language", "JavaScript");
      userModel.recordPreference("language", "TypeScript");

      expect(userModel.getPreferences().language).toBe("TypeScript");
    });
  });

  describe("recordCorrection", () => {
    it("stores corrections", () => {
      userModel.recordCorrection("used var", "use const/let");
      const corrections = userModel.getRecentCorrections();
      expect(corrections.length).toBe(1);
      expect(corrections[0].original).toBe("used var");
      expect(corrections[0].corrected).toBe("use const/let");
    });

    it("limits corrections to 100", () => {
      for (let i = 0; i < 120; i++) {
        userModel.recordCorrection(`orig${i}`, `corr${i}`);
      }
      const corrections = userModel.getRecentCorrections();
      expect(corrections.length).toBeLessThanOrEqual(100);
    });
  });

  describe("recordTaskCompletion", () => {
    it("records successful tasks and builds patterns", () => {
      const task: TaskSummary = {
        description: "debug TypeScript error in project",
        timestamp: new Date().toISOString(),
        success: true,
        toolCallCount: 5,
        hadErrors: false,
        skillsUsed: ["terminal", "read_file"],
      };

      userModel.recordTaskCompletion(task);

      const model = userModel.getModel();
      expect(model.techStack).toContain("terminal");
      expect(model.techStack).toContain("read_file");
      expect(model.commonPatterns.length).toBe(1);
    });

    it("tracks frequent patterns", () => {
      const task: TaskSummary = {
        description: "run tests for project",
        timestamp: new Date().toISOString(),
        success: true,
        toolCallCount: 2,
        hadErrors: false,
        skillsUsed: [],
      };

      // Record same pattern 3 times
      userModel.recordTaskCompletion(task);
      userModel.recordTaskCompletion(task);
      userModel.recordTaskCompletion(task);

      const patterns = userModel.getCommonPatterns();
      expect(patterns.length).toBe(1);
      expect(patterns[0].frequency).toBe(3);
    });

    it("records avoided approaches on failure", () => {
      const task: TaskSummary = {
        description: "try to fix complex bug with simple patch",
        timestamp: new Date().toISOString(),
        success: false,
        toolCallCount: 3,
        hadErrors: true,
        skillsUsed: [],
      };

      userModel.recordTaskCompletion(task);
      const model = userModel.getModel();
      expect(model.avoidedApproaches.length).toBeGreaterThan(0);
    });
  });

  describe("recordFeedback", () => {
    it("records negative feedback as avoided approach", () => {
      userModel.recordFeedback("negative", "overly verbose responses");
      const model = userModel.getModel();
      expect(model.avoidedApproaches).toContain("overly verbose responses");
    });
  });

  describe("getRecentCorrections", () => {
    it("returns most recent corrections", () => {
      for (let i = 0; i < 15; i++) {
        userModel.recordCorrection(`orig${i}`, `corr${i}`);
      }
      const recent = userModel.getRecentCorrections(5);
      expect(recent.length).toBe(5);
    });
  });

  describe("toPromptContext", () => {
    it("generates prompt context with preferences", () => {
      userModel.recordPreference("language", "TypeScript");
      userModel.recordPreference("framework", "React");

      const context = userModel.toPromptContext();
      expect(context).toContain("User Preferences");
      expect(context).toContain("language: TypeScript");
      expect(context).toContain("framework: React");
    });

    it("includes corrections", () => {
      userModel.recordCorrection("use var", "use const");

      const context = userModel.toPromptContext();
      expect(context).toContain("Corrections");
      expect(context).toContain("use const");
    });

    it("includes tech stack", () => {
      const task: TaskSummary = {
        description: "setup project",
        timestamp: new Date().toISOString(),
        success: true,
        toolCallCount: 1,
        hadErrors: false,
        skillsUsed: ["typescript", "react"],
      };
      userModel.recordTaskCompletion(task);

      const context = userModel.toPromptContext();
      expect(context).toContain("Tech Stack");
    });

    it("returns empty string for empty model", () => {
      const context = userModel.toPromptContext();
      // Default model has no preferences, corrections, etc.
      expect(context.trim()).toBe("");
    });
  });

  describe("flush and persistence", () => {
    it("persists data to disk", () => {
      userModel.recordPreference("test", "value");
      userModel.flush();

      // Load a new instance from same path
      const userModel2 = new UserModelManager(path.join(tmpDir, "USER.md"));
      const prefs = userModel2.getPreferences();
      expect(prefs.test).toBe("value");
    });
  });
});
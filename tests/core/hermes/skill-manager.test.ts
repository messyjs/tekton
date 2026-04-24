import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { SkillManager } from "../../../packages/hermes-bridge/src/skill-manager.js";

describe("SkillManager", () => {
  let tmpDir: string;
  let skillManager: SkillManager;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `tekton-skill-mgr-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    skillManager = new SkillManager({ primaryDir: tmpDir, externalDirs: [] });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("createSkill", () => {
    it("creates a skill with SKILL.md", () => {
      const skill = skillManager.createSkill({
        name: "my-skill",
        description: "A test skill for testing",
        body: "# My Skill\n\n## Procedure\n1. Do thing\n2. Do other thing",
      });

      expect(skill.name).toBe("my-skill");
      expect(skill.description).toBe("A test skill for testing");
      expect(skill.body).toContain("Do thing");
      expect(skill.source).toBe("local");
      expect(skill.enabled).toBe(true);

      // Check SKILL.md was written
      const skillFile = path.join(tmpDir, "my-skill", "SKILL.md");
      expect(fs.existsSync(skillFile)).toBe(true);
      const content = fs.readFileSync(skillFile, "utf-8");
      expect(content).toContain("name: my-skill");
    });

    it("rejects invalid skill names", () => {
      expect(() => skillManager.createSkill({
        name: "Bad Skill Name!",
        description: "Invalid name",
        body: "body",
      })).toThrow("Invalid skill");
    });

    it("rejects duplicate skill names", () => {
      skillManager.createSkill({ name: "unique", description: "First", body: "body" });
      expect(() => skillManager.createSkill({ name: "unique", description: "Second", body: "body" }))
        .toThrow("already exists");
    });
  });

  describe("getSkill and listSkills", () => {
    it("lists created skills", () => {
      skillManager.createSkill({ name: "alpha", description: "Alpha skill", body: "# Alpha" });
      skillManager.createSkill({ name: "beta", description: "Beta skill", body: "# Beta" });

      const skills = skillManager.listSkills();
      expect(skills.length).toBe(2);
      expect(skills.map(s => s.name).sort()).toEqual(["alpha", "beta"]);
    });

    it("gets a skill by name", () => {
      skillManager.createSkill({ name: "my-skill", description: "Test", body: "# Test" });

      const skill = skillManager.getSkill("my-skill");
      expect(skill).toBeDefined();
      expect(skill?.name).toBe("my-skill");
    });

    it("returns undefined for non-existent skill", () => {
      expect(skillManager.getSkill("nonexistent")).toBeUndefined();
    });
  });

  describe("searchSkills", () => {
    beforeEach(() => {
      skillManager.createSkill({ name: "debug-typescript", description: "Debug TypeScript errors", body: "# Debug TS" });
      skillManager.createSkill({ name: "deploy-app", description: "Deploy application to server", body: "# Deploy" });
      skillManager.createSkill({ name: "test-api", description: "Test API endpoints", body: "# Test API" });
    });

    it("searches by name", () => {
      const results = skillManager.searchSkills("debug");
      expect(results.length).toBe(1);
      expect(results[0].name).toBe("debug-typescript");
    });

    it("searches by description", () => {
      const results = skillManager.searchSkills("application");
      expect(results.length).toBe(1);
      expect(results[0].name).toBe("deploy-app");
    });

    it("returns empty for no matches", () => {
      const results = skillManager.searchSkills("quantum");
      expect(results.length).toBe(0);
    });
  });

  describe("updateSkill", () => {
    it("updates skill description", () => {
      skillManager.createSkill({ name: "my-skill", description: "Original", body: "# Original" });
      const updated = skillManager.updateSkill("my-skill", { description: "Updated" });
      expect(updated.description).toBe("Updated");
    });

    it("updates skill body", () => {
      skillManager.createSkill({ name: "my-skill", description: "Test", body: "# Original" });
      const updated = skillManager.updateSkill("my-skill", { body: "# Updated body" });
      expect(updated.body).toContain("Updated body");
    });
  });

  describe("patchSkill", () => {
    it("patches skill body content", () => {
      skillManager.createSkill({
        name: "patch-me",
        description: "Skill to patch",
        body: "# Step 1\nDo the old thing\n# Step 2\nDo other thing",
      });

      const patched = skillManager.patchSkill("patch-me", "Do the old thing", "Do the new thing");
      expect(patched.body).toContain("Do the new thing");
      expect(patched.body).not.toContain("Do the old thing");
    });
  });

  describe("deleteSkill", () => {
    it("deletes a skill and its directory", () => {
      skillManager.createSkill({ name: "to-delete", description: "Temporary", body: "# Temp" });
      expect(skillManager.getSkill("to-delete")).toBeDefined();

      skillManager.deleteSkill("to-delete");
      expect(skillManager.getSkill("to-delete")).toBeUndefined();
    });

    it("throws for non-existent skill", () => {
      expect(() => skillManager.deleteSkill("nonexistent")).toThrow("not found");
    });
  });

  describe("toggleSkill", () => {
    it("disables a skill", () => {
      skillManager.createSkill({ name: "toggle", description: "Test", body: "# Test" });
      skillManager.toggleSkill("toggle", false);
      const skill = skillManager.getSkill("toggle");
      expect(skill?.enabled).toBe(false);
    });

    it("disabled skills don't appear in list", () => {
      skillManager.createSkill({ name: "visible", description: "Visible", body: "# Visible" });
      skillManager.createSkill({ name: "hidden", description: "Hidden", body: "# Hidden" });
      skillManager.toggleSkill("hidden", false);
      const skills = skillManager.listSkills();
      expect(skills.length).toBe(1);
      expect(skills[0].name).toBe("visible");
    });
  });

  describe("confidence tracking", () => {
    it("starts at 0.5 for new skills", () => {
      skillManager.createSkill({ name: "confidence-test", description: "Test", body: "# Test" });
      expect(skillManager.getConfidence("confidence-test")).toBe(0.5);
    });

    it("updates confidence based on success/failure", () => {
      skillManager.createSkill({ name: "conf", description: "Test", body: "# Test" });

      skillManager.recordUsage("conf", true);
      skillManager.recordUsage("conf", true);
      skillManager.recordUsage("conf", true);

      // 3 successes, 0 failures = 1.0
      const confAfterSuccess = skillManager.getConfidence("conf");
      expect(confAfterSuccess).toBe(1.0);

      skillManager.recordUsage("conf", false);
      // 3 successes, 1 failure = 0.75
      expect(skillManager.getConfidence("conf")).toBeCloseTo(0.75);
    });
  });

  describe("writeSkillFile and removeSkillFile", () => {
    it("writes a reference file", () => {
      skillManager.createSkill({ name: "files-test", description: "Test", body: "# Test" });
      skillManager.writeSkillFile("files-test", "references/api-spec.md", "# API Spec");

      const content = skillManager.getSkillReference("files-test", "api-spec.md");
      expect(content).toContain("API Spec");
    });

    it("removes a file from skill directory", () => {
      skillManager.createSkill({ name: "remove-file", description: "Test", body: "# Test" });
      // writeSkillFile auto-adds references/ prefix, so file ends up at references/temp.md
      skillManager.writeSkillFile("remove-file", "temp.md", "temp content");

      // removeSkillFile needs the correct path within skill directory
      skillManager.removeSkillFile("remove-file", "references/temp.md");
      expect(skillManager.getSkillReference("remove-file", "temp.md")).toBeUndefined();
    });
  });

  describe("importSkill and exportSkill", () => {
    it("imports a skill from a directory", () => {
      const externalDir = path.join(os.tmpdir(), `tekton-import-${Date.now()}`);
      const skillDir = path.join(externalDir, "imported-skill");
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, "SKILL.md"),
        "---\nname: imported-skill\ndescription: Imported skill\n---\n\n# Imported",
      );

      const skill = skillManager.importSkill(skillDir);
      expect(skill.name).toBe("imported-skill");
      expect(skill.body).toContain("Imported");

      // Should be accessible from skill manager
      const fromManager = skillManager.getSkill("imported-skill");
      expect(fromManager).toBeDefined();

      fs.rmSync(externalDir, { recursive: true, force: true });
    });

    it("exports a skill to a directory", () => {
      skillManager.createSkill({ name: "export-test", description: "Export me", body: "# Export" });
      const exportPath = skillManager.exportSkill("export-test");

      expect(fs.existsSync(exportPath)).toBe(true);
      expect(fs.existsSync(path.join(exportPath, "SKILL.md"))).toBe(true);
    });
  });

  describe("external directories", () => {
    it("scans external skill directories", () => {
      const extDir = path.join(os.tmpdir(), `tekton-ext-${Date.now()}`);
      const skillDir = path.join(extDir, "external-skill");
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, "SKILL.md"),
        "---\nname: external-skill\ndescription: From external dir\n---\n\n# External",
      );

      const manager = new SkillManager({ primaryDir: tmpDir, externalDirs: [extDir] });
      manager.rescanExternalDirs();

      const skills = manager.listSkills();
      expect(skills.some(s => s.name === "external-skill")).toBe(true);

      const extSkill = manager.getSkill("external-skill");
      expect(extSkill?.source).toBe("external");

      fs.rmSync(extDir, { recursive: true, force: true });
    });
  });

  describe("isHermesCompatible", () => {
    it("recognizes Hermes-compatible skills", () => {
      skillManager.createSkill({
        name: "hermes-style",
        description: "Hermes compatible",
        body: "# My Skill\n\n## When to Use\n- For X\n\n## Procedure\n1. Do thing",
      });

      const skill = skillManager.getSkill("hermes-style")!;
      expect(skillManager.isHermesCompatible(skill)).toBe(true);
    });

    it("recognizes skills with Hermes metadata", () => {
      skillManager.createSkill({
        name: "with-hermes-meta",
        description: "Has Hermes metadata",
        body: "# Skill",
        metadata: { hermes: { agent: "hermes" } },
      });

      const skill = skillManager.getSkill("with-hermes-meta")!;
      expect(skillManager.isHermesCompatible(skill)).toBe(true);
    });
  });
});
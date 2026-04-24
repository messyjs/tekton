import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { parseSkillMd, writeSkillMd, validateSkill, scanSkillDirectory, slugifySkillName } from "../../../packages/hermes-bridge/src/skill-format.js";

describe("Skill Format", () => {
  describe("parseSkillMd", () => {
    it("parses a valid SKILL.md with frontmatter", () => {
      const content = `---
name: my-skill
description: A test skill
version: 1.0.0
---

# My Skill

## When to Use
- When you need to do X
- When you encounter Y

## Procedure
1. Step one
2. Step two
`;
      const skill = parseSkillMd(content);
      expect(skill.name).toBe("my-skill");
      expect(skill.description).toBe("A test skill");
      expect(skill.version).toBe("1.0.0");
      expect(skill.body).toContain("# My Skill");
      expect(skill.body).toContain("Step one");
    });

    it("parses SKILL.md with metadata", () => {
      const content = `---
name: debug-typescript
description: Debug TypeScript errors
metadata:
  tekton:
    tags:
      - typescript
      - debugging
    category: debugging
    confidence: 0.8
---

# Debug TypeScript
`;
      const skill = parseSkillMd(content);
      expect(skill.name).toBe("debug-typescript");
      expect(skill.metadata?.tekton?.tags).toEqual(["typescript", "debugging"]);
      expect(skill.metadata?.tekton?.category).toBe("debugging");
      expect(skill.metadata?.tekton?.confidence).toBe(0.8);
    });

    it("parses SKILL.md with allowedTools", () => {
      const content = `---
name: my-skill
description: A skill with tool restrictions
allowedTools: "terminal,read_file,write_file"
---

# My Skill
`;
      const skill = parseSkillMd(content);
      expect(skill.allowedTools).toBe("terminal,read_file,write_file");
    });

    it("handles SKILL.md without frontmatter", () => {
      const content = "# Just Markdown\n\nSome body content.";
      const skill = parseSkillMd(content);
      expect(skill.name).toBe("");
      expect(skill.body).toContain("Just Markdown");
    });

    it("handles SKILL.md with Hermes-compatible metadata", () => {
      const content = `---
name: hermes-skill
description: Compatible with both Tekton and Hermes
metadata:
  hermes:
    agent: hermes
    version: "2.0"
  tekton:
    confidence: 0.7
---

# Hermes Skill
`;
      const skill = parseSkillMd(content);
      expect(skill.metadata?.hermes).toEqual({ agent: "hermes", version: "2.0" });
    });
  });

  describe("writeSkillMd", () => {
    it("writes a skill with frontmatter", () => {
      const content = writeSkillMd({
        name: "my-skill",
        description: "A test skill",
        body: "# My Skill\n\nSteps here.",
      });

      expect(content).toContain("---");
      expect(content).toContain("name: my-skill");
      expect(content).toContain("description: A test skill");
      expect(content).toContain("# My Skill");
    });

    it("includes metadata when provided", () => {
      const content = writeSkillMd({
        name: "my-skill",
        description: "A skill with metadata",
        body: "# Test",
        metadata: { tekton: { tags: ["test"], confidence: 0.5 } },
      });

      expect(content).toContain("tags");
      expect(content).toContain("0.5");
    });

    it("round-trips: parse -> write -> parse", () => {
      const original = `---
name: round-trip
description: Round trip test
version: 1.0.0
---

# Round Trip

## Steps
1. Do thing
2. Do other thing
`;
      const parsed = parseSkillMd(original);
      const written = writeSkillMd(parsed);
      const reparsed = parseSkillMd(written);

      expect(reparsed.name).toBe(parsed.name);
      expect(reparsed.description).toBe(parsed.description);
      expect(reparsed.version).toBe(parsed.version);
    });
  });

  describe("validateSkill", () => {
    it("validates a correct skill", () => {
      const result = validateSkill({
        name: "my-skill",
        description: "A valid skill",
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects missing name", () => {
      const result = validateSkill({ description: "No name" });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Skill name is required");
    });

    it("rejects uppercase names", () => {
      const result = validateSkill({ name: "MySkill", description: "Bad name" });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("lowercase"))).toBe(true);
    });

    it("rejects long names", () => {
      const result = validateSkill({ name: "a".repeat(65), description: "Too long" });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("64"))).toBe(true);
    });

    it("rejects invalid characters in name", () => {
      const result = validateSkill({ name: "my skill", description: "Bad chars" });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("hyphens"))).toBe(true);
    });

    it("rejects missing description", () => {
      const result = validateSkill({ name: "skill" });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Skill description is required");
    });

    it("rejects descriptions over 1024 chars", () => {
      const result = validateSkill({ name: "skill", description: "x".repeat(1025) });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("1024"))).toBe(true);
    });

    it("validates confidence range", () => {
      const result = validateSkill({
        name: "skill",
        description: "test",
        metadata: { tekton: { confidence: 1.5 } },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("0 and 1"))).toBe(true);
    });
  });

  describe("slugifySkillName", () => {
    it("slugifies a description", () => {
      expect(slugifySkillName("Debug TypeScript Errors")).toBe("debug-typescript-errors");
    });

    it("removes special characters", () => {
      expect(slugifySkillName("Fix bug #123 in C++!")).toBe("fix-bug-123-in-c");
    });

    it("truncates to 64 chars", () => {
      const long = "a".repeat(100);
      expect(slugifySkillName(long).length).toBeLessThanOrEqual(64);
    });
  });

  describe("scanSkillDirectory", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = path.join(os.tmpdir(), `tekton-scan-test-${Date.now()}`);
      fs.mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("scans references, scripts, and assets", () => {
      fs.mkdirSync(path.join(tmpDir, "references"), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, "scripts"), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, "assets"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "references", "guide.md"), "guide");
      fs.writeFileSync(path.join(tmpDir, "scripts", "setup.sh"), "#!/bin/bash");
      fs.writeFileSync(path.join(tmpDir, "assets", "logo.png"), "PNG");

      const result = scanSkillDirectory(tmpDir);
      expect(result.references).toEqual(["guide.md"]);
      expect(result.scripts).toEqual(["setup.sh"]);
      expect(result.assets).toEqual(["logo.png"]);
    });

    it("returns empty arrays for directories without subdirs", () => {
      fs.writeFileSync(path.join(tmpDir, "SKILL.md"), "---\nname: test\n---\n# Test");

      const result = scanSkillDirectory(tmpDir);
      expect(result.references).toEqual([]);
      expect(result.scripts).toEqual([]);
      expect(result.assets).toEqual([]);
    });
  });
});
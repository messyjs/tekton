import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryManager, type UserModel } from "../../../packages/core/src/memory/memory-manager.ts";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

function tempDir(): string {
  const dir = path.join(os.tmpdir(), `tekton-memory-test-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

describe("MemoryManager", () => {
  let dir: string;
  let manager: MemoryManager;

  beforeEach(() => {
    dir = tempDir();
    manager = new MemoryManager(dir);
  });

  afterEach(() => {
    manager.flush().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  });

  describe("MEMORY.md operations", () => {
    it("returns empty string when no memory file exists", () => {
      const memory = manager.getMemory();
      expect(memory).toBe("");
    });

    it("adds memory entries with timestamps", () => {
      manager.addMemory("Discovered that Node.js v20 uses import.meta.dirname");
      const memory = manager.getMemory();
      expect(memory).toContain("Node.js v20");
      expect(memory).toMatch(/\d{4}-\d{2}-\d{2}/); // Has date
    });

    it("adds memory entries with category", () => {
      manager.addMemory("Uses tabs for indentation", "preferences");
      const memory = manager.getMemory();
      expect(memory).toContain("Uses tabs");
      expect(memory).toContain("preferences");
    });

    it("searches memory by query", () => {
      manager.addMemory("Project uses TypeScript with strict mode");
      manager.addMemory("Deployment target is AWS Lambda");
      manager.addMemory("Uses pnpm for package management");

      const results = manager.searchMemory("TypeScript");
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some(r => r.includes("TypeScript"))).toBe(true);
    });

    it("returns empty results for non-matching query", () => {
      manager.addMemory("Some entry");
      const results = manager.searchMemory("xyznonexistent");
      expect(results.length).toBe(0);
    });

    it("clears memory", () => {
      manager.addMemory("Some important fact");
      manager.clearMemory();
      expect(manager.getMemory()).toBe("");
    });
  });

  describe("USER.md operations", () => {
    it("returns default user model when no file exists", () => {
      const model = manager.getUserModel();
      expect(model.preferences).toEqual({});
      expect(model.corrections).toEqual([]);
      expect(model.techStack).toEqual([]);
    });

    it("updates user model preferences", () => {
      manager.updateUserModel({
        preferences: { format: "concise", verbosity: "low" },
      });
      const model = manager.getUserModel();
      expect(model.preferences.format).toBe("concise");
      expect(model.preferences.verbosity).toBe("low");
    });

    it("updates tech stack", () => {
      manager.updateUserModel({
        techStack: ["TypeScript", "React", "Node.js"],
      });
      const model = manager.getUserModel();
      expect(model.techStack).toContain("TypeScript");
      expect(model.techStack).toContain("React");
    });

    it("merges partial updates", () => {
      manager.updateUserModel({
        preferences: { style: "direct" },
      });
      manager.updateUserModel({
        techStack: ["Python"],
      });
      const model = manager.getUserModel();
      expect(model.preferences.style).toBe("direct");
      expect(model.techStack).toContain("Python");
    });
  });

  describe("CONTEXT.md operations", () => {
    it("returns empty string for unknown project context", () => {
      const context = manager.getProjectContext("/some/project");
      expect(context).toBe("");
    });

    it("saves and retrieves project context", async () => {
      manager.updateProjectContext("/my/project", "React app with TypeScript, uses Vite");
      await manager.flush();

      // New manager instance to test persistence
      const manager2 = new MemoryManager(dir);
      const context = manager2.getProjectContext("/my/project");
      expect(context).toContain("React app");
    });
  });

  describe("flush and persistence", () => {
    it("persists memory to disk", async () => {
      manager.addMemory("Test persistence entry");
      await manager.flush();

      const memoryPath = path.join(dir, "MEMORY.md");
      expect(fs.existsSync(memoryPath)).toBe(true);
      const content = fs.readFileSync(memoryPath, "utf-8");
      expect(content).toContain("Test persistence entry");
    });

    it("persists user model to disk", async () => {
      manager.updateUserModel({
        preferences: { style: "concise" },
        techStack: ["Go"],
      });
      await manager.flush();

      const userModelPath = path.join(dir, "USER.md");
      expect(fs.existsSync(userModelPath)).toBe(true);
      const content = fs.readFileSync(userModelPath, "utf-8");
      expect(content).toContain("concise");
      expect(content).toContain("Go");
    });
  });

  describe("character limit enforcement", () => {
    it("enforces memory character limit", () => {
      // Add a lot of memory
      for (let i = 0; i < 100; i++) {
        manager.addMemory(`Memory entry number ${i} with some content to make it longer`);
      }
      manager.enforceLimit("MEMORY.md", 200);
      const memory = manager.getMemory();
      expect(memory.length).toBeLessThanOrEqual(250); // Some overhead
    });
  });
});
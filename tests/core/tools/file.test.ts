import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { readFileTool, writeFileTool, patchTool, searchFilesTool } from "../../../packages/tools/src/toolsets/file/index.ts";
import type { ToolContext } from "../../../packages/tools/src/registry.ts";

function tempDir(): string {
  const dir = path.join(os.tmpdir(), `tekton-file-test-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const mockContext: ToolContext = {
  cwd: "",
  taskId: "test",
  tektonHome: "",
  env: {},
};

describe("File Tools", () => {
  let dir: string;
  let ctx: ToolContext;

  beforeEach(() => {
    dir = tempDir();
    ctx = { ...mockContext, cwd: dir };
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  describe("read_file", () => {
    it("reads a text file with line numbers", async () => {
      fs.writeFileSync(path.join(dir, "test.txt"), "hello\nworld\nfoo");
      const result = await readFileTool.execute({ path: path.join(dir, "test.txt") }, ctx);
      expect(result.content).toContain("hello");
      expect(result.content).toContain("world");
      expect(result.isError).toBeUndefined();
    });

    it("suggests similar filenames when file not found", async () => {
      fs.writeFileSync(path.join(dir, "hello.txt"), "content");
      const result = await readFileTool.execute({ path: path.join(dir, "helo.txt") }, ctx);
      expect(result.isError).toBe(true);
      expect(result.content).toContain("not found");
    });

    it("reads with offset and limit", async () => {
      const lines = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`);
      fs.writeFileSync(path.join(dir, "big.txt"), lines.join("\n"));
      const result = await readFileTool.execute({ path: path.join(dir, "big.txt"), offset: 5, limit: 3 }, ctx);
      expect(result.content).toContain("5");
    });

    it("lists directory contents", async () => {
      fs.writeFileSync(path.join(dir, "a.txt"), "a");
      fs.writeFileSync(path.join(dir, "b.txt"), "b");
      const result = await readFileTool.execute({ path: dir }, ctx);
      expect(result.content).toContain("a.txt");
      expect(result.content).toContain("b.txt");
    });
  });

  describe("write_file", () => {
    it("writes content to a file", async () => {
      const filePath = path.join(dir, "output.txt");
      const result = await writeFileTool.execute({ path: filePath, content: "Hello, World!" }, ctx);
      expect(result.content).toContain("Written");
      expect(fs.readFileSync(filePath, "utf-8")).toBe("Hello, World!");
    });

    it("creates parent directories", async () => {
      const filePath = path.join(dir, "sub", "dir", "file.txt");
      const result = await writeFileTool.execute({ path: filePath, content: "nested" }, ctx);
      expect(result.isError).toBeUndefined();
      expect(fs.readFileSync(filePath, "utf-8")).toBe("nested");
    });
  });

  describe("patch", () => {
    it("patches a file with exact match", async () => {
      const filePath = path.join(dir, "patch.txt");
      fs.writeFileSync(filePath, "Hello World\nGoodbye World");
      const result = await patchTool.execute({
        path: filePath,
        edits: [{ oldText: "Hello World", newText: "Hello Terra" }],
      }, ctx);
      expect(result.content).toContain("Patched");
      expect(fs.readFileSync(filePath, "utf-8")).toContain("Hello Terra");
    });

    it("returns error for non-existent file", async () => {
      const result = await patchTool.execute({
        path: path.join(dir, "nonexistent.txt"),
        edits: [{ oldText: "foo", newText: "bar" }],
      }, ctx);
      expect(result.isError).toBe(true);
    });
  });

  describe("search_files", () => {
    it("searches file content", async () => {
      fs.writeFileSync(path.join(dir, "doc1.txt"), "Alpha beta gamma");
      fs.writeFileSync(path.join(dir, "doc2.txt"), "Delta epsilon zeta");
      const result = await searchFilesTool.execute({ query: "beta", path: dir }, ctx);
      expect(result.content).toContain("beta");
    });

    it("searches filenames", async () => {
      fs.writeFileSync(path.join(dir, "config.json"), "{}");
      fs.writeFileSync(path.join(dir, "data.csv"), "a,b");
      const result = await searchFilesTool.execute({ query: "config", path: dir, target: "filename" }, ctx);
      expect(result.content).toContain("config.json");
    });

    it("returns no results for non-matching query", async () => {
      fs.writeFileSync(path.join(dir, "test.txt"), "hello world");
      const result = await searchFilesTool.execute({ query: "xyznonexistent", path: dir }, ctx);
      expect(result.content).toContain("No results");
    });
  });
});
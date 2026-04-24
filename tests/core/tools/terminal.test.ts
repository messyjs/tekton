import { describe, it, expect, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { terminalTool, processTool } from "../../../packages/tools/src/toolsets/terminal/index.ts";
import type { ToolContext } from "../../../packages/tools/src/registry.ts";

const tempDir = path.join(os.tmpdir(), `tekton-terminal-test-${Date.now()}`);

const mockContext: ToolContext = {
  cwd: tempDir,
  taskId: "test",
  tektonHome: tempDir,
  env: {},
};

describe("Terminal Tools", () => {
  beforeEach(() => {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  });

  // Use longer timeout for terminal tests
  afterEach(async () => {
    // Try to clean up, but don't fail if locked
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  });

  it("executes a simple echo command", async () => {
    const result = await terminalTool.execute({ command: "echo hello" }, mockContext);
    expect(result.content).toContain("hello");
  });

  it("returns error for failed commands", async () => {
    const result = await terminalTool.execute({ command: "exit 1" }, mockContext);
    expect(result.isError).toBe(true);
  });

  it("starts background process", async () => {
    const result = await terminalTool.execute({ command: "node -e \"setTimeout(() => {}, 60000)\"", background: true }, mockContext);
    expect(result.content).toContain("Background process started");

    // Clean up — kill the process
    if (result.metadata?.processId) {
      await processTool.execute({ action: "kill", session_id: result.metadata.processId as string }, mockContext);
    }
  }, 10000);

  it("blocks dangerous commands by default", async () => {
    const result = await terminalTool.execute({ command: "rm -rf /" }, mockContext);
    expect(result.isError).toBe(true);
    expect(result.content).toContain("blocked");
  });

  it("process tool can list processes", async () => {
    const result = await processTool.execute({ action: "list" }, mockContext);
    expect(result.content).toBeDefined();
  });
});
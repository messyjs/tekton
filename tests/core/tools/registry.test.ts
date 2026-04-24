import { describe, it, expect, beforeEach } from "vitest";
import { ToolRegistry, registry } from "../../../packages/tools/src/registry.ts";
import type { ToolDefinition, ToolResult } from "../../../packages/tools/src/registry.ts";
import { Type } from "@sinclair/typebox";
import { registerAllTools } from "../../../packages/tools/src/index.ts";

const mockTool: ToolDefinition = {
  name: "mock_test",
  toolset: "test",
  description: "A mock tool for testing",
  parameters: Type.Object({ input: Type.String() }),
  execute: async (params) => ({ content: `Mock: ${params.input}` }),
};

const dangerousTool: ToolDefinition = {
  name: "dangerous_test",
  toolset: "test",
  description: "A dangerous tool",
  parameters: Type.Object({}),
  dangerous: true,
  execute: async () => ({ content: "Dangerous!" }),
};

const platformTool: ToolDefinition = {
  name: "platform_linux_only",
  toolset: "test",
  description: "Linux only",
  parameters: Type.Object({}),
  requiresPlatform: ["linux"],
  execute: async () => ({ content: "Linux!" }),
};

const envTool: ToolDefinition = {
  name: "env_required",
  toolset: "test",
  description: "Requires API key",
  parameters: Type.Object({}),
  requiresEnv: ["MY_API_KEY"],
  execute: async () => ({ content: "Got it!" }),
};

describe("ToolRegistry", () => {
  let reg: ToolRegistry;

  beforeEach(() => {
    reg = new ToolRegistry();
  });

  it("registers a tool", () => {
    reg.register(mockTool);
    expect(reg.get("mock_test")).toBeDefined();
    expect(reg.get("mock_test")?.name).toBe("mock_test");
  });

  it("rejects duplicate tool names", () => {
    reg.register(mockTool);
    expect(() => reg.register(mockTool)).toThrow("already registered");
  });

  it("lists toolsets", () => {
    reg.register(mockTool);
    reg.register(dangerousTool);
    expect(reg.listToolsets()).toEqual(["test"]);
  });

  it("lists tools", () => {
    reg.register(mockTool);
    reg.register(dangerousTool);
    const tools = reg.listTools();
    expect(tools.length).toBe(2);
    expect(tools.some(t => t.name === "mock_test")).toBe(true);
  });

  it("gets tools by toolset", () => {
    reg.register(mockTool);
    reg.register(dangerousTool);
    const tools = reg.getByToolset("test");
    expect(tools.length).toBe(2);
  });

  it("filters available tools by env", () => {
    reg.register(mockTool);
    reg.register(envTool);
    const available = reg.getAvailable({}, "linux");
    expect(available.length).toBe(1);
    expect(available[0].name).toBe("mock_test");
  });

  it("includes env tools when env is present", () => {
    reg.register(envTool);
    const available = reg.getAvailable({ MY_API_KEY: "test" }, "linux");
    expect(available.length).toBe(1);
  });

  it("filters available tools by platform", () => {
    reg.register(mockTool);
    reg.register(platformTool);
    const available = reg.getAvailable({}, "windows");
    expect(available.length).toBe(1);
    expect(available[0].name).toBe("mock_test");
  });

  it("executes a tool", async () => {
    reg.register(mockTool);
    const result = await reg.execute("mock_test", { input: "hello" }, {
      cwd: "/tmp",
      taskId: "t1",
      tektonHome: "/tmp/tekton",
      env: {},
    });
    expect(result.content).toBe("Mock: hello");
  });

  it("returns error for unknown tool", async () => {
    const result = await reg.execute("nonexistent", {}, {
      cwd: "/tmp",
      taskId: "t1",
      tektonHome: "/tmp/tekton",
      env: {},
    });
    expect(result.isError).toBe(true);
  });

  it("requires approval for dangerous tools", async () => {
    reg.register(dangerousTool);
    let approvalCalled = false;
    const result = await reg.execute("dangerous_test", {}, {
      cwd: "/tmp",
      taskId: "t1",
      tektonHome: "/tmp/tekton",
      env: {},
      approvalCallback: async () => { approvalCalled = true; return false; },
    });
    expect(approvalCalled).toBe(true);
    expect(result.isError).toBe(true);
  });

  it("allows dangerous tools when approved", async () => {
    reg.register(dangerousTool);
    const result = await reg.execute("dangerous_test", {}, {
      cwd: "/tmp",
      taskId: "t1",
      tektonHome: "/tmp/tekton",
      env: {},
      approvalCallback: async () => true,
    });
    expect(result.isError).toBeUndefined();
  });

  it("returns schemas", () => {
    reg.register(mockTool);
    const schemas = reg.getSchemas(["mock_test"]);
    expect(schemas.length).toBe(1);
    expect(schemas[0].name).toBe("mock_test");
  });

  it("tracks count", () => {
    reg.register(mockTool);
    expect(reg.count).toBe(1);
    reg.register(dangerousTool);
    expect(reg.count).toBe(2);
  });
});
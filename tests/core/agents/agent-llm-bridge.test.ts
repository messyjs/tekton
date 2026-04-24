import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentLLMBridge, type ToolExecutor, type LLMResponse, type BridgeMessage } from "@tekton/core";
import { ModelRouter } from "@tekton/core";

// ── Helpers ────────────────────────────────────────────────────────────

function createMockRouter(): ModelRouter {
  return new ModelRouter({
    fastModel: "gpt-4o-mini",
    fastProvider: "openai",
    deepModel: "gpt-4o",
    deepProvider: "openai",
    fallbackChain: [],
    complexityThreshold: 0.6,
    simpleThreshold: 0.2,
  });
}

function createMockToolExecutor(responses: Record<string, { content: string; isError: boolean }>): ToolExecutor {
  return {
    async execute(name: string, params: Record<string, unknown>) {
      if (responses[name]) {
        return responses[name];
      }
      return { content: `Executed tool: ${name}`, isError: false };
    },
    getTools(toolsets?: string[]) {
      const allTools = [
        { name: "read_file", description: "Read a file", parameters: {} },
        { name: "write_file", description: "Write a file", parameters: {} },
        { name: "terminal", description: "Run terminal command", parameters: {} },
        { name: "web_search", description: "Search the web", parameters: {} },
      ];
      if (!toolsets || toolsets.length === 0) return allTools;
      // Filter based on toolset naming — simplified for test
      const toolsetFilter: Record<string, string[]> = {
        file: ["read_file", "write_file"],
        terminal: ["terminal"],
        web: ["web_search"],
      };
      const allowed = toolsets.flatMap(ts => toolsetFilter[ts] ?? []);
      return allTools.filter(t => allowed.includes(t.name));
    },
  };
}

// ── Simple task (no tool calls) completes in 1 turn ────────────────────

describe("AgentLLMBridge", () => {
  let router: ModelRouter;

  beforeEach(() => {
    router = createMockRouter();
  });

  it("completes a simple task with no tool calls in 1 turn", async () => {
    const bridge = new AgentLLMBridge(router);
    bridge._callLLMOverride = async () => ({
      content: "The answer is 42.",
      toolCalls: [],
      model: "gpt-4o-mini",
      provider: "openai",
      inputTokens: 50,
      outputTokens: 10,
      durationMs: 100,
    });

    const result = await bridge.executeTask({
      systemPrompt: "You are a helpful assistant.",
      taskDescription: "What is the answer to life, the universe, and everything?",
    });

    expect(result.success).toBe(true);
    expect(result.result).toBe("The answer is 42.");
    expect(result.toolCalls).toHaveLength(0);
    expect(result.messageCount).toBe(3); // system + user + assistant
    expect(result.modelUsed).toBe("gpt-4o-mini");
  });

  it("completes a task with 2 tool calls in 2 turns", async () => {
    const toolExecutor = createMockToolExecutor({
      read_file: { content: "file contents here", isError: false },
      write_file: { content: "File written successfully", isError: false },
    });

    const bridge = new AgentLLMBridge(router, toolExecutor);

    let callCount = 0;
    bridge._callLLMOverride = async () => {
      callCount++;
      if (callCount === 1) {
        return {
          content: null,
          toolCalls: [
            { id: "tc1", name: "read_file", arguments: { path: "/tmp/test.txt" } },
            { id: "tc2", name: "write_file", arguments: { path: "/tmp/output.txt", content: "hello" } },
          ],
          model: "gpt-4o",
          provider: "openai",
          inputTokens: 100,
          outputTokens: 20,
          durationMs: 200,
        };
      }
      return {
        content: "I've read the file and written the output.",
        toolCalls: [],
        model: "gpt-4o",
        provider: "openai",
        inputTokens: 150,
        outputTokens: 15,
        durationMs: 100,
      };
    };

    const result = await bridge.executeTask({
      systemPrompt: "You are a helpful assistant.",
      taskDescription: "Read a file and write the output.",
      tools: ["file"],
    });

    expect(result.success).toBe(true);
    expect(result.toolCalls).toHaveLength(2);
    expect(result.toolCalls[0].tool).toBe("read_file");
    expect(result.toolCalls[1].tool).toBe("write_file");
    expect(result.toolCalls[0].result).toBe("file contents here");
    expect(result.toolCalls[1].result).toBe("File written successfully");
    expect(result.filesModified).toContain("/tmp/output.txt");
    expect(callCount).toBe(2);
  });

  it("recovers from tool execution failure", async () => {
    const toolExecutor = createMockToolExecutor({
      read_file: { content: "Error: file not found", isError: true },
    });

    const bridge = new AgentLLMBridge(router, toolExecutor);

    let callCount = 0;
    bridge._callLLMOverride = async () => {
      callCount++;
      if (callCount === 1) {
        return {
          content: null,
          toolCalls: [
            { id: "tc1", name: "read_file", arguments: { path: "/tmp/missing.txt" } },
          ],
          model: "gpt-4o",
          provider: "openai",
          inputTokens: 80,
          outputTokens: 10,
          durationMs: 150,
        };
      }
      return {
        content: "The file doesn't exist. I'll handle that gracefully.",
        toolCalls: [],
        model: "gpt-4o",
        provider: "openai",
        inputTokens: 100,
        outputTokens: 20,
        durationMs: 100,
      };
    };

    const result = await bridge.executeTask({
      systemPrompt: "You are a helpful assistant.",
      taskDescription: "Read a file that doesn't exist.",
    });

    expect(result.success).toBe(true);
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].isError).toBe(true);
    expect(callCount).toBe(2);
  });

  it("enforces maxTurns limit", async () => {
    const bridge = new AgentLLMBridge(router);

    let callCount = 0;
    bridge._callLLMOverride = async () => {
      callCount++;
      // Always return tool calls — never finishes
      return {
        content: null,
        toolCalls: [
          { id: `tc-${callCount}`, name: "terminal", arguments: { command: `echo ${callCount}` } },
        ],
        model: "gpt-4o",
        provider: "openai",
        inputTokens: 50,
        outputTokens: 10,
        durationMs: 50,
      };
    };

    const result = await bridge.executeTask({
      systemPrompt: "You are a helpful assistant.",
      taskDescription: "Keep making tool calls forever.",
      maxTurns: 3,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Max turns (3) reached");
    expect(callCount).toBe(3);
  });

  it("filters tools by requested toolsets", async () => {
    const toolExecutor = createMockToolExecutor({});
    const bridge = new AgentLLMBridge(router, toolExecutor);

    const tools = toolExecutor.getTools();
    expect(tools).toHaveLength(4);

    const fileTools = toolExecutor.getTools(["file"]);
    expect(fileTools).toHaveLength(2);
    expect(fileTools.map(t => t.name)).toContain("read_file");
    expect(fileTools.map(t => t.name)).toContain("write_file");
    expect(fileTools.map(t => t.name)).not.toContain("terminal");
  });

  it("fires onMessage callback for every message", async () => {
    const toolExecutor = createMockToolExecutor({
      read_file: { content: "file contents", isError: false },
    });

    const bridge = new AgentLLMBridge(router, toolExecutor);
    const messages: BridgeMessage[] = [];

    let callCount = 0;
    bridge._callLLMOverride = async () => {
      callCount++;
      if (callCount === 1) {
        return {
          content: "Let me read the file.",
          toolCalls: [
            { id: "tc1", name: "read_file", arguments: { path: "/tmp/test.txt" } },
          ],
          model: "gpt-4o",
          provider: "openai",
          inputTokens: 50,
          outputTokens: 10,
          durationMs: 100,
        };
      }
      return {
        content: "The file contains important data.",
        toolCalls: [],
        model: "gpt-4o",
        provider: "openai",
        inputTokens: 50,
          outputTokens: 10,
        durationMs: 100,
      };
    };

    await bridge.executeTask({
      systemPrompt: "You are a helpful assistant.",
      taskDescription: "Read the file",
      onMessage: (msg) => messages.push({ ...msg }),
    });

    // Expect: system, user, assistant, tool, assistant
    expect(messages.length).toBe(5);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
    expect(messages[2].role).toBe("assistant");
    expect(messages[3].role).toBe("tool");
    expect(messages[4].role).toBe("assistant");
  });

  it("uses model override when specified", async () => {
    const bridge = new AgentLLMBridge(router);

    bridge._callLLMOverride = async (model, provider) => ({
      content: "Done",
      toolCalls: [],
      model,
      provider,
      inputTokens: 50,
      outputTokens: 10,
      durationMs: 50,
    });

    const result = await bridge.executeTask({
      systemPrompt: "You are a helpful assistant.",
      taskDescription: "Do something",
      model: "claude-3-opus",
    });

    expect(result.success).toBe(true);
    expect(result.modelUsed).toBe("claude-3-opus");
  });

  it("tracks tokens used across multiple turns", async () => {
    const toolExecutor = createMockToolExecutor({
      read_file: { content: "data", isError: false },
    });

    const bridge = new AgentLLMBridge(router, toolExecutor);

    let callCount = 0;
    bridge._callLLMOverride = async () => {
      callCount++;
      if (callCount === 1) {
        return {
          content: null,
          toolCalls: [{ id: "tc1", name: "read_file", arguments: { path: "/tmp/data" } }],
          model: "gpt-4o",
          provider: "openai",
          inputTokens: 100,
          outputTokens: 20,
          durationMs: 100,
        };
      }
      return {
        content: "Done",
        toolCalls: [],
        model: "gpt-4o",
        provider: "openai",
        inputTokens: 120,
          outputTokens: 10,
        durationMs: 80,
      };
    };

    const result = await bridge.executeTask({
      systemPrompt: "You are a helpful assistant.",
      taskDescription: "Read data",
    });

    expect(result.success).toBe(true);
    expect(result.tokensUsed).toBe(250); // (100+20) + (120+10) = 250
  });

  it("handles tool executor not available", async () => {
    const bridge = new AgentLLMBridge(router); // no tool executor

    let callCount = 0;
    bridge._callLLMOverride = async () => {
      callCount++;
      if (callCount === 1) {
        return {
          content: null,
          toolCalls: [{ id: "tc1", name: "read_file", arguments: { path: "/tmp/test" } }],
          model: "gpt-4o",
          provider: "openai",
          inputTokens: 50,
          outputTokens: 10,
          durationMs: 100,
        };
      }
      return {
        content: "I see the tool isn't available. Let me try another approach.",
        toolCalls: [],
        model: "gpt-4o",
        provider: "openai",
        inputTokens: 80,
        outputTokens: 15,
        durationMs: 80,
      };
    };

    const result = await bridge.executeTask({
      systemPrompt: "You are a helpful assistant.",
      taskDescription: "Try to use a tool.",
    });

    expect(result.success).toBe(true);
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].isError).toBe(true);
    expect(result.toolCalls[0].result).toContain("not available");
  });

  it("tracks file modifications from write and patch tools", async () => {
    const toolExecutor = createMockToolExecutor({
      write_file: { content: "Written", isError: false },
      patch: { content: "Patched", isError: false },
    });

    const bridge = new AgentLLMBridge(router, toolExecutor);

    let callCount = 0;
    bridge._callLLMOverride = async () => {
      callCount++;
      if (callCount === 1) {
        return {
          content: null,
          toolCalls: [
            { id: "tc1", name: "write_file", arguments: { path: "/tmp/new.py", content: "print('hi')" } },
            { id: "tc2", name: "patch", arguments: { path: "/tmp/existing.py", diff: "changes" } },
          ],
          model: "gpt-4o",
          provider: "openai",
          inputTokens: 100,
          outputTokens: 20,
          durationMs: 100,
        };
      }
      return {
        content: "Files modified.",
        toolCalls: [],
        model: "gpt-4o",
        provider: "openai",
        inputTokens: 50,
        outputTokens: 10,
        durationMs: 50,
      };
    };

    const result = await bridge.executeTask({
      systemPrompt: "You are a helpful assistant.",
      taskDescription: "Create and patch files.",
    });

    expect(result.filesModified).toContain("/tmp/new.py");
    expect(result.filesModified).toContain("/tmp/existing.py");
    expect(result.filesModified).toHaveLength(2);
  });
});
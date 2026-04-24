import { Type } from "@sinclair/typebox";
import type { ToolDefinition, ToolResult } from "../../registry.js";

// Module-level task store
const taskStore = new Map<string, { id: string; content: string; status: string }>();

export const todoTool: ToolDefinition = {
  name: "todo",
  toolset: "orchestration",
  description: "Manage session task list. Actions: create, update, read, complete.",
  parameters: Type.Object({
    action: Type.Union([Type.Literal("create"), Type.Literal("update"), Type.Literal("read"), Type.Literal("complete")]),
    id: Type.Optional(Type.String({ description: "Task ID" })),
    content: Type.Optional(Type.String({ description: "Task content" })),
    status: Type.Optional(Type.Union([Type.Literal("pending"), Type.Literal("in_progress"), Type.Literal("completed")])),
  }),
  async execute(params): Promise<ToolResult> {
    const action = params.action as string;
    switch (action) {
      case "create": {
        const id = `task_${Date.now()}`;
        const task = { id, content: (params.content as string) ?? "Untitled task", status: "pending" };
        taskStore.set(id, task);
        return { content: `Created: ${id} - ${task.content}` };
      }
      case "update": {
        const id = params.id as string;
        const task = taskStore.get(id);
        if (!task) return { content: `Task not found: ${id}`, isError: true };
        if (params.content) task.content = params.content as string;
        if (params.status) task.status = params.status as string;
        return { content: `Updated: ${id} - ${task.content} [${task.status}]` };
      }
      case "read": {
        const all = [...taskStore.values()];
        return { content: all.length > 0 ? all.map(t => `[${t.status}] ${t.id}: ${t.content}`).join("\n") : "No tasks" };
      }
      case "complete": {
        const id = params.id as string;
        const task = taskStore.get(id);
        if (!task) return { content: `Task not found: ${id}`, isError: true };
        task.status = "completed";
        return { content: `Completed: ${id}` };
      }
      default:
        return { content: `Unknown action: ${action}`, isError: true };
    }
  },
};

export const clarifyTool: ToolDefinition = {
  name: "clarify",
  toolset: "orchestration",
  description: "Ask user a structured question. Interactive tool for disambiguation.",
  parameters: Type.Object({
    question: Type.String({ description: "Question to ask" }),
    options: Type.Optional(Type.Array(Type.String({ description: "Multiple-choice options" }))),
    allow_freeform: Type.Optional(Type.Boolean({ description: "Allow free-text response" })),
  }),
  interactive: true,
  async execute(params): Promise<ToolResult> {
    const question = params.question as string;
    const options = params.options as string[] | undefined;
    let content = `❓ ${question}\n`;
    if (options) {
      content += options.map((o, i) => `  ${i + 1}. ${o}`).join("\n");
    }
    if (params.allow_freeform) {
      content += "\n  [Or type your own answer]";
    }
    return { content };
  },
};

export const executeCodeTool: ToolDefinition = {
  name: "execute_code",
  toolset: "orchestration",
  description: "Run Python script that can call Tekton tools programmatically (sandboxed).",
  parameters: Type.Object({
    code: Type.String({ description: "Python code to execute" }),
    timeout: Type.Optional(Type.Number({ description: "Timeout in ms (default 30000)" })),
  }),
  dangerous: true,
  async execute(): Promise<ToolResult> {
    return { content: "Code execution sandbox not yet implemented. This tool will run Python in an isolated subprocess in a future phase." };
  },
};

export const mixtureOfAgentsTool: ToolDefinition = {
  name: "mixture_of_agents",
  toolset: "orchestration",
  description: "Route hard problem through multiple LLMs collaboratively.",
  parameters: Type.Object({
    prompt: Type.String({ description: "Problem to solve" }),
    models: Type.Optional(Type.Array(Type.String({ description: "Models to use" }))),
    strategy: Type.Optional(Type.Union([Type.Literal("vote"), Type.Literal("debate"), Type.Literal("cascade")])),
  }),
  requiresEnv: ["OPENROUTER_API_KEY"],
  async execute(params, context): Promise<ToolResult> {
    if (!context.env.OPENROUTER_API_KEY) {
      return { content: "Mixture of Agents requires OPENROUTER_API_KEY", isError: true };
    }
    return { content: "Mixture of Agents requires hermes-bridge (Phase 4) for multi-model routing." };
  },
};
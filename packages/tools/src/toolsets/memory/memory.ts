import { Type } from "@sinclair/typebox";
import type { ToolDefinition, ToolResult } from "../../registry.js";
import path from "node:path";

// Inline import to avoid circular dep issues
const MemoryManagerModule = await import("@tekton/core");

let memoryManager: InstanceType<typeof MemoryManagerModule.MemoryManager> | null = null;

function getManager(tektonHome: string): InstanceType<typeof MemoryManagerModule.MemoryManager> {
  if (!memoryManager) {
    memoryManager = new MemoryManagerModule.MemoryManager(tektonHome);
  }
  return memoryManager;
}

export const memoryTool: ToolDefinition = {
  name: "memory",
  toolset: "memory",
  description:
    "Save important information to persistent memory that survives across sessions. Actions: save, search, list, forget.",
  parameters: Type.Object({
    action: Type.Union([Type.Literal("save"), Type.Literal("search"), Type.Literal("list"), Type.Literal("forget")]),
    content: Type.Optional(Type.String({ description: "Content to save (for save action)" })),
    query: Type.Optional(Type.String({ description: "Search query (for search action)" })),
    category: Type.Optional(Type.Union([Type.Literal("general"), Type.Literal("user"), Type.Literal("project")])),
    id: Type.Optional(Type.String({ description: "ID to forget (for forget action)" })),
  }),
  async execute(params, context): Promise<ToolResult> {
    const mgr = getManager(context.tektonHome);
    const action = params.action as string;

    switch (action) {
      case "save": {
        const category = (params.category as string) ?? "general";
        const content = params.content as string;

        if (category === "user") {
          mgr.updateUserModel({ preferences: { [content.split(":")[0]?.trim() ?? "note"]: content } });
        } else if (category === "project") {
          mgr.updateProjectContext(context.cwd, content);
        } else {
          mgr.addMemory(content, category !== "general" ? category : undefined);
        }

        await mgr.flush();
        return { content: `Saved to ${category} memory.` };
      }
      case "search": {
        const query = (params.query as string) ?? "";
        const results = mgr.searchMemory(query);
        return { content: results.length > 0 ? results.join("\n") : "No results found." };
      }
      case "list": {
        const memory = mgr.getMemory();
        const userModel = mgr.getUserModel();
        return {
          content: `## MEMORY.md\n${memory || "(empty)"}\n\n## USER.md\n${JSON.stringify(userModel, null, 2)}`,
        };
      }
      case "forget": {
        mgr.clearMemory();
        await mgr.flush();
        return { content: "Memory cleared." };
      }
      default:
        return { content: `Unknown action: ${action}`, isError: true };
    }
  },
};

export const sessionSearchTool: ToolDefinition = {
  name: "session_search",
  toolset: "memory",
  description: "Search past conversation sessions.",
  parameters: Type.Object({
    query: Type.String({ description: "Search query" }),
    limit: Type.Optional(Type.Number({ description: "Max results (default 5)" })),
  }),
  async execute(params, context): Promise<ToolResult> {
    const { SessionSearcher } = await import("@tekton/core");
    const dbPath = path.join(context.tektonHome, "sessions.db");
    const searcher = new SessionSearcher(dbPath);
    try {
      const results = searcher.search(params.query as string, (params.limit as number) ?? 5);
      if (results.length === 0) {
        return { content: "No past sessions found matching query." };
      }
      return { content: results.map(r => `[${r.sessionId}] ${r.snippet}`).join("\n\n") };
    } finally {
      searcher.close();
    }
  },
};
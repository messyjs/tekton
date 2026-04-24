export interface MemoryToolParams {
  action: "save" | "search" | "list" | "forget";
  content?: string;
  query?: string;
  category?: "general" | "user" | "project";
  id?: string;
}

export interface MemoryToolResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export const MEMORY_TOOL_SCHEMA = {
  name: "memory",
  description:
    "Save important information to persistent memory that survives across sessions. Your memory appears in your system prompt at session start. WHEN TO SAVE: environment discoveries, user preferences, corrections to your behavior, recurring patterns, project-specific knowledge.",
  parameters: {
    type: "object" as const,
    properties: {
      action: {
        type: "string" as const,
        enum: ["save", "search", "list", "forget"] as const,
        description: "Action to perform on memory",
      },
      content: {
        type: "string" as const,
        description: "Content to save (for save action)",
      },
      query: {
        type: "string" as const,
        description: "Search query (for search action)",
      },
      category: {
        type: "string" as const,
        enum: ["general", "user", "project"] as const,
        description: "Which memory file to use",
      },
      id: {
        type: "string" as const,
        description: "ID to forget (for forget action)",
      },
    },
    required: ["action"] as const,
  },
};
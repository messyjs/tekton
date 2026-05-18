export const MEMORY_TOOL_SCHEMA = {
    name: "memory",
    description: "Save important information to persistent memory that survives across sessions. Your memory appears in your system prompt at session start. WHEN TO SAVE: environment discoveries, user preferences, corrections to your behavior, recurring patterns, project-specific knowledge.",
    parameters: {
        type: "object",
        properties: {
            action: {
                type: "string",
                enum: ["save", "search", "list", "forget"],
                description: "Action to perform on memory",
            },
            content: {
                type: "string",
                description: "Content to save (for save action)",
            },
            query: {
                type: "string",
                description: "Search query (for search action)",
            },
            category: {
                type: "string",
                enum: ["general", "user", "project"],
                description: "Which memory file to use",
            },
            id: {
                type: "string",
                description: "ID to forget (for forget action)",
            },
        },
        required: ["action"],
    },
};
//# sourceMappingURL=memory-tool.js.map
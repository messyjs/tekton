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
export declare const MEMORY_TOOL_SCHEMA: {
    name: string;
    description: string;
    parameters: {
        type: "object";
        properties: {
            action: {
                type: "string";
                enum: readonly ["save", "search", "list", "forget"];
                description: string;
            };
            content: {
                type: "string";
                description: string;
            };
            query: {
                type: "string";
                description: string;
            };
            category: {
                type: "string";
                enum: readonly ["general", "user", "project"];
                description: string;
            };
            id: {
                type: "string";
                description: string;
            };
        };
        required: readonly ["action"];
    };
};
//# sourceMappingURL=memory-tool.d.ts.map
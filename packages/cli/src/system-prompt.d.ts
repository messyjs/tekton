import type { SoulManager, PersonalityManager, MemoryManager } from "@tekton/core";
export interface SystemPromptConfig {
    soul: SoulManager;
    personality: PersonalityManager;
    memory: MemoryManager;
    activeModel: string;
    routingMode: string;
    skillCount: number;
    compressionLevel: string;
    learningEnabled: boolean;
    memoryContent: string;
    userContext: string;
    toolSummary: string;
    skillsSummary: string;
    budgetContext?: string;
}
export declare function generateSystemPrompt(config: SystemPromptConfig): string;
//# sourceMappingURL=system-prompt.d.ts.map
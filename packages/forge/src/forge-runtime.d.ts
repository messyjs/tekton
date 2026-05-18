import type { ProductBrief, DirectorDecision, ProductionPlan, TaskCard, ForgePhase } from "./types.js";
import { type ProductionManagerConfig } from "./production/production-manager.js";
import { type QAManagerConfig } from "./qa/qa-manager.js";
import { type QAResult } from "./qa/verdict.js";
export interface ForgeState {
    projectId: string;
    currentPhase: ForgePhase;
    brief?: ProductBrief;
    directorDecision?: DirectorDecision;
    productionPlan?: ProductionPlan;
    taskCards: TaskCard[];
    qaResults?: QAResult[];
    qaVerdict?: "pass" | "conditional-pass" | "fail";
    error?: string;
    createdAt: number;
    updatedAt: number;
}
export interface ForgeRuntimeConfig {
    /** Whether Forge is enabled (must be true for any operations) */
    enabled: boolean;
    /** Directory for Forge projects */
    projectsDir?: string;
    /** Production manager config */
    production?: Partial<ProductionManagerConfig>;
    /** QA manager config */
    qa?: Partial<QAManagerConfig>;
    /** Max ideation revision loops */
    maxIdeationRevisions?: number;
    /** Max QA retry cycles */
    maxQACycles?: number;
    /** LLM call function */
    callLLM?: (systemPrompt: string, userPrompt: string) => Promise<string>;
}
export declare class ForgeRuntime {
    private config;
    private projectsDir;
    private cavemem;
    private scribePool;
    private sessionManager;
    private productionManager;
    constructor(config?: Partial<ForgeRuntimeConfig>);
    /**
     * Check if Forge is enabled.
     */
    isEnabled(): boolean;
    /**
     * Start a new project. Full pipeline:
     * ideation → director → preflight → production → QA → promotion
     */
    newProject(userIdea?: string): Promise<string>;
    /**
     * Resume a project from saved state.
     */
    resumeProject(projectId: string): Promise<ForgeState>;
    /**
     * Get project status.
     */
    getProjectStatus(projectId: string): ForgeState | null;
    /**
     * List all projects with statuses.
     */
    listProjects(): Array<{
        id: string;
        phase: ForgePhase;
        title?: string;
        error?: string;
    }>;
    private saveState;
    private loadState;
}
//# sourceMappingURL=forge-runtime.d.ts.map
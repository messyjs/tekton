/**
 * Bridge Orchestrator — Ties together SkillManager, UserModelManager, Evaluator, Learner, and ContextHygiene.
 * The main entry point for the Hermes Bridge learning loop.
 */
import { MemoryManager } from "@tekton/core";
import { type CompressionTier } from "@tekton/core";
import type { ToolResult } from "@tekton/tools";
import { SkillManager } from "./skill-manager.js";
import { UserModelManager } from "./user-model.js";
import { Evaluator, type EvaluationResult, type AgentMessage, type EvaluationConfig } from "./evaluator.js";
import { Learner } from "./learner.js";
import { ContextHygiene, type HygieneConfig, type HygieneRecommendation } from "./context-hygiene.js";
import type { Skill, SkillSummary } from "./skill-format.js";
export interface BridgeConfig {
    tektonHome: string;
    skillDirs?: string[];
    evaluationConfig?: Partial<EvaluationConfig>;
    hygieneConfig?: Partial<HygieneConfig>;
}
export interface TaskContext {
    messages: AgentMessage[];
    toolResults: ToolResult[];
    routingDecision?: {
        model: string;
        provider: string;
        reason: string;
        complexityScore: number;
        estimatedCost: number;
    };
    userCorrections: string[];
    startTime: number;
    endTime: number;
    taskDescription: string;
    tokensUsed?: number;
}
export interface OnTaskCompleteResult {
    evaluation: EvaluationResult;
    newSkill?: Skill;
    refinedSkill?: {
        name: string;
        update: import("./skill-format.js").SkillUpdate;
    };
    hygieneActions: HygieneRecommendation[];
}
export interface PrepareContextResult {
    relevantSkills: SkillSummary[];
    userContext: string;
    memoryContext: string;
    compressionTier: CompressionTier;
}
export interface LearningStatus {
    totalSkills: number;
    totalUsageRecords: number;
    averageConfidence: number;
    recentEvaluations: EvaluationResult[];
    isPaused: boolean;
}
export declare class HermesBridge {
    readonly skills: SkillManager;
    readonly userModel: UserModelManager;
    readonly evaluator: Evaluator;
    readonly learner: Learner;
    readonly hygiene: ContextHygiene;
    readonly memory: MemoryManager;
    private paused;
    private recentEvaluations;
    private patternHistory;
    private maxEvaluationHistory;
    constructor(config: BridgeConfig);
    /** Called after each task completion — the core learning loop */
    onTaskComplete(context: TaskContext): Promise<OnTaskCompleteResult>;
    /** Called before each prompt — inject relevant context */
    prepareContext(prompt: string): Promise<PrepareContextResult>;
    /** Get system prompt additions (memory, user model, skills summary) */
    getPromptInjections(): string;
    /** Learning loop status */
    getStatus(): LearningStatus;
    /** Pause/resume learning */
    setPaused(paused: boolean): void;
    private extractPattern;
    private inferSkillName;
    private flush;
}
//# sourceMappingURL=index.d.ts.map
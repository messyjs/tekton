/**
 * Evaluator — Post-task outcome evaluation.
 * Determines task success, quality, and whether a skill should be extracted.
 */
import type { ToolResult } from "@tekton/tools";
import type { RoutingDecision } from "@tekton/core";
export interface AgentMessage {
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    toolCalls?: Array<{
        name: string;
        params: Record<string, unknown>;
    }>;
    toolResults?: ToolResult[];
}
export interface EvaluationConfig {
    minToolCallsForSkill: number;
    minPatternOccurrences: number;
    maxCorrectionsForLearning: number;
    qualityThresholds: {
        excellent: number;
        good: number;
        partial: number;
    };
}
export interface EvaluationResult {
    success: boolean;
    quality: "excellent" | "good" | "partial" | "failed";
    toolCallCount: number;
    hadErrors: boolean;
    hadUserCorrections: boolean;
    routingCorrect: boolean;
    compressionLossless: boolean;
    tokensUsed: number;
    skillsUsed: string[];
    shouldExtractSkill: boolean;
    extractionReason?: string;
    durationMs: number;
}
export declare class Evaluator {
    private config;
    constructor(config?: Partial<EvaluationConfig>);
    evaluate(context: {
        messages: AgentMessage[];
        toolResults: ToolResult[];
        routingDecision?: RoutingDecision;
        userCorrections: string[];
        startTime: number;
        endTime: number;
        patternHistory: Map<string, number>;
        tokensUsed?: number;
    }): EvaluationResult;
    private calculateSuccessScore;
    private scoreToQuality;
    private evaluateRouting;
    private shouldExtractSkill;
    private extractTaskDescription;
    private estimateTokens;
}
//# sourceMappingURL=evaluator.d.ts.map
/**
 * Evaluator — Post-task outcome evaluation.
 * Determines task success, quality, and whether a skill should be extracted.
 */
import type { ToolResult } from "@tekton/tools";
import type { RoutingDecision } from "@tekton/core";

export interface AgentMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: Array<{ name: string; params: Record<string, unknown> }>;
  toolResults?: ToolResult[];
}

export interface EvaluationConfig {
  minToolCallsForSkill: number;       // default 5
  minPatternOccurrences: number;       // default 3
  maxCorrectionsForLearning: number;   // default 10
  qualityThresholds: {
    excellent: number;  // default 0.9
    good: number;       // default 0.7
    partial: number;    // default 0.4
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

const DEFAULT_CONFIG: EvaluationConfig = {
  minToolCallsForSkill: 5,
  minPatternOccurrences: 3,
  maxCorrectionsForLearning: 10,
  qualityThresholds: {
    excellent: 0.9,
    good: 0.7,
    partial: 0.4,
  },
};

export class Evaluator {
  private config: EvaluationConfig;

  constructor(config?: Partial<EvaluationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    if (config?.qualityThresholds) {
      this.config.qualityThresholds = { ...DEFAULT_CONFIG.qualityThresholds, ...config.qualityThresholds };
    }
  }

  evaluate(context: {
    messages: AgentMessage[];
    toolResults: ToolResult[];
    routingDecision?: RoutingDecision;
    userCorrections: string[];
    startTime: number;
    endTime: number;
    patternHistory: Map<string, number>;
    tokensUsed?: number;
  }): EvaluationResult {
    const durationMs = context.endTime - context.startTime;

    // Count tool calls
    const toolCallCount = context.messages
      .filter(m => m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0)
      .reduce((sum, m) => sum + (m.toolCalls?.length ?? 0), 0);

    // Collect unique skill names used
    const skillsUsed = [...new Set(
      context.messages
        .filter(m => m.role === "assistant" && m.toolCalls)
        .flatMap(m => m.toolCalls?.map(tc => tc.name) ?? []),
    )];

    // Check for errors in tool results
    const hadErrors = context.toolResults.some(r => r.isError);

    // Check if user corrected the approach
    const hadUserCorrections = context.userCorrections.length > 0;

    // Check if routing was correct
    const routingCorrect = this.evaluateRouting(context.routingDecision, context.messages);

    // Check compression quality
    const compressionLossless = !hadErrors || context.toolResults.every(r => !r.isError);

    // Calculate tokens
    const tokensUsed = context.tokensUsed ?? this.estimateTokens(context.messages);

    // Determine success and quality
    const successScore = this.calculateSuccessScore({
      hadErrors,
      hadUserCorrections,
      toolCallCount,
      durationMs,
    });

    const quality = this.scoreToQuality(successScore);
    const success = successScore >= this.config.qualityThresholds.partial;

    // Determine if skill should be extracted
    const { shouldExtract, reason } = this.shouldExtractSkill({
      success,
      quality,
      toolCallCount,
      hadErrors,
      hadUserCorrections,
      taskDescription: this.extractTaskDescription(context.messages),
      patternHistory: context.patternHistory,
    });

    return {
      success,
      quality,
      toolCallCount,
      hadErrors,
      hadUserCorrections,
      routingCorrect,
      compressionLossless,
      tokensUsed,
      skillsUsed,
      shouldExtractSkill: shouldExtract,
      extractionReason: reason,
      durationMs,
    };
  }

  private calculateSuccessScore(params: {
    hadErrors: boolean;
    hadUserCorrections: boolean;
    toolCallCount: number;
    durationMs: number;
  }): number {
    let score = 0.7; // Base score assuming success

    if (params.hadErrors) score -= 0.2;
    if (params.hadUserCorrections) score -= 0.1;

    // Very fast completion is a positive signal
    if (params.durationMs < 5000 && params.toolCallCount <= 2) {
      score += 0.2;
    }

    // Many tool calls with errors is concerning
    if (params.toolCallCount > 10 && params.hadErrors) {
      score -= 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  private scoreToQuality(score: number): EvaluationResult["quality"] {
    const thresholds = this.config.qualityThresholds;
    if (score >= thresholds.excellent) return "excellent";
    if (score >= thresholds.good) return "good";
    if (score >= thresholds.partial) return "partial";
    return "failed";
  }

  private evaluateRouting(decision: RoutingDecision | undefined, messages: AgentMessage[]): boolean {
    if (!decision) return true;

    // If the task was simple and we used a fast model, routing was correct
    // If the task was complex and we used a deep model, routing was correct
    // If fast model was used but task needed deep model, routing was suboptimal
    const prompt = messages.find(m => m.role === "user")?.content ?? "";
    const isComplex = prompt.length > 500 || (prompt.match(/architect|debug|refactor|design|optimize/gi) ?? []).length > 0;

    if (isComplex && decision.reason.includes("fast")) return false;
    if (!isComplex && decision.reason.includes("deep")) return false;
    return true;
  }

  private shouldExtractSkill(params: {
    success: boolean;
    quality: string;
    toolCallCount: number;
    hadErrors: boolean;
    hadUserCorrections: boolean;
    taskDescription: string;
    patternHistory: Map<string, number>;
  }): { shouldExtract: boolean; reason?: string } {
    const { success, quality, toolCallCount, hadErrors, hadUserCorrections, taskDescription, patternHistory } = params;

    // Rule 1: Complex successful task (5+ tool calls, succeeded)
    if (success && toolCallCount >= this.config.minToolCallsForSkill) {
      return { shouldExtract: true, reason: `Complex successful task with ${toolCallCount} tool calls` };
    }

    // Rule 2: Error recovery (hit errors but eventually succeeded)
    if (success && hadErrors) {
      return { shouldExtract: true, reason: "Successful task with error recovery — capture the recovery path" };
    }

    // Rule 3: User corrections (capture corrections as skill updates)
    if (hadUserCorrections && quality !== "failed") {
      return { shouldExtract: true, reason: "User corrections captured — learn the corrected approach" };
    }

    // Rule 4: Recurring pattern (seen 3+ times without existing skill)
    if (taskDescription) {
      const occurrences = patternHistory.get(taskDescription) ?? 0;
      if (occurrences >= this.config.minPatternOccurrences) {
        return { shouldExtract: true, reason: `Pattern seen ${occurrences} times — extract as reusable skill` };
      }
    }

    // Rule 5: Excellent quality multi-step task
    if (quality === "excellent" && toolCallCount >= 3) {
      return { shouldExtract: true, reason: "Excellent multi-step task — preserve as high-quality skill" };
    }

    return { shouldExtract: false };
  }

  private extractTaskDescription(messages: AgentMessage[]): string {
    // Use first user message as task description
    const firstUser = messages.find(m => m.role === "user");
    if (firstUser) {
      return firstUser.content.slice(0, 100);
    }
    return "";
  }

  private estimateTokens(messages: AgentMessage[]): number {
    let total = 0;
    for (const msg of messages) {
      total += Math.ceil(msg.content.length / 4);
      if (msg.toolCalls) {
        total += Math.ceil(JSON.stringify(msg.toolCalls).length / 4);
      }
    }
    return total;
  }
}
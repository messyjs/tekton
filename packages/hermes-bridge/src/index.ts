/**
 * Bridge Orchestrator — Ties together SkillManager, UserModelManager, Evaluator, Learner, and ContextHygiene.
 * The main entry point for the Hermes Bridge learning loop.
 */
import { MemoryManager, type UserModel as CoreUserModel } from "@tekton/core";
import { estimateTokens, type CompressionTier } from "@tekton/core";
import type { ToolResult } from "@tekton/tools";
import { SkillManager, type SkillManagerConfig } from "./skill-manager.js";
import { UserModelManager } from "./user-model.js";
import { Evaluator, type EvaluationResult, type AgentMessage, type EvaluationConfig } from "./evaluator.js";
import { Learner } from "./learner.js";
import { ContextHygiene, type HygieneConfig, type HygieneRecommendation } from "./context-hygiene.js";
import type { Skill, SkillSummary } from "./skill-format.js";

export interface BridgeConfig {
  tektonHome: string;
  skillDirs?: string[];        // additional skill directories
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

export class HermesBridge {
  readonly skills: SkillManager;
  readonly userModel: UserModelManager;
  readonly evaluator: Evaluator;
  readonly learner: Learner;
  readonly hygiene: ContextHygiene;
  readonly memory: MemoryManager;

  private paused: boolean = false;
  private recentEvaluations: EvaluationResult[] = [];
  private patternHistory: Map<string, number> = new Map();
  private maxEvaluationHistory = 50;

  constructor(config: BridgeConfig) {
    const skillConfig: SkillManagerConfig = {
      primaryDir: `${config.tektonHome}/skills`,
      externalDirs: config.skillDirs ?? [],
    };

    this.skills = new SkillManager(skillConfig);
    this.userModel = new UserModelManager(`${config.tektonHome}/USER.md`);
    this.evaluator = new Evaluator(config.evaluationConfig);
    this.learner = new Learner(this.skills, this.userModel);
    this.hygiene = new ContextHygiene(config.hygieneConfig);
    this.memory = new MemoryManager(config.tektonHome);
  }

  /** Called after each task completion — the core learning loop */
  async onTaskComplete(context: TaskContext): Promise<OnTaskCompleteResult> {
    // Evaluate the task outcome
    const evaluation = this.evaluator.evaluate({
      messages: context.messages,
      toolResults: context.toolResults,
      routingDecision: context.routingDecision as any,
      userCorrections: context.userCorrections,
      startTime: context.startTime,
      endTime: context.endTime,
      patternHistory: this.patternHistory,
      tokensUsed: context.tokensUsed,
    });

    // Track pattern frequency
    const pattern = this.extractPattern(context.taskDescription);
    const currentCount = this.patternHistory.get(pattern) ?? 0;
    this.patternHistory.set(pattern, currentCount + 1);

    // Record task completion in user model
    this.userModel.recordTaskCompletion({
      description: context.taskDescription,
      timestamp: new Date().toISOString(),
      success: evaluation.success,
      toolCallCount: evaluation.toolCallCount,
      hadErrors: evaluation.hadErrors,
      skillsUsed: evaluation.skillsUsed,
    });

    // Record user corrections
    for (const correction of context.userCorrections) {
      this.userModel.recordCorrection("previous approach", correction);
    }

    // Determine if we should extract or refine a skill
    let newSkill: Skill | undefined;
    let refinedSkill: { name: string; update: import("./skill-format.js").SkillUpdate } | undefined;

    if (!this.paused && evaluation.shouldExtractSkill) {
      // Check if a similar skill already exists
      const skillName = this.inferSkillName(context.taskDescription);
      const existing = this.skills.getSkill(skillName);

      if (existing) {
        // Try to refine
        const update = this.learner.refineSkill(existing, {
          messages: context.messages,
          evaluation,
        });

        if (update) {
          const updated = this.skills.updateSkill(skillName, update);
          refinedSkill = { name: skillName, update };
        }
      } else {
        // Try to create a new skill
        const extracted = this.learner.extractSkill({
          messages: context.messages,
          evaluation,
          taskDescription: context.taskDescription,
        });
        newSkill = extracted ?? undefined;
      }
    }

    // Record skill usage confidence
    for (const skillUsed of evaluation.skillsUsed) {
      this.skills.recordUsage(skillUsed, evaluation.success);
    }

    // Get hygiene recommendations
    const turnCount = context.messages.filter(m => m.role === "user").length;
    const hygieneActions = this.hygiene.getRecommendations({
      messages: context.messages,
      contextWindow: 128000, // Default, should be configurable
      turnCount,
    });

    // Track evaluation
    this.recentEvaluations.push(evaluation);
    if (this.recentEvaluations.length > this.maxEvaluationHistory) {
      this.recentEvaluations.shift();
    }

    // Flush all state
    await this.flush();

    return {
      evaluation,
      newSkill,
      refinedSkill,
      hygieneActions,
    };
  }

  /** Called before each prompt — inject relevant context */
  async prepareContext(prompt: string): Promise<PrepareContextResult> {
    // Find relevant skills
    const allSkills = this.skills.listSkills();
    const relevantSkills = this.skills.searchSkills(prompt);

    // Sort by confidence (highest first)
    relevantSkills.sort((a, b) => (b.confidence ?? 0.5) - (a.confidence ?? 0.5));

    // Get user context
    const userContext = this.userModel.toPromptContext();

    // Get memory context
    const memoryContext = this.memory.getMemory();

    // Determine compression tier based on context size
    const totalContextTokens = estimateTokens(userContext + memoryContext + prompt);
    let compressionTier: CompressionTier;
    if (totalContextTokens < 2000) {
      compressionTier = "none";
    } else if (totalContextTokens < 5000) {
      compressionTier = "lite";
    } else if (totalContextTokens < 10000) {
      compressionTier = "full";
    } else {
      compressionTier = "ultra";
    }

    return {
      relevantSkills: relevantSkills.slice(0, 10), // Top 10
      userContext,
      memoryContext,
      compressionTier,
    };
  }

  /** Get system prompt additions (memory, user model, skills summary) */
  getPromptInjections(): string {
    const sections: string[] = [];

    // Memory context
    const memory = this.memory.getMemory();
    if (memory) {
      sections.push("## Memory\n" + memory);
    }

    // User model
    const userContext = this.userModel.toPromptContext();
    if (userContext) {
      sections.push(userContext);
    }

    // Skills summary
    const skills = this.skills.listSkills();
    if (skills.length > 0) {
      sections.push("## Available Skills\n" + skills.map(s => `- ${s.name}: ${s.description}`).join("\n"));
    }

    return sections.join("\n\n");
  }

  /** Learning loop status */
  getStatus(): LearningStatus {
    const skills = this.skills.listSkills();
    const confidences = skills.map(s => s.confidence ?? 0.5);
    const averageConfidence = confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

    return {
      totalSkills: skills.length,
      totalUsageRecords: this.patternHistory.size,
      averageConfidence,
      recentEvaluations: [...this.recentEvaluations],
      isPaused: this.paused,
    };
  }

  /** Pause/resume learning */
  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  // --- Private ---

  private extractPattern(description: string): string {
    let pattern = description.toLowerCase().trim();
    pattern = pattern.replace(/\/[^\s]+/g, "<path>");
    pattern = pattern.replace(/\b\w+\.\w{2,4}\b/g, "<file>");
    pattern = pattern.replace(/\b\d+\b/g, "<n>");
    pattern = pattern.replace(/"[^"]*"/g, "<str>");
    return pattern.slice(0, 80);
  }

  private inferSkillName(description: string): string {
    return description
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64);
  }

  private async flush(): Promise<void> {
    this.userModel.flush();
    await this.memory.flush();
  }
}
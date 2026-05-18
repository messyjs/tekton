/**
 * Bridge Orchestrator — Ties together SkillManager, UserModelManager, Evaluator, Learner, and ContextHygiene.
 * The main entry point for the Hermes Bridge learning loop.
 */
import { MemoryManager } from "@tekton/core";
import { estimateTokens } from "@tekton/core";
import { SkillManager } from "./skill-manager.js";
import { UserModelManager } from "./user-model.js";
import { Evaluator } from "./evaluator.js";
import { Learner } from "./learner.js";
import { ContextHygiene } from "./context-hygiene.js";
export class HermesBridge {
    skills;
    userModel;
    evaluator;
    learner;
    hygiene;
    memory;
    paused = false;
    recentEvaluations = [];
    patternHistory = new Map();
    maxEvaluationHistory = 50;
    constructor(config) {
        const skillConfig = {
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
    async onTaskComplete(context) {
        // Evaluate the task outcome
        const evaluation = this.evaluator.evaluate({
            messages: context.messages,
            toolResults: context.toolResults,
            routingDecision: context.routingDecision,
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
        let newSkill;
        let refinedSkill;
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
            }
            else {
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
    async prepareContext(prompt) {
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
        let compressionTier;
        if (totalContextTokens < 2000) {
            compressionTier = "none";
        }
        else if (totalContextTokens < 5000) {
            compressionTier = "lite";
        }
        else if (totalContextTokens < 10000) {
            compressionTier = "full";
        }
        else {
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
    getPromptInjections() {
        const sections = [];
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
    getStatus() {
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
    setPaused(paused) {
        this.paused = paused;
    }
    // --- Private ---
    extractPattern(description) {
        let pattern = description.toLowerCase().trim();
        pattern = pattern.replace(/\/[^\s]+/g, "<path>");
        pattern = pattern.replace(/\b\w+\.\w{2,4}\b/g, "<file>");
        pattern = pattern.replace(/\b\d+\b/g, "<n>");
        pattern = pattern.replace(/"[^"]*"/g, "<str>");
        return pattern.slice(0, 80);
    }
    inferSkillName(description) {
        return description
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 64);
    }
    async flush() {
        this.userModel.flush();
        await this.memory.flush();
    }
}
//# sourceMappingURL=index.js.map
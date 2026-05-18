/**
 * Learner — Skill extraction and refinement.
 * Analyzes conversations to identify reusable patterns and create/update skills.
 */
import type { Skill, SkillUpdate } from "./skill-format.js";
import type { SkillManager } from "./skill-manager.js";
import type { UserModelManager } from "./user-model.js";
import type { EvaluationResult, AgentMessage } from "./evaluator.js";
interface ExtractionContext {
    messages: AgentMessage[];
    evaluation: EvaluationResult;
    taskDescription: string;
}
export declare class Learner {
    private skillManager;
    private userModel;
    constructor(skillManager: SkillManager, userModel: UserModelManager);
    /**
     * Extract a skill from a successful task.
     * Returns null if the task is too simple or the skill already exists with high confidence.
     */
    extractSkill(context: ExtractionContext): Skill | null;
    /**
     * Refine an existing skill with a better approach.
     * Returns null if the new approach isn't better.
     */
    refineSkill(existing: Skill, newApproach: {
        messages: AgentMessage[];
        evaluation: EvaluationResult;
    }): SkillUpdate | null;
    /**
     * Determine if a new approach is better than the existing skill.
     */
    isBetterApproach(existing: Skill, newEval: EvaluationResult): boolean;
    /**
     * Force skill extraction from current session (for /tekton:learn force).
     */
    forceExtract(messages: AgentMessage[], description: string): Skill;
    private extractProcedure;
    private extractPitfalls;
    private extractVerification;
    private extractTags;
    private extractRequiredToolsets;
    private inferToolset;
    private inferCategory;
    private buildSkillBody;
}
export {};
//# sourceMappingURL=learner.d.ts.map
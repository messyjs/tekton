/**
 * Agent Router — Decide which tasks to delegate vs handle inline.
 * Complexity scoring, dependency tracking, result aggregation.
 */
import { scoreComplexity } from "../models/complexity.js";
import { DEFAULT_ROUTER_CONFIG } from "./types.js";
export class AgentRouter {
    config;
    decisionHistory = new Map();
    maxHistory = 500;
    constructor(config = {}) {
        this.config = { ...DEFAULT_ROUTER_CONFIG, ...config };
    }
    /**
     * Route a task — determine if it should be handled inline or delegated.
     */
    route(task, context) {
        // Check always-inline skills
        if (task.skillHint && this.config.alwaysInlineSkills.includes(task.skillHint)) {
            return this.makeDecision("inline", task, "Skill marked as always-inline", 0);
        }
        // Check always-delegate skills
        if (task.skillHint && this.config.alwaysDelegateSkills.includes(task.skillHint)) {
            return this.makeDecision("delegate", task, "Skill marked as always-delegate", 0.5);
        }
        // Calculate complexity
        const complexity = this.calculateComplexity(task, context);
        // Check dependency count — high dependency count → delegate
        const depCount = task.dependencies?.length ?? 0;
        if (depCount >= this.config.dependencyThreshold && complexity >= this.config.complexityThreshold) {
            return this.makeDecision("delegate", task, `High complexity (${complexity.toFixed(2)}) with ${depCount} dependencies`, complexity);
        }
        // Complexity-based routing
        if (complexity >= this.config.complexityThreshold) {
            return this.makeDecision("delegate", task, `Complexity ${complexity.toFixed(2)} ≥ threshold ${this.config.complexityThreshold}`, complexity);
        }
        // Low complexity or simple task → inline
        if (complexity <= 0.3) {
            return this.makeDecision("inline", task, `Complexity ${complexity.toFixed(2)} is low, handling inline`, complexity);
        }
        // Medium complexity — delegate if tools specified, otherwise inline
        if (task.tools && task.tools.length > 0) {
            return this.makeDecision("delegate", task, `Medium complexity with specific tools required`, complexity);
        }
        return this.makeDecision("inline", task, `Complexity ${complexity.toFixed(2)} in middle range, handling inline`, complexity);
    }
    /**
     * Aggregate results from multiple delegated sub-tasks.
     */
    aggregateResults(parentTaskId, results) {
        const overallStatus = this.determineOverallStatus(results.map(r => r.status));
        const summary = this.buildSummary(results);
        const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);
        const totalTokens = results.reduce((sum, r) => sum + (r.tokensUsed ?? 0), 0);
        return {
            taskId: parentTaskId,
            results: results.map(r => ({
                subtaskId: r.subtaskId,
                status: r.status,
                result: r.result,
                durationMs: r.durationMs,
            })),
            overallStatus,
            summary,
            totalDurationMs: totalDuration,
            totalTokensUsed: totalTokens,
        };
    }
    /**
     * Check if two tasks can run in parallel (no shared dependencies).
     */
    canRunParallel(a, b) {
        if (a.id === b.id)
            return false;
        const aDeps = new Set(a.dependencies ?? []);
        const bDeps = new Set(b.dependencies ?? []);
        // Can't run in parallel if one depends on the other
        if (aDeps.has(b.id) || bDeps.has(a.id))
            return false;
        // Both can run if all their dependencies are satisfied independently
        return true;
    }
    /**
     * Get routing decision history.
     */
    getHistory(limit) {
        const decisions = [...this.decisionHistory.values()];
        decisions.sort((a, b) => a.taskId.localeCompare(b.taskId));
        return decisions.slice(-(limit ?? 50));
    }
    // ── Private ─────────────────────────────────────────────────────
    calculateComplexity(task, context) {
        let score = 0;
        // Base score from description length
        const descLen = task.description.length;
        if (descLen > 200)
            score += 0.2;
        else if (descLen > 50)
            score += 0.1;
        // Skill hint — known skills reduce complexity
        if (task.skillHint) {
            score -= 0.15; // We know how to handle this
        }
        // Tools requirement — needing specific tools increases complexity
        if (task.tools && task.tools.length > 0) {
            score += Math.min(task.tools.length * 0.05, 0.2);
        }
        // Dependencies — more dependencies = more complex
        const depCount = task.dependencies?.length ?? 0;
        score += depCount * 0.1;
        // Context length adds complexity
        if (task.context) {
            score += Math.min(task.context.length / 500, 0.2);
        }
        // Use the existing complexity scorer if context provided
        if (context) {
            const fullContext = {
                prompt: task.description,
                tokenCount: task.description.length / 4,
                hasCodeBlocks: task.description.includes("```"),
                matchingSkills: task.skillHint ? [task.skillHint] : [],
                sessionComplexityHistory: [],
                ...context,
            };
            const modelScore = scoreComplexity(fullContext);
            // Blend the two scores
            score = score * 0.4 + modelScore * 0.6;
        }
        return Math.max(0.0, Math.min(1.0, score));
    }
    makeDecision(strategy, task, reason, complexityScore) {
        const decision = {
            strategy,
            taskId: task.id,
            reason,
            complexityScore,
            estimatedCost: this.estimateCost(strategy, task),
        };
        this.decisionHistory.set(task.id, decision);
        if (this.decisionHistory.size > this.maxHistory) {
            // Remove oldest entries
            const keys = [...this.decisionHistory.keys()];
            for (let i = 0; i < keys.length - this.maxHistory; i++) {
                this.decisionHistory.delete(keys[i]);
            }
        }
        return decision;
    }
    estimateCost(strategy, task) {
        if (strategy === "inline")
            return 0; // No additional cost
        // Estimate tokens for the task
        const estimatedTokens = task.description.length / 4 + (task.context?.length ?? 0) / 4;
        // Rough cost per 1K tokens for delegation
        return (estimatedTokens / 1000) * 0.003;
    }
    determineOverallStatus(statuses) {
        if (statuses.length === 0)
            return "error";
        if (statuses.every(s => s === "ok"))
            return "ok";
        if (statuses.some(s => s === "error"))
            return "error";
        return "partial";
    }
    buildSummary(results) {
        if (results.length === 1) {
            return results[0].result.slice(0, 500);
        }
        const ok = results.filter(r => r.status === "ok").length;
        const total = results.length;
        const failed = results.filter(r => r.status === "error");
        let summary = `${ok}/${total} sub-tasks completed successfully.`;
        if (failed.length > 0) {
            summary += ` ${failed.length} failed: ${failed.map(f => f.subtaskId).join(", ")}`;
        }
        return summary;
    }
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    getConfig() {
        return { ...this.config };
    }
}
//# sourceMappingURL=router.js.map
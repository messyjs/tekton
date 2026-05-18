import { loadLatestHandoff, formatAsContext } from "./handoff-loader.js";
// ── Reset Orchestrator ──────────────────────────────────────────────────────
export class ResetOrchestrator {
    sessionManager;
    projectDir;
    constructor(sessionManager, projectDir) {
        this.sessionManager = sessionManager;
        this.projectDir = projectDir;
    }
    /**
     * Reset and continue a session from where it left off.
     *
     * 1. Load latest handoff for this task card
     * 2. Format handoff as context for fresh agent
     * 3. Return reset context so the caller can spawn a new agent
     */
    async resetAndContinue(taskCard, role) {
        // Load latest handoff
        const handoff = loadLatestHandoff(this.projectDir, taskCard.id);
        if (!handoff) {
            return {
                handoff: null,
                context: taskCard.context || "No previous session found. Start fresh.",
            };
        }
        // Format handoff as injectable context
        const context = formatAsContext(handoff);
        return { handoff, context };
    }
}
//# sourceMappingURL=reset-orchestrator.js.map
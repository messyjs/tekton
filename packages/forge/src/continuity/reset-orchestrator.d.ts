/**
 * Reset Orchestrator — Handles session reset with handoff context.
 *
 * When a session hits its limit, the ResetOrchestrator:
 * 1. Loads the latest handoff for the task card
 * 2. Spawns a new agent with the handoff context
 * 3. Starts a new session
 * 4. Monitors the new session
 */
import type { TaskCard, RoleDefinition, SessionRecord, HandoffPackage } from "../types.js";
import type { SessionManager } from "./session-manager.js";
export interface AgentSpawner {
    spawnAgent(taskCard: TaskCard, role: RoleDefinition, context?: string): Promise<string>;
}
export interface SessionRunnerInterface {
    runSession(agentId: string, taskCard: TaskCard, role: RoleDefinition): Promise<SessionRecord>;
}
export declare class ResetOrchestrator {
    private sessionManager;
    private projectDir;
    constructor(sessionManager: SessionManager, projectDir: string);
    /**
     * Reset and continue a session from where it left off.
     *
     * 1. Load latest handoff for this task card
     * 2. Format handoff as context for fresh agent
     * 3. Return reset context so the caller can spawn a new agent
     */
    resetAndContinue(taskCard: TaskCard, role: RoleDefinition): Promise<{
        handoff: HandoffPackage | null;
        context: string;
    }>;
}
//# sourceMappingURL=reset-orchestrator.d.ts.map
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
import { loadLatestHandoff, formatAsContext } from "./handoff-loader.js";

// ── Agent Spawner Interface ─────────────────────────────────────────────────

export interface AgentSpawner {
  spawnAgent(taskCard: TaskCard, role: RoleDefinition, context?: string): Promise<string>;
}

// ── Session Runner Interface ───────────────────────────────────────────────

export interface SessionRunnerInterface {
  runSession(agentId: string, taskCard: TaskCard, role: RoleDefinition): Promise<SessionRecord>;
}

// ── Reset Orchestrator ──────────────────────────────────────────────────────

export class ResetOrchestrator {
  private sessionManager: SessionManager;
  private projectDir: string;

  constructor(sessionManager: SessionManager, projectDir: string) {
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
  async resetAndContinue(
    taskCard: TaskCard,
    role: RoleDefinition,
  ): Promise<{ handoff: HandoffPackage | null; context: string }> {
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
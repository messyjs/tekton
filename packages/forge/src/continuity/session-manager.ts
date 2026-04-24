/**
 * Session Manager — Monitors session budget, injects warnings,
 * and triggers graceful shutdown when sessions hit their limits.
 */
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";
import { ScribePool } from "./scribe-pool.js";
import type { TaskCard, HandoffPackage, FileChange } from "../types.js";
import type { Scribe } from "./scribe.js";

// ── Session Record ──────────────────────────────────────────────────────────

export interface TrackedSession {
  sessionId: string;
  taskCardId: string;
  role: string;
  layer: string;
  messageCount: number;
  maxMessages: number;
  startedAt: number;
  status: "active" | "warning" | "shutdown" | "completed";
  scribe: Scribe | null;
  warnings: string[];
}

// ── Session Manager Config ──────────────────────────────────────────────────

export interface SessionManagerConfig {
  /** Maximum total messages before forcing session shutdown */
  defaultLimit: number;
  /** Number of messages remaining to start warning */
  warningZone: number;
  /** Directory for storing handoff files */
  handoffDir?: string;
}

const DEFAULT_SESSION_MANAGER_CONFIG: SessionManagerConfig = {
  defaultLimit: 20,
  warningZone: 5,
};

// ── Session Manager ─────────────────────────────────────────────────────────

export class SessionManager {
  private trackedSessions: Map<string, TrackedSession> = new Map();
  private scribePool: ScribePool;
  private config: SessionManagerConfig;
  private handoffCallbacks: Array<(handoff: HandoffPackage, session: TrackedSession) => void> = [];

  constructor(scribePool: ScribePool, config?: Partial<SessionManagerConfig>) {
    this.scribePool = scribePool;
    this.config = { ...DEFAULT_SESSION_MANAGER_CONFIG, ...config };
  }

  /**
   * Start monitoring a session.
   * Assigns a Scribe from the pool based on the layer.
   */
  monitorSession(
    sessionId: string,
    taskCard: TaskCard,
    role: { id: string; sessionLimit?: number },
    layer: string,
  ): TrackedSession {
    const scribe = this.scribePool.getScribeForLayer(layer);

    const limit = role.sessionLimit ?? this.config.defaultLimit;

    const tracked: TrackedSession = {
      sessionId,
      taskCardId: taskCard.id,
      role: role.id,
      layer,
      messageCount: 0,
      maxMessages: limit,
      startedAt: Date.now(),
      status: "active",
      scribe,
      warnings: [],
    };

    this.trackedSessions.set(sessionId, tracked);

    // Start Scribe observing
    if (scribe) {
      scribe.observeSession(sessionId, taskCard, this.getProjectId(taskCard), 1);
    }

    return tracked;
  }

  /**
   * Increment message count for a session and check for warnings.
   * Returns a warning message if the session is approaching its limit.
   */
  onMessage(sessionId: string): { warning: string | null; shouldShutdown: boolean } {
    const tracked = this.trackedSessions.get(sessionId);
    if (!tracked) return { warning: null, shouldShutdown: false };

    tracked.messageCount++;
    const remaining = tracked.maxMessages - tracked.messageCount;

    // Check shutdown condition
    if (remaining <= 0) {
      tracked.status = "shutdown";
      return { warning: null, shouldShutdown: true };
    }

    // Check warning levels
    const warning = getWarningMessage(remaining);
    if (warning) {
      tracked.warnings.push(warning);
      if (remaining <= 3) {
        tracked.status = "warning";
      }
    }

    return { warning, shouldShutdown: false };
  }

  /**
   * Gracefully shutdown a session.
   * 1. Signal Scribe to finalize
   * 2. Collect handoff package
   * 3. Store handoff to disk
   * 4. Return handoff
   */
  async gracefulShutdown(sessionId: string): Promise<HandoffPackage> {
    const tracked = this.trackedSessions.get(sessionId);
    if (!tracked) {
      return this.emptyHandoff(sessionId);
    }

    // Finalize scribe
    let handoff: HandoffPackage;
    if (tracked.scribe) {
      handoff = await tracked.scribe.finalizeHandoff();
    } else {
      handoff = this.emptyHandoff(sessionId);
    }

    // Enrich with session metadata
    handoff = {
      ...handoff,
      sessionId,
      taskCardId: tracked.taskCardId,
    };

    // Store to disk
    this.storeHandoffToDisk(handoff);

    // Update status
    tracked.status = "completed";

    // Notify callbacks
    for (const cb of this.handoffCallbacks) {
      try {
        cb(handoff, tracked);
      } catch {
        // Callback errors are non-fatal
      }
    }

    return handoff;
  }

  /**
   * Register a callback for when a handoff is produced.
   */
  onHandoff(callback: (handoff: HandoffPackage, session: TrackedSession) => void): void {
    this.handoffCallbacks.push(callback);
  }

  /** Get a tracked session by ID */
  getSession(sessionId: string): TrackedSession | undefined {
    return this.trackedSessions.get(sessionId);
  }

  /** Get all tracked sessions */
  getAllSessions(): TrackedSession[] {
    return [...this.trackedSessions.values()];
  }

  /** Remove a tracked session */
  removeSession(sessionId: string): void {
    this.trackedSessions.delete(sessionId);
  }

  // ── Private helpers ───────────────────────────────────────────────

  private emptyHandoff(sessionId: string): HandoffPackage {
    return {
      sessionId,
      taskCardId: "",
      summary: "Session ended without scribe",
      completedWork: [],
      remainingWork: [],
      filesModified: [],
      importantDecisions: [],
      blockers: [],
      cavememObservations: [],
      nextSessionContext: "Previous session ended. Review files for current state.",
    };
  }

  private storeHandoffToDisk(handoff: HandoffPackage): void {
    const handoffDir = this.config.handoffDir ?? join(os.homedir(), ".tekton", "forge-projects", "handoffs");

    if (!existsSync(handoffDir)) {
      mkdirSync(handoffDir, { recursive: true });
    }

    const filename = `${handoff.taskCardId || handoff.sessionId}-${Date.now()}.json`;
    const filePath = join(handoffDir, filename);
    writeFileSync(filePath, JSON.stringify(handoff, null, 2), "utf-8");
  }

  private getProjectId(taskCard: TaskCard): string {
    return taskCard.planId || "unknown-project";
  }
}

// ── Warning System ──────────────────────────────────────────────────────────

/**
 * Get a warning message for remaining message count.
 * Returns null when no warning is needed.
 */
export function getWarningMessage(remaining: number): string | null {
  if (remaining === 3) {
    return "⚠️ SESSION CHECKPOINT: 3 messages remaining. Save all work in progress to files. Document your current state and what remains.";
  }
  if (remaining === 1) {
    return "⚠️ FINAL MESSAGE: Write your session summary now. List: (1) what you completed, (2) what remains, (3) any blockers, (4) which files were modified.";
  }
  if (remaining <= 0) {
    return null; // Session terminated, Scribe handles it
  }
  return null;
}
import { ScribePool } from "./scribe-pool.js";
import type { TaskCard, HandoffPackage } from "../types.js";
import type { Scribe } from "./scribe.js";
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
export interface SessionManagerConfig {
    /** Maximum total messages before forcing session shutdown */
    defaultLimit: number;
    /** Number of messages remaining to start warning */
    warningZone: number;
    /** Directory for storing handoff files */
    handoffDir?: string;
}
export declare class SessionManager {
    private trackedSessions;
    private scribePool;
    private config;
    private handoffCallbacks;
    constructor(scribePool: ScribePool, config?: Partial<SessionManagerConfig>);
    /**
     * Start monitoring a session.
     * Assigns a Scribe from the pool based on the layer.
     */
    monitorSession(sessionId: string, taskCard: TaskCard, role: {
        id: string;
        sessionLimit?: number;
    }, layer: string): TrackedSession;
    /**
     * Increment message count for a session and check for warnings.
     * Returns a warning message if the session is approaching its limit.
     */
    onMessage(sessionId: string): {
        warning: string | null;
        shouldShutdown: boolean;
    };
    /**
     * Gracefully shutdown a session.
     * 1. Signal Scribe to finalize
     * 2. Collect handoff package
     * 3. Store handoff to disk
     * 4. Return handoff
     */
    gracefulShutdown(sessionId: string): Promise<HandoffPackage>;
    /**
     * Register a callback for when a handoff is produced.
     */
    onHandoff(callback: (handoff: HandoffPackage, session: TrackedSession) => void): void;
    /** Get a tracked session by ID */
    getSession(sessionId: string): TrackedSession | undefined;
    /** Get all tracked sessions */
    getAllSessions(): TrackedSession[];
    /** Remove a tracked session */
    removeSession(sessionId: string): void;
    private emptyHandoff;
    private storeHandoffToDisk;
    private getProjectId;
}
/**
 * Get a warning message for remaining message count.
 * Returns null when no warning is needed.
 */
export declare function getWarningMessage(remaining: number): string | null;
//# sourceMappingURL=session-manager.d.ts.map
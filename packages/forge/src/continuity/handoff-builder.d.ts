/**
 * Handoff Builder — Constructs HandoffPackages from session data.
 */
import type { HandoffPackage, FileChange } from "../types.js";
import type { Scribe } from "./scribe.js";
export interface SessionRecordExtended {
    id: string;
    agentRole: string;
    taskCardId: string;
    messageCount: number;
    maxMessages: number;
    startedAt: number;
    endedAt?: number;
    status: string;
}
/**
 * Build a HandoffPackage from Scribe state and session data.
 */
export declare function buildHandoff(scribe: Scribe, session: SessionRecordExtended, fileChanges: FileChange[]): HandoffPackage;
//# sourceMappingURL=handoff-builder.d.ts.map
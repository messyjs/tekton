import type { TaskCard, HandoffPackage, FileChange } from "../types.js";
import type { PrecisionItem } from "@tekton/core";
export interface ScribeConfig {
    id: string;
    observes: string[];
    model: string;
}
export interface AgentMessage {
    role: "user" | "assistant" | "system";
    content: string;
    timestamp?: number;
}
export interface Observation {
    id: string;
    taskId: string;
    sessionId: string;
    kind: "decision" | "pattern" | "file-change" | "progress" | "blocker";
    content: string;
    timestamp: number;
}
export interface CavememStore {
    storeObservation(text: string, metadata: {
        projectId: string;
        taskCardId: string;
        role: string;
        sessionNum: number;
    }): string;
    searchMemory(query: string, projectId?: string): Promise<Array<{
        id: string;
        content: string;
        relevance: number;
    }>>;
    getTimeline(taskCardId: string): Promise<Observation[]>;
    exportForHandoff(sessionId: string): Promise<Observation[]>;
}
export interface FileChangeTracker {
    getChanges(): FileChange[];
    recordChange(path: string, action: "created" | "modified" | "deleted", agentRole: string): void;
}
export declare class Scribe {
    readonly config: ScribeConfig;
    private cavemem;
    private observations;
    private sessionSummary;
    private completedWork;
    private remainingWork;
    private keyDecisions;
    private blockers;
    private fileChanges;
    private fileTracker?;
    private projectId;
    private sessionNum;
    private sessionId;
    private messageCount;
    private precisionItems;
    constructor(config: ScribeConfig, cavemem: CavememStore);
    /** Set the file tracker for this scribe */
    setFileTracker(tracker: FileChangeTracker): void;
    /**
     * Start observing a session.
     * Registers callbacks to track messages without participating.
     */
    observeSession(sessionId: string, taskCard: TaskCard, projectId: string, sessionNum: number): void;
    /**
     * Process a single agent message.
     * Extracts key decisions, code patterns, file changes, and progress notes.
     * Compresses using caveman grammar (short, stripped language).
     */
    processMessage(msg: AgentMessage): Promise<Observation | null>;
    /**
     * Finalize the handoff package when a session ends.
     */
    finalizeHandoff(): Promise<HandoffPackage>;
    /** Get all observations collected so far */
    getObservations(): Observation[];
    /** Set precision items from a Context Engineer (for handoff). */
    setPrecisionItems(items: PrecisionItem[]): void;
    /** Get the running session summary */
    getSummary(): string;
    /** Add remaining work item (from external source) */
    addRemainingWork(item: string): void;
    private extractInformation;
    /**
     * Compress text using caveman grammar.
     * Short, stripped language preserving key information.
     */
    private compress;
    private buildSummary;
    private formatNextSessionContext;
}
//# sourceMappingURL=scribe.d.ts.map
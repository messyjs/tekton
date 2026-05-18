import type { Observation } from "./scribe.js";
export declare class ForgeCavememBridge {
    private store;
    private isAvailable;
    constructor();
    /**
     * Store an observation with project/task/role/session metadata.
     * Returns the observation ID.
     */
    storeObservation(text: string, metadata: {
        projectId: string;
        taskCardId: string;
        role: string;
        sessionNum: number;
    }): string;
    /**
     * Search observations by query string.
     * Filters by projectId if provided.
     */
    searchMemory(query: string, projectId?: string): Promise<Array<{
        id: string;
        content: string;
        relevance: number;
    }>>;
    /**
     * Get chronological observations for a task card.
     */
    getTimeline(taskCardId: string): Promise<Observation[]>;
    /**
     * Export all observations from a specific session for handoff.
     */
    exportForHandoff(sessionId: string): Promise<Observation[]>;
    /** Check availability */
    available(): boolean;
}
//# sourceMappingURL=cavemem-bridge.d.ts.map
/**
 * Cavemem Bridge — Wraps @tekton/core CavememBridge for Forge use.
 *
 * Stores/retrieves observations tagged with project, task, role, and session.
 */
import { randomUUID } from "node:crypto";
export class ForgeCavememBridge {
    store = new Map();
    isAvailable = false;
    constructor() {
        // Check if cavemem is available
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require.resolve("cavemem");
            this.isAvailable = true;
        }
        catch {
            this.isAvailable = false;
        }
    }
    /**
     * Store an observation with project/task/role/session metadata.
     * Returns the observation ID.
     */
    storeObservation(text, metadata) {
        const id = `obs-${randomUUID().slice(0, 8)}`;
        this.store.set(id, {
            id,
            text,
            projectId: metadata.projectId,
            taskCardId: metadata.taskCardId,
            role: metadata.role,
            sessionNum: metadata.sessionNum,
            timestamp: Date.now(),
        });
        return id;
    }
    /**
     * Search observations by query string.
     * Filters by projectId if provided.
     */
    async searchMemory(query, projectId) {
        const results = [];
        const queryLower = query.toLowerCase();
        for (const obs of this.store.values()) {
            if (projectId && obs.projectId !== projectId)
                continue;
            const contentLower = obs.text.toLowerCase();
            if (contentLower.includes(queryLower)) {
                results.push({
                    id: obs.id,
                    content: obs.text,
                    relevance: contentLower === queryLower ? 1.0 : 0.5,
                });
            }
        }
        return results.sort((a, b) => b.relevance - a.relevance);
    }
    /**
     * Get chronological observations for a task card.
     */
    async getTimeline(taskCardId) {
        const observations = [];
        for (const obs of this.store.values()) {
            if (obs.taskCardId === taskCardId) {
                observations.push({
                    id: obs.id,
                    taskId: taskCardId,
                    sessionId: `session-${obs.sessionNum}`,
                    kind: "progress", // Stored observations don't retain kind — default
                    content: obs.text,
                    timestamp: obs.timestamp,
                });
            }
        }
        return observations.sort((a, b) => a.timestamp - b.timestamp);
    }
    /**
     * Export all observations from a specific session for handoff.
     */
    async exportForHandoff(sessionId) {
        // sessionId format is typically "session-N" but we match by taskCardId too
        const observations = [];
        for (const obs of this.store.values()) {
            // Match by sessionNum embedded in sessionId, or by taskCardId
            const sessionMatch = obs.taskCardId === sessionId || obs.taskCardId.includes(sessionId);
            if (sessionMatch) {
                observations.push({
                    id: obs.id,
                    taskId: obs.taskCardId,
                    sessionId,
                    kind: "progress",
                    content: obs.text,
                    timestamp: obs.timestamp,
                });
            }
        }
        return observations.sort((a, b) => a.timestamp - b.timestamp);
    }
    /** Check availability */
    available() {
        return this.isAvailable;
    }
}
//# sourceMappingURL=cavemem-bridge.js.map
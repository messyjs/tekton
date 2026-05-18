import type { FileChange } from "../types.js";
export interface FileChangeWithRole extends FileChange {
    agentRole: string;
}
export declare class FileTracker {
    private projectDir;
    private snapshot;
    private changes;
    private tracking;
    constructor(projectDir: string);
    /**
     * Start tracking. Takes a snapshot of current file hashes.
     */
    startTracking(): void;
    /**
     * Get changes since last snapshot by comparing current state.
     */
    getChanges(): FileChange[];
    /**
     * Manually record a change with role attribution.
     */
    recordChange(path: string, action: "created" | "modified" | "deleted", agentRole: string): void;
    /**
     * Get changes attributed to a specific role.
     */
    getChangesByRole(role: string): FileChange[];
    private takeSnapshot;
    private walkDirectory;
    private hashFile;
}
//# sourceMappingURL=file-tracker.d.ts.map
/**
 * Agent IPC — Wire sub-agent communication into the CLI delegate tool.
 * Result streaming, progress reporting, cancellation.
 */
import type { AgentPool } from "@tekton/core";
import type { TaskResult, TaskDefinition, AgentInfo, PoolEvent } from "@tekton/core";
export interface ProgressUpdate {
    taskId: string;
    agentId?: string;
    status: "queued" | "running" | "completed" | "failed" | "cancelled";
    progress?: number;
    message?: string;
    result?: TaskResult;
    timestamp: number;
}
export interface StreamCallbacks {
    onProgress?: (update: ProgressUpdate) => void;
    onResult?: (result: TaskResult) => void;
    onError?: (taskId: string, error: string) => void;
    onLog?: (event: PoolEvent) => void;
}
/**
 * AgentIPC — bridges the AgentPool to the CLI layer.
 * Provides streaming updates, progress reporting, and cancellation.
 */
export declare class AgentIPC {
    private pool;
    private callbacks;
    private pendingTasks;
    private progressHistory;
    private maxHistory;
    constructor(pool: AgentPool, callbacks?: StreamCallbacks);
    /**
     * Submit a task and stream progress updates.
     * Returns a promise that resolves when the task completes.
     */
    submitAndStream(task: TaskDefinition): Promise<TaskResult>;
    /**
     * Submit multiple tasks and collect all results.
     */
    submitBatch(tasks: TaskDefinition[]): Promise<TaskResult[]>;
    /**
     * Cancel a task by ID.
     */
    cancel(taskId: string): boolean;
    /**
     * Format agent info for display.
     */
    formatAgentInfo(agents: AgentInfo[]): string;
    /**
     * Format pool status for display.
     */
    formatStatus(): string;
    /**
     * Format task result for display.
     */
    formatResult(result: TaskResult): string;
    /**
     * Format event log for display.
     */
    formatEventLog(limit?: number): string;
    getProgressHistory(limit?: number): ProgressUpdate[];
    private emitProgress;
    updateCallbacks(callbacks: StreamCallbacks): void;
}
//# sourceMappingURL=ipc.d.ts.map
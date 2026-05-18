/**
 * Task Queue — Priority queue for pending sub-agent tasks.
 * FIFO with priority hints; concurrency limits.
 */
import type { TaskDefinition, TaskStatus } from "./types.js";
export declare class TaskQueue {
    private queue;
    private running;
    private completed;
    private concurrencyLimit;
    private _onTaskReady;
    constructor(concurrencyLimit?: number);
    setConcurrencyLimit(limit: number): void;
    getConcurrencyLimit(): number;
    onTaskReady(callback: (task: TaskDefinition) => void): void;
    enqueue(task: TaskDefinition): string;
    dequeue(): TaskDefinition | undefined;
    complete(taskId: string): void;
    fail(taskId: string, retry?: boolean): boolean;
    cancel(taskId: string): boolean;
    getPending(): TaskDefinition[];
    getRunning(): TaskDefinition[];
    getCompleted(): TaskDefinition[];
    getTask(taskId: string): TaskDefinition | undefined;
    getStatus(taskId: string): TaskStatus;
    get size(): number;
    get activeCount(): number;
    get isIdle(): boolean;
    private areDependenciesMet;
    private schedule;
    clear(): void;
    /** Remove completed tasks older than maxAgeMs */
    purgeCompleted(maxAgeMs?: number): number;
}
//# sourceMappingURL=queue.d.ts.map
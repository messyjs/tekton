/**
 * Parallel Executor — Runs tasks with bounded concurrency.
 */
export declare class ParallelExecutor {
    private maxConcurrency;
    constructor(maxConcurrency: number);
    /**
     * Execute all tasks with bounded concurrency.
     * Returns results in original order.
     * If one task fails, others continue; failed results are Error objects.
     */
    executeAll<T>(tasks: Array<() => Promise<T>>): Promise<Array<T | Error>>;
}
//# sourceMappingURL=parallel-executor.d.ts.map
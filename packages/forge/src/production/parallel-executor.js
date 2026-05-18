/**
 * Parallel Executor — Runs tasks with bounded concurrency.
 */
export class ParallelExecutor {
    maxConcurrency;
    constructor(maxConcurrency) {
        this.maxConcurrency = maxConcurrency;
    }
    /**
     * Execute all tasks with bounded concurrency.
     * Returns results in original order.
     * If one task fails, others continue; failed results are Error objects.
     */
    async executeAll(tasks) {
        const results = new Array(tasks.length);
        let nextIndex = 0;
        async function runNext() {
            while (nextIndex < tasks.length) {
                const index = nextIndex++;
                try {
                    results[index] = await tasks[index]();
                }
                catch (e) {
                    results[index] = e instanceof Error ? e : new Error(String(e));
                }
            }
        }
        // Start up to maxConcurrency workers
        const workers = [];
        const workerCount = Math.min(this.maxConcurrency, tasks.length);
        for (let i = 0; i < workerCount; i++) {
            workers.push(runNext());
        }
        await Promise.all(workers);
        return results;
    }
}
//# sourceMappingURL=parallel-executor.js.map
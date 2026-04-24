/**
 * Parallel Executor — Runs tasks with bounded concurrency.
 */
export class ParallelExecutor {
  private maxConcurrency: number;

  constructor(maxConcurrency: number) {
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Execute all tasks with bounded concurrency.
   * Returns results in original order.
   * If one task fails, others continue; failed results are Error objects.
   */
  async executeAll<T>(tasks: Array<() => Promise<T>>): Promise<Array<T | Error>> {
    const results: Array<T | Error> = new Array(tasks.length);
    let nextIndex = 0;

    async function runNext(): Promise<void> {
      while (nextIndex < tasks.length) {
        const index = nextIndex++;
        try {
          results[index] = await tasks[index]();
        } catch (e) {
          results[index] = e instanceof Error ? e : new Error(String(e));
        }
      }
    }

    // Start up to maxConcurrency workers
    const workers: Promise<void>[] = [];
    const workerCount = Math.min(this.maxConcurrency, tasks.length);

    for (let i = 0; i < workerCount; i++) {
      workers.push(runNext());
    }

    await Promise.all(workers);

    return results;
  }
}
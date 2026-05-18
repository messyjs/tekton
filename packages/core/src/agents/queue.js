export class TaskQueue {
    queue = [];
    running = new Map();
    completed = new Map();
    concurrencyLimit;
    _onTaskReady = null;
    constructor(concurrencyLimit = 4) {
        this.concurrencyLimit = concurrencyLimit;
    }
    // ── Configuration ──────────────────────────────────────────────
    setConcurrencyLimit(limit) {
        this.concurrencyLimit = limit;
    }
    getConcurrencyLimit() {
        return this.concurrencyLimit;
    }
    onTaskReady(callback) {
        this._onTaskReady = callback;
    }
    // ── Enqueue ────────────────────────────────────────────────────
    enqueue(task) {
        const queued = {
            task: { ...task },
            enqueuedAt: Date.now(),
            retryCount: 0,
        };
        // Insert sorted by priority (high first, then normal, then low)
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const taskPriority = priorityOrder[task.priority] ?? 1;
        let insertIdx = this.queue.length;
        for (let i = 0; i < this.queue.length; i++) {
            const existingPriority = priorityOrder[this.queue[i].task.priority] ?? 1;
            if (taskPriority < existingPriority) {
                insertIdx = i;
                break;
            }
        }
        this.queue.splice(insertIdx, 0, queued);
        // Notify that a task is ready (but don't auto-dispatch)
        if (this._onTaskReady) {
            this._onTaskReady(task);
        }
        return task.id;
    }
    // ── Dequeue ────────────────────────────────────────────────────
    dequeue() {
        // Only dequeue if under concurrency limit
        if (this.running.size >= this.concurrencyLimit)
            return undefined;
        // Find first task whose dependencies are satisfied
        for (let i = 0; i < this.queue.length; i++) {
            const queued = this.queue[i];
            if (this.areDependenciesMet(queued.task)) {
                this.queue.splice(i, 1);
                this.running.set(queued.task.id, queued);
                // Update status
                queued.task = { ...queued.task };
                if (this._onTaskReady) {
                    this._onTaskReady(queued.task);
                }
                return queued.task;
            }
        }
        return undefined;
    }
    // ── Task completion ────────────────────────────────────────────
    complete(taskId) {
        const queued = this.running.get(taskId);
        if (queued) {
            this.running.delete(taskId);
            this.completed.set(taskId, queued.task);
            this.schedule();
        }
    }
    fail(taskId, retry = true) {
        const queued = this.running.get(taskId);
        if (!queued)
            return false;
        if (retry && queued.retryCount < 3) {
            // Move back to queue with incremented retry count
            queued.retryCount++;
            this.running.delete(taskId);
            this.queue.unshift(queued); // Re-queue at front
            this.schedule();
            return true;
        }
        // No more retries
        this.running.delete(taskId);
        return false;
    }
    cancel(taskId) {
        // Check in queue
        const queueIdx = this.queue.findIndex(q => q.task.id === taskId);
        if (queueIdx !== -1) {
            this.queue.splice(queueIdx, 1);
            return true;
        }
        // Check in running
        if (this.running.has(taskId)) {
            this.running.delete(taskId);
            return true;
        }
        return false;
    }
    // ── Query ──────────────────────────────────────────────────────
    getPending() {
        return this.queue.map(q => q.task);
    }
    getRunning() {
        return [...this.running.values()].map(q => q.task);
    }
    getCompleted() {
        return [...this.completed.values()];
    }
    getTask(taskId) {
        // Check in queue
        const queued = this.queue.find(q => q.task.id === taskId);
        if (queued)
            return queued.task;
        // Check in running
        const running = this.running.get(taskId);
        if (running)
            return running.task;
        // Check in completed
        return this.completed.get(taskId);
    }
    getStatus(taskId) {
        if (this.running.has(taskId))
            return "running";
        if (this.queue.some(q => q.task.id === taskId))
            return "queued";
        if (this.completed.has(taskId))
            return "completed";
        return "pending";
    }
    get size() {
        return this.queue.length;
    }
    get activeCount() {
        return this.running.size;
    }
    get isIdle() {
        return this.queue.length === 0 && this.running.size === 0;
    }
    // ── Dependency tracking ─────────────────────────────────────────
    areDependenciesMet(task) {
        if (!task.dependencies || task.dependencies.length === 0)
            return true;
        for (const depId of task.dependencies) {
            if (!this.completed.has(depId))
                return false;
        }
        return true;
    }
    // ── Scheduling ─────────────────────────────────────────────────
    schedule() {
        // Scheduling is handled by the AgentPool, not the queue itself.
        // The queue just tracks tasks; the pool calls dequeue() to get the next task.
    }
    // ── Maintenance ────────────────────────────────────────────────
    clear() {
        this.queue.length = 0;
        this.running.clear();
        this.completed.clear();
    }
    /** Remove completed tasks older than maxAgeMs */
    purgeCompleted(maxAgeMs = 300000) {
        const cutoff = Date.now() - maxAgeMs;
        let purged = 0;
        for (const [id, task] of this.completed) {
            if (task.createdAt < cutoff) {
                this.completed.delete(id);
                purged++;
            }
        }
        return purged;
    }
}
//# sourceMappingURL=queue.js.map
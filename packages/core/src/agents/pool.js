/**
 * Agent Pool — Manage concurrent sub-agent sessions.
 * Spawn, track, kill agents; lifecycle hooks.
 *
 * When an AgentLLMBridge is provided, spawned agents use real LLM execution.
 * Without a bridge, agents fall back to simulation mode.
 */
import { randomUUID } from "node:crypto";
import { AgentSession } from "./session.js";
import { AgentRouter } from "./router.js";
import { AgentLLMBridge } from "./agent-llm-bridge.js";
import { TaskQueue } from "./queue.js";
import { ContextEngineer } from "./context-engineer.js";
import { KnowledgeLibrarian } from "../knowledge/librarian.js";
import { KnowledgeIndexStore } from "../knowledge/index-store.js";
import { DEFAULT_KNOWLEDGE_CONFIG } from "../knowledge/types.js";
import { DEFAULT_POOL_CONFIG } from "./types.js";
export class AgentPool {
    agents = new Map();
    queue;
    router;
    config;
    hooks;
    eventLog = [];
    maxEventLog = 500;
    idleTimer = null;
    results = new Map();
    // Phase 14: Real LLM execution
    modelRouter;
    toolExecutor;
    // Phase 18: Context Engineer
    contextEngineerConfig;
    // Phase 18: Knowledge Librarian
    knowledgeLibrarian;
    knowledgeStore;
    constructor(config = {}, hooks = {}, modelRouter, toolExecutor, contextEngineerConfig, knowledgeConfig) {
        this.config = { ...DEFAULT_POOL_CONFIG, ...config };
        this.hooks = hooks;
        this.modelRouter = modelRouter ?? null;
        this.toolExecutor = toolExecutor ?? null;
        this.contextEngineerConfig = contextEngineerConfig ?? null;
        this.knowledgeLibrarian = null;
        this.knowledgeStore = null;
        // Initialize Knowledge Librarian if configured
        if (knowledgeConfig && knowledgeConfig.enabled) {
            const storeConfig = { ...DEFAULT_KNOWLEDGE_CONFIG, ...knowledgeConfig };
            this.knowledgeStore = new KnowledgeIndexStore(storeConfig);
            this.knowledgeLibrarian = new KnowledgeLibrarian(storeConfig, this.knowledgeStore);
        }
        this.queue = new TaskQueue(this.config.concurrencyLimit);
        this.router = new AgentRouter();
        // When a task becomes ready from the queue, dispatch it
        this.queue.onTaskReady((task) => {
            this.dispatchTask(task);
        });
    }
    // ── Agent lifecycle ─────────────────────────────────────────────
    /**
     * Spawn a new agent into the pool.
     * If modelRouter is configured, creates AgentLLMBridge for real execution.
     */
    async spawn(sessionConfig) {
        if (this.agents.size >= this.config.maxAgents) {
            this.emitEvent({ type: "pool_full" });
            throw new Error(`Agent pool is full (max: ${this.config.maxAgents})`);
        }
        const id = sessionConfig?.agentId ?? randomUUID();
        // Create AgentLLMBridge if modelRouter is available
        let bridge;
        if (this.modelRouter) {
            bridge = new AgentLLMBridge(this.modelRouter, this.toolExecutor ?? undefined);
        }
        const config = {
            agentId: id,
            name: sessionConfig?.name ?? `agent-${id.slice(0, 8)}`,
            allowedTools: sessionConfig?.allowedTools ?? [],
            skillHints: sessionConfig?.skillHints ?? [],
            maxTokenBudget: sessionConfig?.maxTokenBudget ?? this.config.taskTimeoutMs,
            timeoutMs: sessionConfig?.timeoutMs ?? this.config.taskTimeoutMs,
            metadata: sessionConfig?.metadata,
        };
        // Create ContextEngineer if configured
        let contextEngineer;
        if (this.contextEngineerConfig && this.contextEngineerConfig.enabled) {
            contextEngineer = new ContextEngineer(this.contextEngineerConfig);
        }
        const session = new AgentSession(config, bridge, contextEngineer, this.knowledgeLibrarian?.constructor ? undefined : undefined);
        // Set knowledge librarian if available
        if (this.knowledgeLibrarian) {
            session.setKnowledgeLibrarian(this.knowledgeLibrarian);
        }
        await session.start(this.hooks);
        this.agents.set(id, session);
        this.emitEvent({ type: "agent_spawned", agentId: id });
        return id;
    }
    /**
     * Kill an agent in the pool.
     */
    async kill(agentId, reason = "manual kill") {
        const session = this.agents.get(agentId);
        if (!session)
            return false;
        await session.kill(reason, this.hooks);
        this.agents.delete(agentId);
        this.emitEvent({ type: "agent_killed", agentId, reason });
        return true;
    }
    /**
     * Kill all agents in the pool.
     */
    async killAll(reason = "pool shutdown") {
        const agentIds = [...this.agents.keys()];
        for (const id of agentIds) {
            await this.kill(id, reason);
        }
    }
    // ── Task submission ─────────────────────────────────────────────
    /**
     * Submit a task to the pool. Returns the task ID.
     * The router decides whether to handle inline or delegate.
     */
    submitTask(task) {
        // Route the task
        const decision = this.router.route(task);
        if (decision.strategy === "inline") {
            // Queue for inline processing (will be picked up by next available agent or main thread)
            task = { ...task, priority: task.priority };
        }
        // Enqueue the task
        const taskId = this.queue.enqueue(task);
        this.emitEvent({ type: "task_queued", taskId, agentId: undefined });
        return { taskId, strategy: decision.strategy };
    }
    /**
     * Submit multiple tasks. Tasks with dependencies will be tracked.
     */
    submitBatch(tasks) {
        return tasks.map(task => this.submitTask(task));
    }
    /**
     * Cancel a pending or running task.
     */
    cancelTask(taskId) {
        return this.queue.cancel(taskId);
    }
    // ── Task execution ──────────────────────────────────────────────
    /**
     * Dispatch a task to an available agent.
     * Called internally when a task becomes ready from the queue.
     */
    async dispatchTask(task) {
        // Find an available agent
        const availableAgent = this.findAvailableAgent(task);
        if (!availableAgent) {
            // No agent available; if we can spawn one, do so
            if (this.agents.size < this.config.maxAgents) {
                const agentId = await this.spawn({
                    skillHints: task.skillHint ? [task.skillHint] : [],
                    allowedTools: task.tools ?? [],
                });
                const newAgent = this.agents.get(agentId);
                this.executeOnAgent(task, newAgent);
            }
            // Otherwise, task stays in queue until an agent becomes free
            return;
        }
        this.executeOnAgent(task, availableAgent);
    }
    /**
     * Execute a task on a specific agent and manage the lifecycle.
     */
    async executeOnAgent(task, agent) {
        this.emitEvent({ type: "task_started", taskId: task.id, agentId: agent.id });
        try {
            const result = await agent.executeTask(task, this.hooks);
            // Store the result
            this.results.set(task.id, result);
            this.queue.complete(task.id);
            this.emitEvent({ type: "task_completed", taskId: task.id, agentId: agent.id, status: result.status });
            // If agent is now idle, try to dispatch next task
            if (agent.isIdle()) {
                this.tryDispatchNext();
            }
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            this.queue.fail(task.id, true); // Retry if possible
            this.emitEvent({ type: "task_failed", taskId: task.id, agentId: agent.id, error: errorMessage });
        }
    }
    /**
     * Try to dispatch the next queued task to an available agent.
     */
    tryDispatchNext() {
        const pending = this.queue.getPending();
        for (const task of pending) {
            const agent = this.findAvailableAgent(task);
            if (agent) {
                this.queue.dequeue(); // Will be dispatched by the onTaskReady callback
            }
        }
    }
    // ── Agent lookup ────────────────────────────────────────────────
    findAvailableAgent(task) {
        // Prefer agents whose skill hints match the task
        if (task?.skillHint) {
            for (const agent of this.agents.values()) {
                if (agent.isIdle() && agent.config.skillHints.includes(task.skillHint)) {
                    return agent;
                }
            }
        }
        // Fall back to any idle agent
        for (const agent of this.agents.values()) {
            if (agent.isIdle())
                return agent;
        }
        return null;
    }
    // ── Query ────────────────────────────────────────────────────────
    getAgentInfo() {
        return [...this.agents.values()].map(a => a.getInfo());
    }
    getAgent(agentId) {
        return this.agents.get(agentId);
    }
    getTaskResult(taskId) {
        return this.results.get(taskId);
    }
    getStatus() {
        const agents = [...this.agents.values()];
        return {
            totalAgents: agents.length,
            activeAgents: agents.filter(a => a.isBusy()).length,
            idleAgents: agents.filter(a => a.isIdle()).length,
            pendingTasks: this.queue.size,
            runningTasks: this.queue.activeCount,
            completedTasks: this.queue.getCompleted().length,
        };
    }
    getRouter() {
        return this.router;
    }
    getQueue() {
        return this.queue;
    }
    getEventLog(limit) {
        return this.eventLog.slice(-(limit ?? 100));
    }
    // ── Idle management ─────────────────────────────────────────────
    /**
     * Start monitoring for idle agents and clean them up.
     */
    startIdleMonitor() {
        if (this.idleTimer)
            return;
        this.idleTimer = setInterval(() => {
            const now = Date.now();
            for (const [id, agent] of this.agents) {
                const info = agent.getInfo();
                if (agent.isIdle() && (now - info.lastActivityAt) > this.config.idleTimeoutMs) {
                    this.kill(id, "idle timeout");
                }
            }
        }, 10000); // Check every 10 seconds
    }
    /**
     * Stop monitoring for idle agents.
     */
    stopIdleMonitor() {
        if (this.idleTimer) {
            clearInterval(this.idleTimer);
            this.idleTimer = null;
        }
    }
    // ── Shutdown ────────────────────────────────────────────────────
    /**
     * Gracefully shut down the pool: complete running tasks, kill all agents.
     */
    async shutdown() {
        this.stopIdleMonitor();
        // Wait for running tasks (with timeout)
        const shutdownTimeout = 5000;
        const startTime = Date.now();
        while (this.queue.activeCount > 0 && (Date.now() - startTime) < shutdownTimeout) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        await this.killAll("pool shutdown");
        this.queue.clear();
        this.results.clear();
        this.eventLog.length = 0;
    }
    // ── Private ──────────────────────────────────────────────────────
    emitEvent(event) {
        this.eventLog.push(event);
        if (this.eventLog.length > this.maxEventLog) {
            this.eventLog = this.eventLog.slice(-this.maxEventLog);
        }
    }
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        this.queue.setConcurrencyLimit(this.config.concurrencyLimit);
    }
    getConfig() {
        return { ...this.config };
    }
}
//# sourceMappingURL=pool.js.map
import { AgentSession, type SessionConfig } from "./session.js";
import { AgentRouter } from "./router.js";
import { type ToolExecutor } from "./agent-llm-bridge.js";
import { TaskQueue } from "./queue.js";
import type { PoolConfig, PoolEvent, AgentInfo, TaskDefinition, TaskResult, LifecycleHooks, RoutingStrategy, ContextEngineerConfig } from "./types.js";
import type { ModelRouter } from "../models/router.js";
export interface PoolStatus {
    totalAgents: number;
    activeAgents: number;
    idleAgents: number;
    pendingTasks: number;
    runningTasks: number;
    completedTasks: number;
}
export declare class AgentPool {
    private agents;
    private queue;
    private router;
    private config;
    private hooks;
    private eventLog;
    private maxEventLog;
    private idleTimer;
    private results;
    private modelRouter;
    private toolExecutor;
    private contextEngineerConfig;
    private knowledgeLibrarian;
    private knowledgeStore;
    constructor(config?: Partial<PoolConfig>, hooks?: LifecycleHooks, modelRouter?: ModelRouter, toolExecutor?: ToolExecutor, contextEngineerConfig?: ContextEngineerConfig, knowledgeConfig?: any);
    /**
     * Spawn a new agent into the pool.
     * If modelRouter is configured, creates AgentLLMBridge for real execution.
     */
    spawn(sessionConfig?: Partial<SessionConfig>): Promise<string>;
    /**
     * Kill an agent in the pool.
     */
    kill(agentId: string, reason?: string): Promise<boolean>;
    /**
     * Kill all agents in the pool.
     */
    killAll(reason?: string): Promise<void>;
    /**
     * Submit a task to the pool. Returns the task ID.
     * The router decides whether to handle inline or delegate.
     */
    submitTask(task: TaskDefinition): {
        taskId: string;
        strategy: RoutingStrategy;
    };
    /**
     * Submit multiple tasks. Tasks with dependencies will be tracked.
     */
    submitBatch(tasks: TaskDefinition[]): Array<{
        taskId: string;
        strategy: RoutingStrategy;
    }>;
    /**
     * Cancel a pending or running task.
     */
    cancelTask(taskId: string): boolean;
    /**
     * Dispatch a task to an available agent.
     * Called internally when a task becomes ready from the queue.
     */
    private dispatchTask;
    /**
     * Execute a task on a specific agent and manage the lifecycle.
     */
    private executeOnAgent;
    /**
     * Try to dispatch the next queued task to an available agent.
     */
    private tryDispatchNext;
    private findAvailableAgent;
    getAgentInfo(): AgentInfo[];
    getAgent(agentId: string): AgentSession | undefined;
    getTaskResult(taskId: string): TaskResult | undefined;
    getStatus(): PoolStatus;
    getRouter(): AgentRouter;
    getQueue(): TaskQueue;
    getEventLog(limit?: number): PoolEvent[];
    /**
     * Start monitoring for idle agents and clean them up.
     */
    startIdleMonitor(): void;
    /**
     * Stop monitoring for idle agents.
     */
    stopIdleMonitor(): void;
    /**
     * Gracefully shut down the pool: complete running tasks, kill all agents.
     */
    shutdown(): Promise<void>;
    private emitEvent;
    updateConfig(config: Partial<PoolConfig>): void;
    getConfig(): PoolConfig;
}
//# sourceMappingURL=pool.d.ts.map
/**
 * Agent Pool — Manage concurrent sub-agent sessions.
 * Spawn, track, kill agents; lifecycle hooks.
 *
 * When an AgentLLMBridge is provided, spawned agents use real LLM execution.
 * Without a bridge, agents fall back to simulation mode.
 */
import { randomUUID } from "node:crypto";
import { AgentSession, type SessionConfig } from "./session.js";
import { AgentRouter, type RoutingDecision } from "./router.js";
import { AgentLLMBridge, type ToolExecutor } from "./agent-llm-bridge.js";
import { TaskQueue } from "./queue.js";
import { ContextEngineer } from "./context-engineer.js";
import { KnowledgeLibrarian } from "../knowledge/librarian.js";
import { KnowledgeIndexStore } from "../knowledge/index-store.js";
import { DEFAULT_KNOWLEDGE_CONFIG } from "../knowledge/types.js";
import type {
  PoolConfig,
  PoolEvent,
  AgentInfo,
  TaskDefinition,
  TaskResult,
  LifecycleHooks,
  RoutingStrategy,
  ContextEngineerConfig,
} from "./types.js";
import { DEFAULT_POOL_CONFIG } from "./types.js";
import type { ModelRouter } from "../models/router.js";

export interface PoolStatus {
  totalAgents: number;
  activeAgents: number;
  idleAgents: number;
  pendingTasks: number;
  runningTasks: number;
  completedTasks: number;
}

export class AgentPool {
  private agents: Map<string, AgentSession> = new Map();
  private queue: TaskQueue;
  private router: AgentRouter;
  private config: PoolConfig;
  private hooks: LifecycleHooks;
  private eventLog: PoolEvent[] = [];
  private maxEventLog = 500;
  private idleTimer: ReturnType<typeof setInterval> | null = null;
  private results: Map<string, TaskResult> = new Map();

  // Phase 14: Real LLM execution
  private modelRouter: ModelRouter | null;
  private toolExecutor: ToolExecutor | null;
  // Phase 18: Context Engineer
  private contextEngineerConfig: ContextEngineerConfig | null;
  // Phase 18: Knowledge Librarian
  private knowledgeLibrarian: KnowledgeLibrarian | null;
  private knowledgeStore: KnowledgeIndexStore | null;

  constructor(config: Partial<PoolConfig> = {}, hooks: LifecycleHooks = {}, modelRouter?: ModelRouter, toolExecutor?: ToolExecutor, contextEngineerConfig?: ContextEngineerConfig, knowledgeConfig?: any) {
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
  async spawn(sessionConfig?: Partial<SessionConfig>): Promise<string> {
    if (this.agents.size >= this.config.maxAgents) {
      this.emitEvent({ type: "pool_full" });
      throw new Error(`Agent pool is full (max: ${this.config.maxAgents})`);
    }

    const id = sessionConfig?.agentId ?? randomUUID();

    // Create AgentLLMBridge if modelRouter is available
    let bridge: AgentLLMBridge | undefined;
    if (this.modelRouter) {
      bridge = new AgentLLMBridge(this.modelRouter, this.toolExecutor ?? undefined);
    }

    const config: SessionConfig = {
      agentId: id,
      name: sessionConfig?.name ?? `agent-${id.slice(0, 8)}`,
      allowedTools: sessionConfig?.allowedTools ?? [],
      skillHints: sessionConfig?.skillHints ?? [],
      maxTokenBudget: sessionConfig?.maxTokenBudget ?? this.config.taskTimeoutMs,
      timeoutMs: sessionConfig?.timeoutMs ?? this.config.taskTimeoutMs,
      metadata: sessionConfig?.metadata,
    };

    // Create ContextEngineer if configured
    let contextEngineer: ContextEngineer | undefined;
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
  async kill(agentId: string, reason: string = "manual kill"): Promise<boolean> {
    const session = this.agents.get(agentId);
    if (!session) return false;

    await session.kill(reason, this.hooks);
    this.agents.delete(agentId);

    this.emitEvent({ type: "agent_killed", agentId, reason });
    return true;
  }

  /**
   * Kill all agents in the pool.
   */
  async killAll(reason: string = "pool shutdown"): Promise<void> {
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
  submitTask(task: TaskDefinition): { taskId: string; strategy: RoutingStrategy } {
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
  submitBatch(tasks: TaskDefinition[]): Array<{ taskId: string; strategy: RoutingStrategy }> {
    return tasks.map(task => this.submitTask(task));
  }

  /**
   * Cancel a pending or running task.
   */
  cancelTask(taskId: string): boolean {
    return this.queue.cancel(taskId);
  }

  // ── Task execution ──────────────────────────────────────────────

  /**
   * Dispatch a task to an available agent.
   * Called internally when a task becomes ready from the queue.
   */
  private async dispatchTask(task: TaskDefinition): Promise<void> {
    // Find an available agent
    const availableAgent = this.findAvailableAgent(task);

    if (!availableAgent) {
      // No agent available; if we can spawn one, do so
      if (this.agents.size < this.config.maxAgents) {
        const agentId = await this.spawn({
          skillHints: task.skillHint ? [task.skillHint] : [],
          allowedTools: task.tools ?? [],
        });
        const newAgent = this.agents.get(agentId)!;
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
  private async executeOnAgent(task: TaskDefinition, agent: AgentSession): Promise<void> {
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.queue.fail(task.id, true); // Retry if possible
      this.emitEvent({ type: "task_failed", taskId: task.id, agentId: agent.id, error: errorMessage });
    }
  }

  /**
   * Try to dispatch the next queued task to an available agent.
   */
  private tryDispatchNext(): void {
    const pending = this.queue.getPending();
    for (const task of pending) {
      const agent = this.findAvailableAgent(task);
      if (agent) {
        this.queue.dequeue(); // Will be dispatched by the onTaskReady callback
      }
    }
  }

  // ── Agent lookup ────────────────────────────────────────────────

  private findAvailableAgent(task?: TaskDefinition): AgentSession | null {
    // Prefer agents whose skill hints match the task
    if (task?.skillHint) {
      for (const agent of this.agents.values()) {
        if (agent.isIdle() && agent.config.skillHints.includes(task.skillHint!)) {
          return agent;
        }
      }
    }

    // Fall back to any idle agent
    for (const agent of this.agents.values()) {
      if (agent.isIdle()) return agent;
    }

    return null;
  }

  // ── Query ────────────────────────────────────────────────────────

  getAgentInfo(): AgentInfo[] {
    return [...this.agents.values()].map(a => a.getInfo());
  }

  getAgent(agentId: string): AgentSession | undefined {
    return this.agents.get(agentId);
  }

  getTaskResult(taskId: string): TaskResult | undefined {
    return this.results.get(taskId);
  }

  getStatus(): PoolStatus {
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

  getRouter(): AgentRouter {
    return this.router;
  }

  getQueue(): TaskQueue {
    return this.queue;
  }

  getEventLog(limit?: number): PoolEvent[] {
    return this.eventLog.slice(-(limit ?? 100));
  }

  // ── Idle management ─────────────────────────────────────────────

  /**
   * Start monitoring for idle agents and clean them up.
   */
  startIdleMonitor(): void {
    if (this.idleTimer) return;

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
  stopIdleMonitor(): void {
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
      this.idleTimer = null;
    }
  }

  // ── Shutdown ────────────────────────────────────────────────────

  /**
   * Gracefully shut down the pool: complete running tasks, kill all agents.
   */
  async shutdown(): Promise<void> {
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

  private emitEvent(event: PoolEvent): void {
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxEventLog) {
      this.eventLog = this.eventLog.slice(-this.maxEventLog);
    }
  }

  updateConfig(config: Partial<PoolConfig>): void {
    this.config = { ...this.config, ...config };
    this.queue.setConcurrencyLimit(this.config.concurrencyLimit);
  }

  getConfig(): PoolConfig {
    return { ...this.config };
  }
}
/**
 * Agent Session — Lightweight sub-agent runtime.
 * Isolated context, tool subset, skill injection; communicates via SCP protocol.
 *
 * When an AgentLLMBridge is provided, tasks execute real multi-turn LLM loops.
 * Without a bridge, execution falls back to simulation (for backward compat / tests).
 */
import { randomUUID } from "node:crypto";
import { encodeSCP, decodeSCP } from "../scp/codec.js";
import type { SCPDelegate, SCPResult, SCPError, SCPMessage } from "../scp/types.js";
import type { AgentInfo, AgentState, TaskDefinition, TaskResult, LifecycleHooks, ContextMode } from "./types.js";
import { AgentLLMBridge, type BridgeMessage } from "./agent-llm-bridge.js";
import type { ContextEngineer } from "./context-engineer.js";
import type { KnowledgeLibrarian } from "../knowledge/librarian.js";

export interface SessionConfig {
  agentId?: string;
  name?: string;
  allowedTools: string[];
  skillHints: string[];
  maxTokenBudget: number;
  timeoutMs: number;
  metadata?: Record<string, unknown>;
  contextMode?: ContextMode;
}

export interface SessionLogEntry {
  timestamp: number;
  direction: "inbound" | "outbound";
  message: SCPMessage;
}

const DEFAULT_SESSION_CONFIG: Partial<SessionConfig> = {
  maxTokenBudget: 50000,
  timeoutMs: 120000,
};

export class AgentSession {
  readonly id: string;
  readonly name: string;
  readonly config: SessionConfig;
  readonly createdAt: number;

  private state: AgentState = "spawning";
  private currentTaskId: string | null = null;
  private tokensUsed: number = 0;
  private tasksCompleted: number = 0;
  private tasksFailed: number = 0;
  private log: SessionLogEntry[] = [];
  private maxLogEntries = 1000;
  private lastActivityAt: number;
  private resultCallback: ((result: TaskResult) => void) | null = null;
  private abortController: AbortController | null = null;

  // Phase 14: Real agent execution
  private bridge: AgentLLMBridge | null;
  private _messageCount: number = 0;
  private _onMessageCallback: ((msg: BridgeMessage) => void) | null = null;
  private contextEngineer: ContextEngineer | null;
  private knowledgeLibrarian: KnowledgeLibrarian | null;

  constructor(config: SessionConfig, bridge?: AgentLLMBridge, contextEngineer?: ContextEngineer, knowledgeLibrarian?: KnowledgeLibrarian) {
    this.id = config.agentId ?? randomUUID();
    this.name = config.name ?? `agent-${this.id.slice(0, 8)}`;
    this.config = { ...DEFAULT_SESSION_CONFIG, ...config };
    this.createdAt = Date.now();
    this.lastActivityAt = this.createdAt;
    this.bridge = bridge ?? null;
    this.contextEngineer = contextEngineer ?? null;
    this.knowledgeLibrarian = knowledgeLibrarian ?? null;
  }

  // ── Lifecycle ──────────────────────────────────────────────────

  async start(hooks?: LifecycleHooks): Promise<void> {
    this.setState("idle");
    this.lastActivityAt = Date.now();
    await hooks?.onAgentSpawn?.(this.id);
  }

  async kill(reason: string, hooks?: LifecycleHooks): Promise<void> {
    if (this.state === "killed") return;

    // Cancel any running task
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.setState("killed");
    this.lastActivityAt = Date.now();
    await hooks?.onAgentKill?.(this.id, reason);
  }

  // ── Task execution ─────────────────────────────────────────────

  /**
   * Execute a task — uses AgentLLMBridge for real execution if available,
   * falls back to simulation otherwise.
   */
  async executeTask(task: TaskDefinition, hooks?: LifecycleHooks): Promise<TaskResult> {
    if (this.state === "killed" || this.state === "error") {
      return {
        taskId: task.id,
        agentId: this.id,
        status: "error",
        result: "",
        tokensUsed: 0,
        modelUsed: "none",
        durationMs: 0,
        error: `Agent is in state: ${this.state}`,
      };
    }

    if (this.state === "busy") {
      return {
        taskId: task.id,
        agentId: this.id,
        status: "error",
        result: "",
        tokensUsed: 0,
        modelUsed: "none",
        durationMs: 0,
        error: "Agent is busy with another task",
      };
    }

    this.setState("busy");
    this.currentTaskId = task.id;
    this.lastActivityAt = Date.now();
    this.abortController = new AbortController();

    // Create SCP delegate message
    const delegate: SCPDelegate = {
      type: "delegate",
      task_id: task.id,
      from: "tekton-orchestrator",
      to: this.id,
      task: task.description,
      priority: task.priority,
      ...(task.skillHint && { skill_hint: task.skillHint }),
      ...(task.tools && { tools: task.tools }),
      ...(task.context && { context: task.context }),
      ...(task.timeoutMs && { timeout_ms: task.timeoutMs }),
    };

    this.logEntry("outbound", delegate);

    const startTime = Date.now();

    try {
      await hooks?.onTaskStart?.(task.id, this.id);

      if (this.bridge) {
        // Real execution through AgentLLMBridge
        const result = await this.runDelegatedTask(task, this.abortController.signal);
        return result;
      } else {
        // Simulated execution (backward compat / tests)
        const simulatedResult = await this.runSimulatedTask(task, this.abortController.signal);
        return simulatedResult;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const taskResult: TaskResult = {
        taskId: task.id,
        agentId: this.id,
        status: "error",
        result: "",
        tokensUsed: this.estimateTokens(task.description),
        modelUsed: this.bridge ? "unknown" : "inline",
        durationMs: Date.now() - startTime,
        error: errorMessage,
      };

      this.logResult(taskResult);
      this.tasksFailed++;
      this.setState("idle");
      this.currentTaskId = null;
      this.lastActivityAt = Date.now();

      // Emit SCP error message
      const scpError: SCPError = {
        type: "error",
        task_id: task.id,
        from: this.id,
        code: "execution_error",
        message: errorMessage,
        recoverable: true,
      };
      this.logEntry("inbound", scpError);

      await hooks?.onTaskFail?.(task.id, errorMessage);

      return taskResult;
    } finally {
      this.abortController = null;
    }
  }

  // ── Bridge execution ────────────────────────────────────────────

  /**
   * Real task execution through AgentLLMBridge.
   * Builds a system prompt from session config, runs the multi-turn loop,
   * and emits SCP result/error messages.
   */
  private async runDelegatedTask(task: TaskDefinition, signal: AbortSignal): Promise<TaskResult> {
    if (!this.bridge) {
      throw new Error("AgentLLMBridge not configured");
    }

    const startTime = Date.now();

    // Build system prompt from session config
    const systemParts: string[] = [
      `You are ${this.name}, a sub-agent with the following skills: ${this.config.skillHints.join(", ") || "general"}.`,
    ];
    if (this.config.allowedTools.length > 0) {
      systemParts.push(`Available tools: ${this.config.allowedTools.join(", ")}.`);
    }
    systemParts.push("Complete the task thoroughly and report the result.");

    // Run the bridge execution
    const bridgeResult = await this.bridge.executeTask({
      systemPrompt: systemParts.join("\n"),
      taskDescription: task.description,
      context: task.context,
      tools: this.config.allowedTools,
      model: task.metadata?.model as string | undefined,
      maxTurns: Math.floor(this.config.maxTokenBudget / 2000) || 20,
      onMessage: (msg: BridgeMessage) => {
        this._messageCount++;
        if (this._onMessageCallback) {
          this._onMessageCallback(msg);
        }
      },
    });

    // Check if aborted
    if (signal.aborted) {
      const abortResult: TaskResult = {
        taskId: task.id,
        agentId: this.id,
        status: "error",
        result: "",
        tokensUsed: bridgeResult.tokensUsed,
        modelUsed: bridgeResult.modelUsed,
        durationMs: Date.now() - startTime,
        error: "Task was cancelled",
      };
      this.logResult(abortResult);
      this.tasksFailed++;
      this.setState("idle");
      this.currentTaskId = null;
      this.lastActivityAt = Date.now();
      return abortResult;
    }

    const status: "ok" | "partial" | "error" = bridgeResult.success ? "ok" : "error";

    const taskResult: TaskResult = {
      taskId: task.id,
      agentId: this.id,
      status,
      result: bridgeResult.result,
      tokensUsed: bridgeResult.tokensUsed,
      modelUsed: bridgeResult.modelUsed,
      durationMs: bridgeResult.durationMs,
      ...(bridgeResult.error && { error: bridgeResult.error }),
    };

    this.logResult(taskResult);

    if (status === "ok") {
      this.tasksCompleted++;
      this.tokensUsed += bridgeResult.tokensUsed;
    } else {
      this.tasksFailed++;
    }

    this.setState("idle");
    this.currentTaskId = null;
    this.lastActivityAt = Date.now();

    return taskResult;
  }

  // ── Simulation fallback ──────────────────────────────────────────

  /**
   * Simulated task execution for backward compatibility.
   * Used when no AgentLLMBridge is provided.
   */
  private async runSimulatedTask(task: TaskDefinition, signal: AbortSignal): Promise<TaskResult> {
    const startTime = Date.now();
    const timeout = task.timeoutMs ?? this.config.timeoutMs;

    const resultText = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task timed out after ${timeout}ms`));
      }, timeout);

      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new Error("Task was cancelled"));
      });

      // Simulate work
      setTimeout(() => {
        clearTimeout(timer);
        resolve(`Completed: ${task.description.slice(0, 200)}`);
      }, Math.min(100, timeout / 10));
    });

    const taskResult: TaskResult = {
      taskId: task.id,
      agentId: this.id,
      status: "ok",
      result: resultText,
      tokensUsed: this.estimateTokens(task.description + resultText),
      modelUsed: "inline",
      durationMs: Date.now() - startTime,
    };

    this.logResult(taskResult);
    this.tasksCompleted++;
    this.tokensUsed += taskResult.tokensUsed;
    this.setState("idle");
    this.currentTaskId = null;
    this.lastActivityAt = Date.now();

    return taskResult;
  }

  /**
   * Wait for the next result from this session.
   */
  waitForResult(): Promise<TaskResult> {
    return new Promise((resolve) => {
      this.resultCallback = resolve;
    });
  }

  // ── Info ────────────────────────────────────────────────────────

  getInfo(): AgentInfo {
    return {
      id: this.id,
      name: this.name,
      state: this.state,
      currentTaskId: this.currentTaskId,
      createdAt: this.createdAt,
      lastActivityAt: this.lastActivityAt,
      tokensUsed: this.tokensUsed,
      tasksCompleted: this.tasksCompleted,
      tasksFailed: this.tasksFailed,
      metadata: { ...this.config.metadata },
    };
  }

  getState(): AgentState {
    return this.state;
  }

  isIdle(): boolean {
    return this.state === "idle";
  }

  isBusy(): boolean {
    return this.state === "busy";
  }

  isAvailable(): boolean {
    return this.state === "idle" || this.state === "spawning";
  }

  // ── Message tracking ────────────────────────────────────────────

  /** Number of messages (LLM turns) processed in this session. */
  get messageCount(): number {
    return this._messageCount;
  }

  /**
   * Register a callback for every message processed during bridge execution.
   * Returns an unsubscribe function.
   */
  onMessage(callback: (msg: BridgeMessage) => void): () => void {
    this._onMessageCallback = callback;
    return () => {
      this._onMessageCallback = null;
    };
  }

  // ── Context Engineer ────────────────────────────────────────────

  /** Get the Context Engineer for this session (if any). */
  getContextEngineer(): ContextEngineer | null {
    return this.contextEngineer;
  }

  /** Set the Context Engineer for this session. */
  setContextEngineer(ce: ContextEngineer | null): void {
    this.contextEngineer = ce;
  }

  /** Get the Knowledge Librarian for this session (if any). */
  getKnowledgeLibrarian(): KnowledgeLibrarian | null {
    return this.knowledgeLibrarian;
  }

  /** Set the Knowledge Librarian for this session. */
  setKnowledgeLibrarian(kl: KnowledgeLibrarian | null): void {
    this.knowledgeLibrarian = kl;
  }

  /** Get context mode configuration. */
  getContextMode(): ContextMode {
    return this.config.contextMode ?? "context-engineer";
  }

  /** Switch context mode mid-session. */
  setContextMode(mode: ContextMode): void {
    this.config.contextMode = mode;
  }

  /**
   * Build the messages array for an LLM call, using Context Engineer
   * and Knowledge Librarian when configured.
   */
  buildMessagesForLLM(systemPrompt: string): Array<{role: string; content: string}> {
    const mode = this.getContextMode();

    // Raw mode: send full history
    if (mode === "raw") {
      return [
        { role: "system", content: systemPrompt },
        ...this.getLog().slice(-50).map(entry => ({
          role: entry.direction === "inbound" ? "assistant" : "user",
          content: typeof entry.message === "object" && entry.message !== null && "result" in entry.message
            ? (entry.message as any).result
            : typeof entry.message === "object" ? JSON.stringify(entry.message) : String(entry.message),
        })),
      ];
    }

    // Context Engineer mode: use optimized context
    if (mode === "context-engineer" && this.contextEngineer) {
      const optimized = this.contextEngineer.getOptimizedContext();
      const messages: Array<{role: string; content: string}> = [
        { role: "system", content: systemPrompt },
      ];

      if (optimized.rollingContext) {
        messages.push({ role: "system", content: `## Conversation Context\n${optimized.rollingContext}` });
      }

      if (optimized.precisionLog) {
        messages.push({ role: "system", content: `## Precision Log\n${optimized.precisionLog}` });
      }

      // Knowledge injection (if Librarian has relevant material)
      // This is handled separately and injected before raw messages

      for (const msg of optimized.rawMessages) {
        messages.push({ role: msg.role === "tool" ? "user" : msg.role, content: msg.content });
      }

      return messages;
    }

    // Caveman mode or fallback: simple windowing
    const recentLog = this.getLog().slice(-30);
    return [
      { role: "system", content: systemPrompt },
      ...recentLog.map(entry => ({
        role: entry.direction === "inbound" ? "assistant" : "user",
        content: typeof entry.message === "object" && entry.message !== null && "result" in entry.message
          ? (entry.message as any).result
          : typeof entry.message === "object" ? JSON.stringify(entry.message) : String(entry.message),
      })),
    ];
  }

  // ── Log access ──────────────────────────────────────────────────

  getLog(limit?: number): SessionLogEntry[] {
    return this.log.slice(-(limit ?? 100));
  }

  // ── Private ──────────────────────────────────────────────────────

  private setState(newState: AgentState): void {
    this.state = newState;
    this.lastActivityAt = Date.now();
  }

  private logEntry(direction: "inbound" | "outbound", message: SCPMessage): void {
    this.log.push({
      timestamp: Date.now(),
      direction,
      message,
    });
    if (this.log.length > this.maxLogEntries) {
      this.log = this.log.slice(-this.maxLogEntries);
    }
  }

  private logResult(result: TaskResult): void {
    // Log as SCP result
    const scpResult: SCPResult = {
      type: "result",
      task_id: result.taskId,
      from: this.id,
      status: result.status,
      result: result.result,
      tokens_used: result.tokensUsed,
      model_used: result.modelUsed,
      duration_ms: result.durationMs,
    };
    this.logEntry("inbound", scpResult);
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
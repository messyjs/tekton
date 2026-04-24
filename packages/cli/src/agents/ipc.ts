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
  progress?: number; // 0-100
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
export class AgentIPC {
  private pool: AgentPool;
  private callbacks: StreamCallbacks = {};
  private pendingTasks: Map<string, {
    resolve: (result: TaskResult) => void;
    reject: (error: Error) => void;
  }> = new Map();
  private progressHistory: ProgressUpdate[] = [];
  private maxHistory = 1000;

  constructor(pool: AgentPool, callbacks?: StreamCallbacks) {
    this.pool = pool;
    if (callbacks) this.callbacks = callbacks;
  }

  /**
   * Submit a task and stream progress updates.
   * Returns a promise that resolves when the task completes.
   */
  async submitAndStream(task: TaskDefinition): Promise<TaskResult> {
    const { taskId, strategy } = this.pool.submitTask(task);

    this.emitProgress({
      taskId,
      status: "queued",
      message: `Task queued (${strategy} strategy)`,
      timestamp: Date.now(),
    });

    return new Promise<TaskResult>((resolve, reject) => {
      this.pendingTasks.set(taskId, { resolve, reject });
    });
  }

  /**
   * Submit multiple tasks and collect all results.
   */
  async submitBatch(tasks: TaskDefinition[]): Promise<TaskResult[]> {
    const submissions = tasks.map(task => this.pool.submitTask(task));
    const results: TaskResult[] = [];

    for (const { taskId } of submissions) {
      // Poll for results — in implementation, this would use event-driven updates
      const start = Date.now();
      const timeout = 30000; // 30s per task

      while (Date.now() - start < timeout) {
        const result = this.pool.getTaskResult(taskId);
        if (result) {
          results.push(result);
          break;
        }
        await new Promise(r => setTimeout(r, 100));
      }
    }

    return results;
  }

  /**
   * Cancel a task by ID.
   */
  cancel(taskId: string): boolean {
    const cancelled = this.pool.cancelTask(taskId);
    if (cancelled) {
      this.emitProgress({
        taskId,
        status: "cancelled",
        message: "Task cancelled",
        timestamp: Date.now(),
      });
    }
    return cancelled;
  }

  /**
   * Format agent info for display.
   */
  formatAgentInfo(agents: AgentInfo[]): string {
    if (agents.length === 0) {
      return "No active sub-agents.";
    }

    const lines: string[] = [
      "Sub-Agent Pool",
      "─".repeat(60),
    ];

    for (const agent of agents) {
      const stateEmoji: Record<string, string> = {
        spawning: "🔄",
        idle: "⏳",
        busy: "🏃",
        blocked: "🚫",
        killed: "💀",
        error: "❌",
      };
      const emoji = stateEmoji[agent.state] ?? "❓";
      lines.push(`  ${emoji} ${agent.name} (${agent.id.slice(0, 8)})`);
      lines.push(`     State: ${agent.state} | Tasks: ${agent.tasksCompleted}✓ ${agent.tasksFailed}✗ | Tokens: ${agent.tokensUsed}`);
      if (agent.currentTaskId) {
        lines.push(`     Current task: ${agent.currentTaskId.slice(0, 16)}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Format pool status for display.
   */
  formatStatus(): string {
    const status = this.pool.getStatus();
    const lines: string[] = [
      "Agent Pool Status",
      "─".repeat(30),
      `  Agents: ${status.totalAgents} (${status.activeAgents} active, ${status.idleAgents} idle)`,
      `  Tasks:  ${status.pendingTasks} queued, ${status.runningTasks} running, ${status.completedTasks} completed`,
    ];
    return lines.join("\n");
  }

  /**
   * Format task result for display.
   */
  formatResult(result: TaskResult): string {
    const statusIcon = result.status === "ok" ? "✅" : result.status === "partial" ? "⚡" : "❌";
    const lines: string[] = [
      `${statusIcon} Task ${result.taskId.slice(0, 16)}`,
      `  Agent: ${result.agentId.slice(0, 8)} | Model: ${result.modelUsed}`,
      `  Duration: ${(result.durationMs / 1000).toFixed(1)}s | Tokens: ${result.tokensUsed}`,
    ];
    if (result.error) {
      lines.push(`  Error: ${result.error}`);
    }
    if (result.result) {
      const truncated = result.result.length > 500
        ? result.result.slice(0, 500) + "..."
        : result.result;
      lines.push(`  Result: ${truncated}`);
    }
    return lines.join("\n");
  }

  /**
   * Format event log for display.
   */
  formatEventLog(limit: number = 20): string {
    const events = this.pool.getEventLog(limit);
    if (events.length === 0) return "No events.";

    const lines: string[] = ["Event Log:", "─".repeat(40)];
    for (const event of events) {
      switch (event.type) {
        case "agent_spawned":
          lines.push(`  🔄 Agent spawned: ${event.agentId.slice(0, 8)}`);
          break;
        case "agent_killed":
          lines.push(`  💀 Agent killed: ${event.agentId.slice(0, 8)} (${event.reason})`);
          break;
        case "agent_error":
          lines.push(`  ❌ Agent error: ${event.agentId.slice(0, 8)} - ${event.error}`);
          break;
        case "task_queued":
          lines.push(`  📋 Task queued: ${event.taskId.slice(0, 16)}`);
          break;
        case "task_started":
          lines.push(`  ▶️ Task started: ${event.taskId.slice(0, 16)} → ${event.agentId.slice(0, 8)}`);
          break;
        case "task_completed":
          lines.push(`  ✅ Task completed: ${event.taskId.slice(0, 16)} (${event.status})`);
          break;
        case "task_failed":
          lines.push(`  ❌ Task failed: ${event.taskId.slice(0, 16)} - ${event.error}`);
          break;
        case "pool_full":
          lines.push(`  ⚠️ Pool full`);
          break;
        case "pool_idle":
          lines.push(`  💤 Pool idle`);
          break;
      }
    }
    return lines.join("\n");
  }

  // ── Get progress history ────────────────────────────────────────

  getProgressHistory(limit?: number): ProgressUpdate[] {
    return this.progressHistory.slice(-(limit ?? 100));
  }

  // ── Private ──────────────────────────────────────────────────────

  private emitProgress(update: ProgressUpdate): void {
    this.progressHistory.push(update);
    if (this.progressHistory.length > this.maxHistory) {
      this.progressHistory = this.progressHistory.slice(-this.maxHistory);
    }

    if (this.callbacks.onProgress) {
      this.callbacks.onProgress(update);
    }

    // Resolve/reject pending promises based on status
    if (update.status === "completed" && update.result) {
      const pending = this.pendingTasks.get(update.taskId);
      if (pending) {
        pending.resolve(update.result);
        this.pendingTasks.delete(update.taskId);
      }
      this.callbacks.onResult?.(update.result);
    } else if (update.status === "failed") {
      const pending = this.pendingTasks.get(update.taskId);
      if (pending) {
        pending.reject(new Error(update.message ?? "Task failed"));
        this.pendingTasks.delete(update.taskId);
      }
      this.callbacks.onError?.(update.taskId, update.message ?? "Unknown error");
    }
  }

  updateCallbacks(callbacks: StreamCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
}
import { randomUUID } from "node:crypto";
import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "../../registry.js";
import type { ToolResult, ToolContext } from "../../registry.js";

// ── Global AgentPool reference ─────────────────────────────────────────

let _globalPool: any = null;

/**
 * Set the global AgentPool reference for delegate_task to use.
 * Called by TektonRuntime during initialization.
 */
export function setGlobalPool(pool: any): void {
  _globalPool = pool;
}

/**
 * Get the global AgentPool reference. Returns null if not initialized.
 */
export function getGlobalPool(): any {
  return _globalPool;
}

export const delegateTaskTool: ToolDefinition = {
  name: "delegate_task",
  toolset: "delegation",
  description:
    "Spawn sub-agents for isolated parallel or sequential tasks. Uses SCP for communication. " +
    "Modes: parallel (independent tasks) or sequential (chained dependent tasks). " +
    "Requires the full Tekton runtime (AgentPool must be initialized).",
  parameters: Type.Object({
    mode: Type.Union([Type.Literal("parallel"), Type.Literal("sequential")]),
    tasks: Type.Array(Type.Object({
      task: Type.String({ description: "Task description (caveman-compressed)" }),
      skill_hint: Type.Optional(Type.String()),
      tools: Type.Optional(Type.Array(Type.String())),
      timeout_ms: Type.Optional(Type.Number()),
    })),
    context: Type.Optional(Type.String({ description: "Shared context for all tasks" })),
  }),
  async execute(params, context?: ToolContext): Promise<ToolResult> {
    const mode = params.mode as string;
    const tasks = params.tasks as Array<{ task: string; skill_hint?: string; tools?: string[]; timeout_ms?: number }>;
    const sharedContext = params.context as string | undefined;

    // Get AgentPool from context or global
    const pool = context?.agentPool ?? _globalPool;

    if (!pool) {
      return {
        content: "Delegation requires the full Tekton runtime. AgentPool is not initialized. " +
          "Ensure Tekton is running with the agent subsystem enabled.",
        isError: true,
      };
    }

    // Submit all tasks to the pool
    const submissions: Array<{
      taskId: string;
      strategy: string;
      description: string;
    }> = [];

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const taskId = `delegate_${Date.now()}_${i}_${randomUUID().slice(0, 8)}`;
      const result = pool.submitTask({
        id: taskId,
        description: t.task,
        priority: "normal",
        skillHint: t.skill_hint,
        tools: t.tools,
        context: sharedContext,
        ...(mode === "sequential" && i > 0 ? { dependencies: [submissions[i - 1].taskId] } : {}),
        createdAt: Date.now(),
      });

      submissions.push({
        taskId: result.taskId,
        strategy: result.strategy,
        description: t.task.slice(0, 80),
      });
    }

    // Collect results with timeout
    const results: Array<{
      taskId: string;
      strategy: string;
      description: string;
      status?: string;
      result?: string;
      error?: string;
    }> = [];

    const timeout = Math.max(...tasks.map(t => t.timeout_ms ?? 60000), 60000);

    for (const sub of submissions) {
      const start = Date.now();
      let resolved = false;

      while (Date.now() - start < timeout) {
        const taskResult = pool.getTaskResult(sub.taskId);
        if (taskResult) {
          results.push({
            taskId: sub.taskId,
            strategy: sub.strategy,
            description: sub.description,
            status: taskResult.status,
            result: taskResult.result,
            error: taskResult.error,
          });
          resolved = true;
          break;
        }
        await new Promise(r => setTimeout(r, 100));
      }

      if (!resolved) {
        results.push({
          taskId: sub.taskId,
          strategy: sub.strategy,
          description: sub.description,
          status: "timeout",
          error: `Task timed out after ${timeout}ms`,
        });
      }
    }

    // Build response
    const completed = results.filter(r => r.status === "ok");
    const partial = results.filter(r => r.status === "partial");
    const failed = results.filter(r => r.status === "error" || r.status === "timeout");

    const lines: string[] = [
      `Delegation complete (${mode}): ${completed.length}/${tasks.length} tasks succeeded`,
      "",
    ];

    for (const r of results) {
      const icon = r.status === "ok" ? "✅" : r.status === "partial" ? "⚡" : "❌";
      lines.push(`${icon} [${r.strategy}] ${r.description}`);
      if (r.result) {
        lines.push(`   ${r.result.slice(0, 200)}`);
      }
      if (r.error) {
        lines.push(`   Error: ${r.error}`);
      }
    }

    if (failed.length > 0) {
      lines.push("", `⚠️ ${failed.length} task(s) failed or timed out.`);
    }

    return {
      content: lines.join("\n"),
      metadata: {
        mode,
        taskCount: tasks.length,
        completed: completed.length,
        partial: partial.length,
        failed: failed.length,
        submissions: submissions.map(s => ({ taskId: s.taskId, strategy: s.strategy })),
        results: results.map(r => ({
          taskId: r.taskId,
          status: r.status,
          strategy: r.strategy,
        })),
      },
    };
  },
};
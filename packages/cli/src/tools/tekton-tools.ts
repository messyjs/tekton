import { defineTool, type ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import type { HermesBridge } from "@tekton/hermes-bridge";
import type { MemoryManager, AgentPool } from "@tekton/core";
import type { TaskResult } from "@tekton/core";
import type { RoutingStrategy } from "@tekton/core";

// ── Delegate task to sub-agent (uses real AgentPool) ──────────────

export function createDelegateTool(pool: AgentPool): ToolDefinition {
  return defineTool({
    name: "delegate",
    label: "Delegate Task",
    description: "Spawn sub-agents for isolated parallel tasks. Uses SCP for communication.",
    parameters: Type.Object({
      tasks: Type.Array(Type.Object({
        description: Type.String({ description: "What the sub-agent should do" }),
        tools: Type.Optional(Type.Array(Type.String(), { description: "Tools the sub-agent can use" })),
        skill_hint: Type.Optional(Type.String({ description: "Name of a relevant skill to apply" })),
        priority: Type.Optional(Type.Union([Type.Literal("low"), Type.Literal("normal"), Type.Literal("high")], {
          description: "Task priority",
          default: "normal",
        })),
      })),
      mode: Type.Optional(Type.Union([Type.Literal("parallel"), Type.Literal("sequential")], {
        description: "Execute sub-tasks in parallel or sequentially",
        default: "sequential",
      })),
    }),
    execute: async (_toolCallId: string, params: { tasks: Array<{ description: string; tools?: string[]; skill_hint?: string; priority?: string }>; mode?: string }, _signal: AbortSignal | undefined, _onUpdate: any, _ctx: any) => {
      const { tasks, mode = "sequential" } = params;

      // Submit all tasks to the pool
      const submissions = tasks.map((task, idx) => {
        const taskId = `delegate_${Date.now()}_${idx}`;
        return pool.submitTask({
          id: taskId,
          description: task.description,
          priority: (task.priority as "low" | "normal" | "high") ?? "normal",
          skillHint: task.skill_hint,
          tools: task.tools,
          createdAt: Date.now(),
          ...(mode === "sequential" && idx > 0 ? { dependencies: [`delegate_${Date.now()}_${idx - 1}`] } : {}),
        });
      });

      // Collect results
      const results: Array<{ taskId: string; strategy: RoutingStrategy; result?: TaskResult }> = [];
      for (const sub of submissions) {
        // Poll for the result
        const start = Date.now();
        const timeout = 60000;
        while (Date.now() - start < timeout) {
          const result = pool.getTaskResult(sub.taskId);
          if (result) {
            results.push({ taskId: sub.taskId, strategy: sub.strategy, result });
            break;
          }
          await new Promise(r => setTimeout(r, 100));
        }
        if (results.length <= results.length - 1 || !results[results.length - 1]?.result) {
          results.push({ taskId: sub.taskId, strategy: sub.strategy });
        }
      }

      const completed = results.filter(r => r.result);
      const failed = results.filter(r => !r.result);

      const lines: string[] = [
        `Delegation complete (${mode}): ${completed.length}/${tasks.length} tasks finished`,
        "",
      ];

      for (const r of completed) {
        if (r.result) {
          const icon = r.result.status === "ok" ? "✅" : r.result.status === "partial" ? "⚡" : "❌";
          lines.push(`${icon} [${r.strategy}] ${r.result.result.slice(0, 200)}`);
          if (r.result.error) lines.push(`   Error: ${r.result.error}`);
        }
      }

      if (failed.length > 0) {
        lines.push("", `⚠️ ${failed.length} tasks did not complete within timeout.`);
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
        details: { tasks, mode, submissions, results },
      };
    },
  });
}

// ── Original inline delegate (fallback) ───────────────────────────

export const delegateTool: ToolDefinition = defineTool({
  name: "delegate_inline",
  label: "Delegate Task (Inline)",
  description: "Delegate task inline without an agent pool. Fallback for when no pool is available.",
  parameters: Type.Object({
    tasks: Type.Array(Type.Object({
      description: Type.String({ description: "What the sub-agent should do" }),
      tools: Type.Optional(Type.Array(Type.String(), { description: "Tools the sub-agent can use" })),
      skill_hint: Type.Optional(Type.String({ description: "Name of a relevant skill to apply" })),
    })),
    mode: Type.Optional(Type.Union([Type.Literal("parallel"), Type.Literal("sequential")], {
      description: "Execute sub-tasks in parallel or sequentially",
      default: "sequential",
    })),
  }),
  execute: async (_toolCallId: string, params: { tasks: Array<{ description: string; tools?: string[]; skill_hint?: string }>; mode?: string }, _signal: AbortSignal | undefined, _onUpdate: any, _ctx: any) => {
    const { tasks, mode = "sequential" } = params;

    const lines: string[] = [`Delegation requested (${mode}):`, ""];
    for (const task of tasks) {
      lines.push(`  Task: ${task.description}`);
      if (task.tools) lines.push(`  Tools: ${task.tools.join(", ")}`);
      if (task.skill_hint) lines.push(`  Skill hint: ${task.skill_hint}`);
      lines.push("");
    }
    lines.push("Note: No agent pool available. Task handled inline by the main agent.");

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
      details: { tasks, mode },
    };
  },
});

// ── Skill lookup ────────────────────────────────────────────────────

export function createSkillLookupTool(hermesBridge: HermesBridge): ToolDefinition {
  return defineTool({
    name: "skill_lookup",
    label: "Skill Lookup",
    description: "Search your skill library for relevant procedures. Uses progressive disclosure.",
    parameters: Type.Object({
      query: Type.String({ description: "Search query for skills" }),
      loadFull: Type.Optional(Type.Boolean({ description: "Load full skill content (Level 1) vs summary only (Level 0)", default: false })),
      skillName: Type.Optional(Type.String({ description: "Exact skill name to load" })),
    }),
    execute: async (_toolCallId: string, params: { query: string; loadFull?: boolean; skillName?: string }, _signal: AbortSignal | undefined, _onUpdate: any, _ctx: any) => {
      const { query, loadFull = false, skillName } = params;

      if (skillName) {
        const skill = hermesBridge.skills.getSkill(skillName);
        if (skill) {
          const content = loadFull
            ? `## ${skill.name}\n\n${skill.description}\n\nVersion: ${skill.version ?? "0.1.0"}\nConfidence: ${skill.metadata?.tekton?.confidence ?? 0.5}\n\nSteps:\n${skill.body}`
            : `## ${skill.name}\n${skill.description} (v${skill.version ?? "0.1.0"}, confidence: ${skill.metadata?.tekton?.confidence ?? 0.5})`;
          return { content: [{ type: "text" as const, text: content }], details: {} };
        }
        return {
          content: [{ type: "text" as const, text: `Skill "${skillName}" not found.` }],
          details: {},
        };
      }

      const results = hermesBridge.skills.searchSkills(query);
      if (results.length === 0) {
        return {
          content: [{ type: "text" as const, text: `No skills found matching "${query}".` }],
          details: {},
        };
      }

      if (loadFull) {
        const content = results
          .slice(0, 3)
          .map(summary => {
            const full = hermesBridge.skills.getSkill(summary.name);
            if (!full) return `## ${summary.name}\n${summary.description}`;
            return `## ${full.name}\n\n${full.description}\n\nVersion: ${full.version ?? "0.1.0"}\nConfidence: ${full.metadata?.tekton?.confidence ?? 0.5}\n\n${full.body}`;
          })
          .join("\n\n---\n\n");
        return { content: [{ type: "text" as const, text: content }], details: {} };
      }

      const summary = results
        .slice(0, 10)
        .map(s => `- ${s.name}: ${s.description} (confidence: ${s.confidence ?? 0.5})`)
        .join("\n");
      return { content: [{ type: "text" as const, text: summary }], details: {} };
    },
  });
}

// ── Memory management ────────────────────────────────────────────────

export function createMemoryTools(memory: MemoryManager): ToolDefinition[] {
  const recallTool: ToolDefinition = defineTool({
    name: "recall",
    label: "Recall Memory",
    description: "Search your long-term memory for relevant context.",
    parameters: Type.Object({
      query: Type.String({ description: "What to search for" }),
      limit: Type.Optional(Type.Number({ description: "Max results", default: 5 })),
    }),
    execute: async (_toolCallId: string, params: { query: string; limit?: number }, _signal: AbortSignal | undefined, _onUpdate: any, _ctx: any) => {
      const results = memory.searchMemory(params.query);
      if (results.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No matching memories found." }],
          details: {},
        };
      }
      const text = results.slice(0, params.limit ?? 5).join("\n");
      return { content: [{ type: "text" as const, text }], details: {} };
    },
  });

  const rememberTool: ToolDefinition = defineTool({
    name: "remember",
    label: "Remember",
    description: "Store important information in long-term memory for future sessions.",
    parameters: Type.Object({
      content: Type.String({ description: "What to remember" }),
      category: Type.Optional(Type.String({ description: "Category for the memory entry" })),
    }),
    execute: async (_toolCallId: string, params: { content: string; category?: string }, _signal: AbortSignal | undefined, _onUpdate: any, _ctx: any) => {
      memory.addMemory(params.content, params.category);
      await memory.flush();
      return {
        content: [{ type: "text" as const, text: "Remembered." }],
        details: { content: params.content, category: params.category },
      };
    },
  });

  return [recallTool, rememberTool];
}

// ── Register all Tekton custom tools ────────────────────────────────

export function createTektonTools(hermesBridge: HermesBridge, memory: MemoryManager, pool?: AgentPool): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  if (pool) {
    tools.push(createDelegateTool(pool));
  } else {
    tools.push(delegateTool);
  }

  tools.push(createSkillLookupTool(hermesBridge));
  tools.push(...createMemoryTools(memory));

  return tools;
}
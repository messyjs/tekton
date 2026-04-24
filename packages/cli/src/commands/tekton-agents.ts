import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag, formatTable, truncate } from "./types.js";
import type { AgentPool, AgentInfo } from "@tekton/core";

export function createAgentsCommand(getPool: () => AgentPool | null): CommandRegistration {
  return {
    name: "tekton:agents",
    description: "List, spawn, and manage sub-agents",
    subcommands: {
      "list": "List active sub-agents",
      "log": "Show sub-agent execution log",
      "spawn": "Spawn a new sub-agent",
      "kill": "Kill a sub-agent",
      "status": "Show pool status",
      "route": "Show routing decision for a task",
    },
    handler: async (args, _ctx, _pi, piCtx) => {
      const sub = args.subcommand;
      const pool = getPool();

      switch (sub) {
        case "list": {
          if (!pool) {
            piCtx.ui.notify("Agent pool not initialized.");
            return;
          }

          const agents = pool.getAgentInfo();
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify(agents, null, 2));
            return;
          }

          if (agents.length === 0) {
            piCtx.ui.notify("No active sub-agents. Use /tekton:agents spawn to create one.");
            return;
          }

          const rows = agents.map(a => [
            a.name.slice(0, 16),
            a.id.slice(0, 8),
            a.state,
            String(a.tasksCompleted),
            String(a.tasksFailed),
            String(a.tokensUsed),
          ]);
          piCtx.ui.notify(formatTable(
            ["Name", "ID", "State", "✓", "✗", "Tokens"],
            rows,
          ));
          return;
        }

        case "log": {
          if (!pool) {
            piCtx.ui.notify("Agent pool not initialized.");
            return;
          }

          const limit = args.flags.limit ? Number(args.flags.limit) : 20;
          const events = pool.getEventLog(limit);

          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify(events, null, 2));
            return;
          }

          if (events.length === 0) {
            piCtx.ui.notify("No agent events logged yet.");
            return;
          }

          const lines: string[] = ["Agent Event Log:", "─".repeat(50)];
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
          piCtx.ui.notify(lines.join("\n"));
          return;
        }

        case "spawn": {
          if (!pool) {
            piCtx.ui.notify("Agent pool not initialized.");
            return;
          }

          const name = args.positional[0];
          const skillHint = typeof args.flags.skill === "string" ? args.flags.skill as string : undefined;
          const maxTasks = typeof args.flags["max-tasks"] === "string" ? Number(args.flags["max-tasks"]) : undefined;

          try {
            const agentId = await pool.spawn({
              name,
              skillHints: skillHint ? [skillHint] : [],
              allowedTools: [],
              maxTokenBudget: 50000,
              timeoutMs: 120000,
            });

            const agent = pool.getAgent(agentId);
            if (hasJsonFlag(args)) {
              piCtx.ui.notify(JSON.stringify(agent?.getInfo(), null, 2));
            } else {
              piCtx.ui.notify(`🤖 Spawned agent ${name ?? agentId.slice(0, 8)} (${agentId.slice(0, 8)})`);
            }
          } catch (err) {
            piCtx.ui.notify(`❌ Failed to spawn agent: ${err instanceof Error ? err.message : String(err)}`, "error");
          }
          return;
        }

        case "kill": {
          if (!pool) {
            piCtx.ui.notify("Agent pool not initialized.");
            return;
          }

          const agentId = args.positional[0];
          if (!agentId) {
            piCtx.ui.notify("Usage: /tekton:agents kill <agent-id>");
            return;
          }

          if (!(args.flags.force === true)) {
            piCtx.ui.notify(`⚠️ This will kill agent ${agentId}. Use --force to confirm.`);
            return;
          }

          const killed = await pool.kill(agentId, "manual kill via command");
          if (killed) {
            piCtx.ui.notify(`💀 Agent ${agentId.slice(0, 8)} killed.`);
          } else {
            piCtx.ui.notify(`Agent ${agentId.slice(0, 8)} not found.`);
          }
          return;
        }

        case "status": {
          if (!pool) {
            piCtx.ui.notify("Agent pool not initialized.");
            return;
          }

          const status = pool.getStatus();
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify(status, null, 2));
            return;
          }

          piCtx.ui.notify(
            "Agent Pool Status\n" +
            "─".repeat(30) + "\n" +
            `  Agents: ${status.totalAgents} (${status.activeAgents} active, ${status.idleAgents} idle)\n` +
            `  Tasks:  ${status.pendingTasks} queued, ${status.runningTasks} running, ${status.completedTasks} completed`
          );
          return;
        }

        case "route": {
          if (!pool) {
            piCtx.ui.notify("Agent pool not initialized.");
            return;
          }

          const taskDesc = args.positional.join(" ");
          if (!taskDesc) {
            piCtx.ui.notify("Usage: /tekton:agents route <task description>");
            return;
          }

          const router = pool.getRouter();
          const decision = router.route({
            id: "preview",
            description: taskDesc,
            priority: "normal",
            createdAt: Date.now(),
          });

          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify(decision, null, 2));
            return;
          }

          const strategyEmoji = decision.strategy === "inline" ? "↩️" : "📤";
          piCtx.ui.notify(
            `${strategyEmoji} Routing Decision\n` +
            "─".repeat(30) + "\n" +
            `  Strategy: ${decision.strategy}\n` +
            `  Complexity: ${decision.complexityScore.toFixed(2)}\n` +
            `  Reason: ${decision.reason}\n` +
            `  Est. cost: $${decision.estimatedCost.toFixed(4)}`
          );
          return;
        }

        default: {
          if (!pool) {
            piCtx.ui.notify(
              "Sub-Agent Management\n\n" +
              "Agent pool not initialized.\n" +
              "Subcommands: list, log, spawn, kill, status, route"
            );
            return;
          }

          const agents = pool.getAgentInfo();
          const status = pool.getStatus();
          piCtx.ui.notify(
            "Sub-Agent Management\n" +
            "─".repeat(30) + "\n" +
            `  ${status.totalAgents} agents (${status.activeAgents} active)\n` +
            `  ${status.pendingTasks} queued, ${status.runningTasks} running, ${status.completedTasks} completed\n\n` +
            "Subcommands: list, log, spawn, kill, status, route"
          );
        }
      }
    },
    getArgumentCompletions: (prefix: string) => {
      const subs = ["list", "log", "spawn", "kill", "status", "route"];
      return subs.filter(s => s.startsWith(prefix)).map(s => ({ value: s, label: s, description: `Agents ${s}` }));
    },
  };
}
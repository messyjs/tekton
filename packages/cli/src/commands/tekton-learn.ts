import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag, formatBox } from "./types.js";

export function createLearnCommand(): CommandRegistration {
  return {
    name: "tekton:learn",
    description: "Toggle and inspect the learning loop",
    subcommands: {
      "status": "Show learning status",
      "pause": "Pause learning",
      "resume": "Resume learning",
      "force": "Force a skill extraction from the last task",
      "history": "Show recent evaluation history",
    },
    handler: async (args, ctx, _pi, piCtx) => {
      const sub = args.subcommand;

      switch (sub) {
        case "status": {
          const status = ctx.hermesBridge.getStatus();
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify(status, null, 2));
          } else {
            const rows: Array<[string, string]> = [
              ["Status", status.isPaused ? "paused" : "active"],
              ["Skills", String(status.totalSkills)],
              ["Avg confidence", status.averageConfidence.toFixed(2)],
              ["Usage records", String(status.totalUsageRecords)],
              ["Evaluations", String(status.recentEvaluations.length)],
            ];
            piCtx.ui.notify(formatBox("Learning Status", rows));
          }
          return;
        }

        case "pause": {
          ctx.hermesBridge.setPaused(true);
          piCtx.ui.notify("⏸️ Learning paused. Skills will not be extracted or refined.");
          return;
        }

        case "resume": {
          ctx.hermesBridge.setPaused(false);
          piCtx.ui.notify("▶️ Learning resumed. Skills will be extracted and refined.");
          return;
        }

        case "force": {
          if (status_is_paused(ctx)) {
            piCtx.ui.notify("⚠️ Learning is paused. Resume with /tekton:learn resume first.");
            return;
          }
          piCtx.ui.notify("⚠️ Force extraction requires a completed task context. Use the delegate tool or complete a task first.");
          return;
        }

        case "history": {
          const status = ctx.hermesBridge.getStatus();
          const evals = status.recentEvaluations.slice(-10);
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify(evals, null, 2));
          } else if (evals.length === 0) {
            piCtx.ui.notify("No evaluation history yet.");
          } else {
            const lines = ["Recent evaluations:\n"];
            for (const e of evals) {
              lines.push(`  ${e.success ? "✅" : "❌"} — ${e.toolCallCount} tools, ${e.hadErrors ? "errors" : "clean"}`);
            }
            piCtx.ui.notify(lines.join("\n"));
          }
          return;
        }

        default: {
          const status = ctx.hermesBridge.getStatus();
          piCtx.ui.notify(
            `Learning: ${status.isPaused ? "paused" : "active"}\n` +
            `Skills: ${status.totalSkills}\n\n` +
            `Subcommands: status, pause, resume, force, history`
          );
        }
      }
    },
    getArgumentCompletions: (prefix: string) => {
      const subs = ["status", "pause", "resume", "force", "history"];
      return subs.filter(s => s.startsWith(prefix)).map(s => ({ value: s, label: s, description: `Learn ${s}` }));
    },
  };
}

function status_is_paused(ctx: CommandContext): boolean {
  return ctx.hermesBridge.getStatus().isPaused;
}
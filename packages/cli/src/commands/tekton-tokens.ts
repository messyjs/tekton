import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag, formatBox } from "./types.js";

export function createTokensCommand(): CommandRegistration {
  return {
    name: "tekton:tokens",
    description: "Token usage, cost estimates, and budget management",
    subcommands: {
      "summary": "Show token usage summary",
      "report": "Show daily token usage report",
      "budget": "Set or show token budget",
      "reset": "Reset token counters (with confirmation)",
    },
    handler: async (args, ctx, _pi, piCtx) => {
      const sub = args.subcommand;

      switch (sub) {
        case "summary": {
          const tokensByModel = ctx.telemetry.getTokensByModel();
          const costEst = ctx.telemetry.getCostEstimate();
          const compressionStats = ctx.telemetry.getCompressionStats();

          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify({ tokensByModel, costEstimate: costEst, compression: compressionStats }, null, 2));
          } else {
            const totalTokens = Object.values(tokensByModel as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
            const rows: Array<[string, string]> = [
              ["Total tokens", String(totalTokens)],
              ["Est. cost", `$${costEst.toFixed(4)}`],
              ["Tokens saved", `${compressionStats.totalSaved}`],
            ];
            for (const [model, tokens] of Object.entries(tokensByModel)) {
              rows.push([`  ${model}`, String(tokens)]);
            }
            piCtx.ui.notify(formatBox("Token Summary", rows));
          }
          return;
        }

        case "report": {
          const days = args.positional[0] ? parseInt(args.positional[0]) : 7;
          const tokensByDay = ctx.telemetry.getTokensByDay(days);

          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify(tokensByDay, null, 2));
          } else {
            if (tokensByDay.length === 0) {
              piCtx.ui.notify("No token data available for the specified period.");
            } else {
              const lines = [`Token usage (last ${days} days):\n`];
              for (const { date, tokens } of tokensByDay) {
                lines.push(`  ${date}: ${tokens.toLocaleString()} tokens`);
              }
              piCtx.ui.notify(lines.join("\n"));
            }
          }
          return;
        }

        case "budget": {
          const budgetConfig = ctx.config.budget;
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify(budgetConfig, null, 2));
          } else {
            const rows: Array<[string, string]> = [
              ["Daily limit", budgetConfig.dailyLimit ? `${budgetConfig.dailyLimit} tokens` : "unlimited"],
              ["Session limit", budgetConfig.sessionLimit ? `${budgetConfig.sessionLimit} tokens` : "unlimited"],
              ["Warn at", `${budgetConfig.warnPercent}%`],
            ];
            piCtx.ui.notify(formatBox("Token Budget", rows));
          }
          return;
        }

        case "reset": {
          if (!(args.flags.force === true)) {
            piCtx.ui.notify("⚠️ This will reset token counters. Use --force to confirm.");
            return;
          }
          piCtx.ui.notify("⚠️ Token counter reset requires restarting the session. Use /tekton:config to manage telemetry settings.");
          return;
        }

        default: {
          const tokensByModel = ctx.telemetry.getTokensByModel();
          const costEst = ctx.telemetry.getCostEstimate();
          const totalTokens = Object.values(tokensByModel as Record<string, number>).reduce((a: number, b: number) => a + b, 0);

          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify({ totalTokens, costEstimate: costEst, tokensByModel }, null, 2));
          } else {
            piCtx.ui.notify(`Token usage: ${totalTokens.toLocaleString()} tokens ($${costEst.toFixed(4)})\n\nSubcommands: summary, report, budget, reset`);
          }
        }
      }
    },
    getArgumentCompletions: (prefix: string) => {
      const subs = ["summary", "report", "budget", "reset"];
      return subs.filter(s => s.startsWith(prefix)).map(s => ({ value: s, label: s, description: `Tokens ${s}` }));
    },
  };
}
import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag, formatBox } from "./types.js";
import type { CommandRegistry } from "./registry.js";

export function createTektonCommand(registry: CommandRegistry): CommandRegistration {
  return {
    name: "tekton",
    description: "Show Tekton status dashboard",
    handler: async (args, ctx, pi, piCtx) => {
      const status = ctx.hermesBridge.getStatus();
      const decisions = ctx.modelRouter.getRecentDecisions(1);
      const compressionStats = ctx.telemetry.getCompressionStats();
      const model = decisions[0]?.model ?? ctx.config.models.fast.model;
      const route = ctx.modelRouter.getMode();

      if (hasJsonFlag(args)) {
        piCtx.ui.notify(JSON.stringify({
          model,
          route,
          skills: status.totalSkills,
          learning: !status.isPaused,
          compression: { saved: compressionStats.totalSaved, ratio: compressionStats.averageRatio },
          confidence: status.averageConfidence,
        }, null, 2));
        return;
      }

      const rows: Array<[string, string | number]> = [
        ["Model", model],
        ["Route", route],
        ["Skills", status.totalSkills],
        ["Learning", status.isPaused ? "paused" : "active"],
        ["Confidence", status.averageConfidence.toFixed(2)],
        ["Compress", `saved: ${compressionStats.totalSaved} tokens`],
        ["Avg Ratio", compressionStats.averageRatio.toFixed(3)],
      ];

      piCtx.ui.notify(formatBox("T E K T O N   Status", rows));
    },
  };
}
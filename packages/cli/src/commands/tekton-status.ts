import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag, formatBox } from "./types.js";

export function createStatusCommand(): CommandRegistration {
  return {
    name: "tekton:status",
    description: "Show detailed Tekton status (model, route, skills, memory, uptime)",
    handler: async (args, ctx, _pi, piCtx) => {
      const status = ctx.hermesBridge.getStatus();
      const decisions = ctx.modelRouter.getRecentDecisions(5);
      const compressionStats = ctx.telemetry.getCompressionStats();
      const routingStats = ctx.telemetry.getRoutingStats();
      const costEst = ctx.telemetry.getCostEstimate();
      const model = decisions[0]?.model ?? ctx.config.models.fast.model;
      const route = ctx.modelRouter.getMode();
      const memory = ctx.memory.getMemory();
      const userModel = ctx.memory.getUserModel();
      const soulLen = ctx.soul.getSoul().length;
      const personalityOverlay = ctx.personality.hasOverlay();

      if (hasJsonFlag(args)) {
        piCtx.ui.notify(JSON.stringify({
          model,
          route,
          skills: { count: status.totalSkills, avgConfidence: status.averageConfidence, usageRecords: status.totalUsageRecords },
          learning: { active: !status.isPaused, recentEvaluations: status.recentEvaluations.length },
          compression: { totalSaved: compressionStats.totalSaved, avgRatio: compressionStats.averageRatio },
          memory: { chars: memory.length, userPrefs: Object.keys(userModel.preferences).length, corrections: userModel.corrections.length },
          routing: { fast: routingStats.fastCount, deep: routingStats.deepCount },
          costEstimate: costEst,
          soul: { length: soulLen },
          personality: { hasOverlay: personalityOverlay },
        }, null, 2));
        return;
      }

      const recentDecisions = decisions.slice(0, 3).map(d =>
        `  ${d.model} (${d.provider}) — ${d.reason} [${d.complexityScore.toFixed(2)}]`
      ).join("\n");

      const rows: Array<[string, string | number]> = [
        ["Model", model],
        ["Route", route],
        ["Skills", status.totalSkills],
        ["Learning", status.isPaused ? "paused" : "active"],
        ["Confidence", status.averageConfidence.toFixed(2)],
        ["Memory", `${memory.length} chars`],
        ["User Prefs", Object.keys(userModel.preferences).length],
        ["Compress", `saved: ${compressionStats.totalSaved} tokens`],
        ["Routing", `${routingStats.fastCount} fast / ${routingStats.deepCount} deep`],
        ["Cost est.", `$${costEst.toFixed(4)}`],
        ["Soul", `${soulLen} chars`],
        ["Personality", personalityOverlay ? "overlay active" : "default"],
      ];

      const box = formatBox("T E K T O N   Detailed Status", rows);
      const extra = recentDecisions ? `\n\nRecent routing decisions:\n${recentDecisions}` : "";

      piCtx.ui.notify(box + extra);
    },
  };
}
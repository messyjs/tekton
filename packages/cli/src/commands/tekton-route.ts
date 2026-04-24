import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag, formatBox, formatTable } from "./types.js";
import type { RoutingMode } from "@tekton/core";

export function createRouteCommand(): CommandRegistration {
  return {
    name: "tekton:route",
    description: "Show or change routing mode; show recent decisions and rules",
    subcommands: {
      "auto": "Set routing to auto (complexity-based)",
      "fast": "Set routing to fast (always use fast model)",
      "deep": "Set routing to deep (always use deep model)",
      "rules": "Set routing to rules (rule-based routing)",
      "rules-list": "List all routing rules",
      "rules-add": "Add a routing rule",
      "rules-remove": "Remove a routing rule by ID",
    },
    handler: async (args, ctx, _pi, piCtx) => {
      const modes: RoutingMode[] = ["auto", "fast", "deep", "rules"];
      const sub = args.subcommand;

      // Set routing mode
      if (sub && modes.includes(sub as RoutingMode)) {
        ctx.modelRouter.setMode(sub as RoutingMode);

        if (hasJsonFlag(args)) {
          piCtx.ui.notify(JSON.stringify({ mode: sub }, null, 2));
        } else {
          piCtx.ui.notify(`🔀 Routing mode set to: ${sub}`);
        }
        return;
      }

      // List routing rules
      if (sub === "rules-list") {
        const engine = ctx.modelRouter.getRulesEngine();
        const rules = engine.listRules();

        if (hasJsonFlag(args)) {
          piCtx.ui.notify(JSON.stringify(rules, null, 2));
          return;
        }

        if (rules.length === 0) {
          piCtx.ui.notify("No routing rules configured.");
          return;
        }

        const rows = rules.map(r => [
          r.enabled ? "✓" : "✗",
          r.id,
          r.name.slice(0, 30),
          String(r.priority),
          `${r.action.model} → ${r.action.provider}`,
          r.conditions.map(c => `${c.type}:${c.value}`).join(" & ").slice(0, 40),
        ] as [string, string, string, string, string, string]);

        let output = formatTable(["On", "ID", "Name", "Pri", "Target", "Conditions"], rows);
        piCtx.ui.notify(output);
        return;
      }

      // Remove a routing rule
      if (sub === "rules-remove") {
        const ruleId = args.positional?.[0];
        if (!ruleId) {
          piCtx.ui.notify("Usage: tekton:route rules-remove <rule-id>");
          return;
        }
        const engine = ctx.modelRouter.getRulesEngine();
        const removed = engine.removeRule(ruleId);
        piCtx.ui.notify(removed ? `Rule "${ruleId}" removed` : `Rule "${ruleId}" not found`);
        return;
      }

      // Show current status (default)
      const current = ctx.modelRouter.getMode();
      const recent = ctx.modelRouter.getRecentDecisions(5);
      const engine = ctx.modelRouter.getRulesEngine();
      const costTracker = ctx.modelRouter.getCostTracker();

      if (hasJsonFlag(args)) {
        piCtx.ui.notify(JSON.stringify({
          mode: current,
          rules: engine.listRules().length,
          recentDecisions: recent.map(d => ({
            model: d.model,
            provider: d.provider,
            reason: d.reason,
            complexity: d.complexityScore,
            cost: d.estimatedCost,
            ruleMatch: d.ruleMatch,
          })),
          totalCost: costTracker.getTotalCost(),
        }, null, 2));
        return;
      }

      const rows: Array<[string, string]> = [
        ["Mode", current],
        ["Rules", `${engine.listRules().length} active`],
        ["Total cost", `$${costTracker.getTotalCost().toFixed(4)}`],
      ];

      let output = formatBox("Routing", rows);

      // Recent decisions
      if (recent.length > 0) {
        output += "\n\nRecent decisions:\n";
        output += recent.map(d => {
          let line = `  ${d.model} (${d.provider}) — ${d.reason} [${d.complexityScore.toFixed(2)}, $${d.estimatedCost.toFixed(4)}]`;
          if (d.ruleMatch) line += ` 🔹rule:${d.ruleMatch}`;
          return line;
        }).join("\n");
      }

      output += "\n\nModes: auto, fast, deep, rules";
      output += "\nSubcommands: rules-list, rules-remove";
      piCtx.ui.notify(output);
    },
    getArgumentCompletions: (prefix: string) => {
      const modes = ["auto", "fast", "deep", "rules", "rules-list", "rules-remove"];
      return modes.filter(m => m.startsWith(prefix)).map(m => ({ value: m, label: m, description: `Set routing to ${m}` }));
    },
  };
}
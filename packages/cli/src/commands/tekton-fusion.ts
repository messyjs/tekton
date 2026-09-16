import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag, formatBox, formatTable } from "./types.js";
import type { FusionEngine, FusionMode, FusionConfig, FusionModelEntry } from "@tekton/core";

export function createFusionCommand(): CommandRegistration {
  return {
    name: "tekton:fusion",
    description: "Manage multi-model Fusion - combine responses from multiple AI models",
    subcommands: {
      "on": "Enable fusion", "off": "Disable fusion", "status": "Show config and stats",
      "mode": "Set strategy", "models": "List models", "add": "Add model",
      "remove": "Remove model", "stats": "Show statistics", "history": "Show history",
      "reset": "Reset statistics", "config": "Show/update config",
      "judge": "Configure judge", "budget": "Set cost limit", "test": "Test setup",
      "uncensored": "Toggle uncensored mode for fusion responses",
    },
    handler: async (args, ctx, _pi, piCtx) => {
      const fusion = ctx.fusionEngine;
      if (!fusion) { piCtx.ui.notify("Fusion engine not available."); return; }
      const sub = args.subcommand;
      if (sub === "on") { fusion.enable(); const m = args.positional[0] as FusionMode | undefined; if (m && ["parallel","cascade","vote","merge","tournament","openrouter"].includes(m)) { fusion.setMode(m); piCtx.ui.notify("Fusion enabled: " + m); } else { piCtx.ui.notify("Fusion enabled"); } }
      else if (sub === "off") { fusion.disable(); piCtx.ui.notify("Fusion disabled"); }
      else if (sub === "mode") { const m = args.positional[0] as FusionMode | undefined; if (!m) { piCtx.ui.notify("Usage: /tekton:fusion mode <parallel|cascade|vote|merge|tournament|openrouter|off>"); return; } const valid: FusionMode[] = ["off","openrouter","parallel","cascade","vote","merge","tournament"]; if (!valid.includes(m)) { piCtx.ui.notify("Invalid mode"); return; } fusion.setMode(m); piCtx.ui.notify("Fusion mode: " + m); }
      else if (sub === "uncensored") { const action = args.positional[0]; const cfg = fusion.getConfig(); if (!action || action === "status") { piCtx.ui.notify("Uncensored mode: " + (cfg.uncensoredMode ? "ON - models will respond without restrictions" : "OFF - standard safety prompts apply")); return; } if (action === "on") { fusion.updateConfig({ uncensoredMode: true }); piCtx.ui.notify("Uncensored mode ON - fusion responses will be unfiltered and comprehensive"); } else if (action === "off") { fusion.updateConfig({ uncensoredMode: false }); piCtx.ui.notify("Uncensored mode OFF - standard safety prompts restored"); } else { piCtx.ui.notify("Usage: /tekton:fusion uncensored <on|off|status>"); } }
      else if (sub === "add") { const model = args.positional[0]; const provider = args.positional[1]; const weight = parseFloat(args.positional[2] ?? "1.0"); const role = (args.positional[3] ?? "primary") as FusionModelEntry["role"]; if (!model || !provider) { piCtx.ui.notify("Usage: /tekton:fusion add <model> <provider> [weight] [role]"); return; } fusion.addModel({ model, provider, weight: isNaN(weight) ? 1.0 : weight, role, active: true }); piCtx.ui.notify("Added " + model); }
      else if (sub === "remove") { const m = args.positional[0]; const p = args.positional[1]; if (!m || !p) { piCtx.ui.notify("Usage: /tekton:fusion remove <model> <provider>"); return; } piCtx.ui.notify(fusion.removeModel(m, p) ? "Removed" : "Not found"); }
      else if (sub === "reset") { fusion.resetStats(); piCtx.ui.notify("Statistics reset"); }
      else if (sub === "judge") { const a = args.positional[0]; if (!a) { piCtx.ui.notify("Judge: " + (fusion.getConfig().useJudge ? fusion.getConfig().judgeModel : "disabled")); return; } if (a === "off") { fusion.updateConfig({ useJudge: false }); piCtx.ui.notify("Judge disabled"); return; } fusion.updateConfig({ useJudge: true, judgeModel: a === "on" ? (args.positional[1] ?? fusion.getConfig().judgeModel) : a }); piCtx.ui.notify("Judge updated"); }
      else if (sub === "budget") { const amt = args.positional[0]; if (!amt) { piCtx.ui.notify("Budget: $" + fusion.getConfig().maxExtraCost.toFixed(4) + "/call"); return; } const b = parseFloat(amt); if (isNaN(b) || b < 0) { piCtx.ui.notify("Usage: /tekton:fusion budget <amount>"); return; } fusion.updateConfig({ maxExtraCost: b }); piCtx.ui.notify("Budget: $" + b.toFixed(4) + "/call"); }
      else { const c = fusion.getConfig(); const s = fusion.getStats(); const en = fusion.isEnabled(); const m = fusion.getMode(); const am = fusion.getActiveModels();
        if (hasJsonFlag(args)) { piCtx.ui.notify(JSON.stringify({ enabled: en, mode: m, config: c, stats: s, activeModels: am }, null, 2)); return; }
        const rows: Array<[string, string]> = [["Status", en ? "Enabled" : "Disabled"], ["Strategy", m], ["Models", am.length + " active"], ["Auto-select", c.autoSelect ? "On" : "Off"], ["Judge", c.useJudge ? c.judgeModel : "Off"], ["Uncensored", c.uncensoredMode ? "ON" : "Off"], ["Budget/call", "$" + c.maxExtraCost.toFixed(4)]];
        let out = formatBox("Fusion Engine", rows);
        if (am.length > 0) { out += "\n\nActive models:"; for (const x of am) out += "\n  * " + x.model + " (" + x.provider + ") [" + x.role + "]"; }
        if (s.totalFusionCalls > 0) out += "\n\nCalls: " + s.totalFusionCalls + " | Improvement: " + (s.averageImprovement * 100).toFixed(1) + "%";
        out += "\n\nSubcommands: on, off, mode, models, add, remove, stats, config, judge, budget, test, uncensored";
        piCtx.ui.notify(out);
      }
    },
    getArgumentCompletions: (prefix: string) => {
      const subs = ["on", "off", "status", "mode", "models", "add", "remove", "stats", "history", "reset", "config", "judge", "budget", "test", "uncensored"];
      return subs.filter(s => s.startsWith(prefix)).map(s => ({ value: s, label: s, description: "Fusion " + s }));
    },
  };
}

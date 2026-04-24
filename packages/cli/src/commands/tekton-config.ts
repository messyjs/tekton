import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag, formatBox } from "./types.js";

export function createConfigCommand(): CommandRegistration {
  return {
    name: "tekton:config",
    description: "View and manage Tekton configuration",
    subcommands: {
      "show": "Show current configuration",
      "set": "Set a config value (dot-notation path)",
      "reset": "Reset config to defaults (with confirmation)",
      "export": "Export config as JSON",
      "import": "Import config from JSON (stub)",
    },
    handler: async (args, ctx, _pi, piCtx) => {
      const sub = args.subcommand;

      switch (sub) {
        case "show": {
          const key = args.positional[0];
          if (key) {
            const value = getConfigValue(ctx.config, key);
            if (value === undefined) {
              piCtx.ui.notify(`Config key "${key}" not found.`);
            } else {
              piCtx.ui.notify(typeof value === "string" ? value : JSON.stringify(value, null, 2));
            }
          } else {
            if (hasJsonFlag(args)) {
              piCtx.ui.notify(JSON.stringify(ctx.config, null, 2));
            } else {
              const rows: Array<[string, string]> = [
                ["fast model", `${ctx.config.models.fast.model} [${ctx.config.models.fast.provider}]`],
                ["deep model", `${ctx.config.models.deep.model} [${ctx.config.models.deep.provider}]`],
                ["route mode", ctx.modelRouter.getMode()],
                ["compression", `${ctx.config.compression.defaultTier}${ctx.config.compression.enabled ? "" : " (disabled)"}`],
                ["learning", ctx.config.learning.enabled ? "enabled" : "disabled"],
                ["dashboard", `port ${ctx.config.dashboard.port}`],
                ["budget", ctx.config.budget.dailyLimit ? `${ctx.config.budget.dailyLimit} tokens/day` : "unlimited"],
                ["memory", ctx.config.memory.provider],
                ["tekton home", ctx.tektonHome],
              ];
              piCtx.ui.notify(formatBox("Tekton Config", rows));
            }
          }
          return;
        }

        case "set": {
          const key = args.positional[0];
          const value = args.positional[1];
          if (!key) {
            piCtx.ui.notify("Usage: /tekton:config set <key> <value>\nExample: /tekton:config set models.fast.model gemma3:27b");
            return;
          }
          if (!value) {
            piCtx.ui.notify(`Usage: /tekton:config set <key> <value>\nKey: ${key}\nCurrent value: ${JSON.stringify(getConfigValue(ctx.config, key))}`);
            return;
          }
          piCtx.ui.notify(`⚠️ Runtime config changes are not persisted yet. Modify ~/.tekton/config.yaml directly.\nWanted: set ${key} = ${value}`);
          return;
        }

        case "reset": {
          if (!args.flags.force) {
            piCtx.ui.notify("⚠️ This will reset config to defaults. Use --force to confirm.");
            return;
          }
          piCtx.ui.notify("⚠️ Config reset requires editing ~/.tekton/config.yaml and restarting.");
          return;
        }

        case "export": {
          piCtx.ui.notify(JSON.stringify(ctx.config, null, 2));
          return;
        }

        case "import": {
          piCtx.ui.notify("⚠️ Config import is a stub. Edit ~/.tekton/config.yaml directly.");
          return;
        }

        default: {
          const rows: Array<[string, string]> = [
            ["fast model", `${ctx.config.models.fast.model} [${ctx.config.models.fast.provider}]`],
            ["deep model", `${ctx.config.models.deep.model} [${ctx.config.models.deep.provider}]`],
            ["route mode", ctx.modelRouter.getMode()],
            ["compression", ctx.config.compression.defaultTier],
            ["learning", ctx.config.learning.enabled ? "enabled" : "disabled"],
          ];
          piCtx.ui.notify(formatBox("Config Overview", rows) + "\n\nSubcommands: show, set, reset, export, import");
        }
      }
    },
    getArgumentCompletions: (prefix: string) => {
      const subs = ["show", "set", "reset", "export", "import"];
      return subs.filter(s => s.startsWith(prefix)).map(s => ({ value: s, label: s, description: `Config ${s}` }));
    },
  };
}

function getConfigValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
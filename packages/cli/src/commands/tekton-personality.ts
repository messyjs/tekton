import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag, formatBox } from "./types.js";
import { PERSONALITY_PRESETS } from "@tekton/core";

export function createPersonalityCommand(): CommandRegistration {
  return {
    name: "tekton:personality",
    description: "Set, clear, or list personality overlays",
    subcommands: {
      "list": "List available personality presets",
      "set": "Set a personality overlay (preset name or custom text)",
      "clear": "Clear the current personality overlay",
      "show": "Show the current effective personality",
    },
    handler: async (args, ctx, _pi, piCtx) => {
      const sub = args.subcommand;

      switch (sub) {
        case "list": {
          const presets = Object.keys(PERSONALITY_PRESETS);
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify(presets, null, 2));
          } else {
            const lines = ["Available personality presets:\n"];
            for (const name of presets) {
              const desc = PERSONALITY_PRESETS[name as keyof typeof PERSONALITY_PRESETS].split("\n")[0]?.replace(/^# Overlay: /, "") ?? "";
              lines.push(`  ${name.padEnd(12)} ${desc}`);
            }
            lines.push("\nUsage: /tekton:personality set <preset> or /tekton:personality set <custom text>");
            piCtx.ui.notify(lines.join("\n"));
          }
          return;
        }

        case "set": {
          const presetOrText = args.positional.join(" ");
          if (!presetOrText) {
            piCtx.ui.notify("Usage: /tekton:personality set <preset-name|custom text>\nPresets: " + Object.keys(PERSONALITY_PRESETS).join(", "));
            return;
          }
          ctx.personality.setOverlay(presetOrText);
          const isPreset = presetOrText in PERSONALITY_PRESETS;
          piCtx.ui.notify(`✅ Personality overlay set${isPreset ? ` (preset: ${presetOrText})` : " (custom)"}`);
          return;
        }

        case "clear": {
          ctx.personality.clearOverlay();
          piCtx.ui.notify("✅ Personality overlay cleared. Using default SOUL.md.");
          return;
        }

        case "show": {
          const personality = ctx.personality.getEffectivePersonality();
          const hasOverlay = ctx.personality.hasOverlay();
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify({ personality, hasOverlay }, null, 2));
          } else {
            const rows: Array<[string, string]> = [
              ["Overlay", hasOverlay ? "active" : "none"],
              ["Length", `${personality.length} chars`],
            ];
            piCtx.ui.notify(formatBox("Personality", rows) + "\n\n" + personality.slice(0, 500) + (personality.length > 500 ? "..." : ""));
          }
          return;
        }

        default: {
          const hasOverlay = ctx.personality.hasOverlay();
          piCtx.ui.notify(
            `👤 Personality: ${hasOverlay ? "overlay active" : "default (SOUL.md)"}\n\n` +
            `Subcommands: list, set, clear, show`
          );
        }
      }
    },
    getArgumentCompletions: (prefix: string) => {
      const subs = ["list", "set", "clear", "show"];
      const matches = subs.filter(s => s.startsWith(prefix));
      // Also suggest preset names if subcommand is "set"
      const presets = Object.keys(PERSONALITY_PRESETS);
      return [...matches.map(s => ({ value: s, label: s, description: `Personality ${s}` })),
              ...presets.filter(p => p.startsWith(prefix)).map(p => ({ value: p, label: p, description: "Personality preset" }))];
    },
  };
}
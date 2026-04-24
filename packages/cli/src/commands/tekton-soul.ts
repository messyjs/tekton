import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag } from "./types.js";

export function createSoulCommand(): CommandRegistration {
  return {
    name: "tekton:soul",
    description: "View and edit the SOUL.md identity file",
    subcommands: {
      "show": "Show current SOUL.md content",
      "edit": "Edit SOUL.md content (set new content)",
      "reset": "Reset SOUL.md to default (with confirmation)",
    },
    handler: async (args, ctx, pi, piCtx) => {
      const sub = args.subcommand;

      switch (sub) {
        case "show": {
          const soul = ctx.soul.getSoul();
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify({ soul, length: soul.length }, null, 2));
          } else {
            piCtx.ui.notify(`📜 SOUL.md (${soul.length} chars):\n\n${soul}`);
          }
          return;
        }

        case "edit": {
          const content = args.positional.join(" ");
          if (!content) {
            // Open editor mode using Pi's UI
            const currentSoul = ctx.soul.getSoul();
            const newContent = await piCtx.ui.input("Edit SOUL.md", currentSoul);
            if (newContent !== undefined && newContent.trim().length > 0) {
              ctx.soul.setSoul(newContent);
              piCtx.ui.notify("✅ SOUL.md updated.");
            } else {
              piCtx.ui.notify("Edit cancelled.");
            }
            return;
          }
          ctx.soul.setSoul(content);
          await ctx.memory.flush();
          piCtx.ui.notify("✅ SOUL.md updated.");
          return;
        }

        case "reset": {
          if (!args.flags.force) {
            piCtx.ui.notify("⚠️ This will reset SOUL.md to the default. Use --force to confirm.");
            return;
          }
          ctx.soul.seedDefault();
          piCtx.ui.notify("✅ SOUL.md reset to default.");
          return;
        }

        default: {
          const soul = ctx.soul.getSoul();
          const preview = soul.length > 200 ? soul.slice(0, 200) + "..." : soul;
          piCtx.ui.notify(
            `📜 SOUL.md (${soul.length} chars)\n\n${preview}\n\nSubcommands: show, edit, reset`
          );
        }
      }
    },
    getArgumentCompletions: (prefix: string) => {
      const subs = ["show", "edit", "reset"];
      return subs.filter(s => s.startsWith(prefix)).map(s => ({ value: s, label: s, description: `Soul ${s}` }));
    },
  };
}
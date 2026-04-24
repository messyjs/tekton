/**
 * /tekton:context — Show and manage Context Engineer status and settings.
 */
import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag, formatBox } from "./types.js";
import { ContextEngineer } from "@tekton/core";

export function createContextCommand(): CommandRegistration {
  return {
    name: "tekton:context",
    description: "Manage Context Engineer settings and view status",
    subcommands: {
      "on": "Enable Context Engineer",
      "off": "Disable Context Engineer (fall back to caveman compression)",
      "stats": "Show compression stats and precision items",
      "pin": "Pin a precision item so it's never superseded",
      "log": "Show current precision log",
      "mode": "Switch context mode (context-engineer | caveman | raw)",
    },
    handler: async (args, ctx, _pi, piCtx) => {
      const sub = args.subcommand;

      switch (sub) {
        case "on": {
          const config = ctx.config as any;
          if (config.contextEngineer) {
            config.contextEngineer.enabled = true;
          } else {
            config.contextEngineer = { enabled: true };
          }
          const session = (ctx as any).session;
          if (session?.contextEngineer) {
            (session.contextEngineer as any).enabled = true;
          }
          piCtx.ui.notify("Context Engineer enabled. Using precision log + rolling rewrite for active sessions.");
          return;
        }

        case "off": {
          const config = ctx.config as any;
          if (config.contextEngineer) {
            config.contextEngineer.enabled = false;
          }
          piCtx.ui.notify("Context Engineer disabled. Falling back to caveman compression.");
          return;
        }

        case "stats": {
          const session = (ctx as any).session;
          const ce: ContextEngineer | undefined = session?.contextEngineer;
          if (!ce) {
            piCtx.ui.notify("No active Context Engineer session. Start a session first.");
            return;
          }
          const stats = ce.getStats();
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify(stats, null, 2));
          } else {
            const rows: Array<[string, string]> = [
              ["Total messages", String(stats.totalMessages)],
              ["Raw window", String(stats.rawWindowMessages)],
              ["Precision items", String(stats.precisionItems)],
              ["Superseded items", String(stats.supersededItems)],
              ["Rolling context tokens", String(stats.rollingContextTokens)],
              ["Precision log tokens", String(stats.precisionLogTokens)],
              ["Compression ratio", stats.compressionRatio.toFixed(3)],
              ["Last rewrite at msg", String(stats.lastRewriteAt)],
            ];
            piCtx.ui.notify(formatBox("Context Engineer Stats", rows));
          }
          return;
        }

        case "pin": {
          const text = args.positional?.join(" ") ?? "";
          if (!text) {
            piCtx.ui.notify("Usage: /tekton:context pin <text to pin>");
            return;
          }
          const session = (ctx as any).session;
          const ce: ContextEngineer | undefined = session?.contextEngineer;
          if (!ce) {
            piCtx.ui.notify("No active Context Engineer session.");
            return;
          }
          ce.pinItem({
            category: "pinned",
            value: text,
            context: "Manually pinned by user",
          });
          piCtx.ui.notify(`Pinned: "${text}"`);
          return;
        }

        case "log": {
          const session = (ctx as any).session;
          const ce: ContextEngineer | undefined = session?.contextEngineer;
          if (!ce) {
            piCtx.ui.notify("No active Context Engineer session.");
            return;
          }
          const log = ce.getPrecisionLog();
          piCtx.ui.notify(log || "(No precision items yet)");
          return;
        }

        case "mode": {
          const mode = args.positional?.[0];
          if (!mode) {
            const config = ctx.config as any;
            const currentMode = config?.session?.contextMode ?? "context-engineer";
            piCtx.ui.notify(
              `Current mode: ${currentMode}\n\n` +
              "Modes:\n" +
              "  context-engineer — Precision log + rolling rewrite (default)\n" +
              "  caveman — Caveman compression for older messages (cheaper)\n" +
              "  raw — No compression, full history sent every time"
            );
            return;
          }
          const validModes = ["context-engineer", "caveman", "raw"];
          if (!validModes.includes(mode)) {
            piCtx.ui.notify(`Invalid mode: ${mode}. Valid modes: ${validModes.join(", ")}`);
            return;
          }
          const config = ctx.config as any;
          if (config.session) {
            config.session.contextMode = mode;
          } else {
            config.session = { contextMode: mode };
          }
          piCtx.ui.notify(`Context mode set to: ${mode}`);
          return;
        }

        default: {
          const config = ctx.config as any;
          const ceEnabled = config?.contextEngineer?.enabled ?? true;
          const currentMode = config?.session?.contextMode ?? "context-engineer";

          const rows: Array<[string, string]> = [
            ["Status", ceEnabled ? "enabled" : "disabled"],
            ["Mode", currentMode],
            ["Model", config?.contextEngineer?.model ?? "gemini-flash"],
            ["Raw window size", String(config?.contextEngineer?.rawWindowSize ?? 12)],
            ["Rewrite interval", String(config?.contextEngineer?.rewriteInterval ?? 10)],
          ];
          piCtx.ui.notify(formatBox("Context Engineer", rows));
        }
      }
    },
  };
}
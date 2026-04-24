import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag } from "./types.js";

export function createCronCommand(): CommandRegistration {
  return {
    name: "tekton:cron",
    description: "Schedule and manage recurring tasks",
    subcommands: {
      "list": "List scheduled cron tasks",
      "create": "Create a new cron task",
      "update": "Update an existing cron task",
      "pause": "Pause a cron task",
      "resume": "Resume a paused cron task",
      "run": "Run a cron task immediately",
      "remove": "Remove a cron task (with confirmation)",
    },
    handler: async (args, _ctx, _pi, piCtx) => {
      const sub = args.subcommand;

      // Cron is stub functionality - the tools package has a cronjob tool
      // but the CLI command just provides management UI

      switch (sub) {
        case "list": {
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify({ tasks: [] }, null, 2));
          } else {
            piCtx.ui.notify("No cron tasks scheduled.\n\nUse /tekton:cron create to add a scheduled task.");
          }
          return;
        }

        case "create": {
          const taskName = args.positional[0];
          if (!taskName) {
            piCtx.ui.notify("Usage: /tekton:cron create <name> --schedule <cron> --task <description>");
            return;
          }
          piCtx.ui.notify(`⚠️ Cron task creation for "${taskName}" requires the cron subsystem.\nConfigure cron tasks in ~/.tekton/crontab.yaml`);
          return;
        }

        case "update":
        case "pause":
        case "resume":
        case "run": {
          const taskName = args.positional[0] ?? sub;
          piCtx.ui.notify(`⚠️ Cron ${sub} for "${taskName}" requires the cron subsystem (Phase 10+).`);
          return;
        }

        case "remove": {
          const taskName = args.positional[0];
          if (!taskName) {
            piCtx.ui.notify("Usage: /tekton:cron remove <name>");
            return;
          }
          if (!args.flags.force) {
            piCtx.ui.notify(`⚠️ This will remove cron task "${taskName}". Use --force to confirm.`);
            return;
          }
          piCtx.ui.notify(`🗑️ Cron task "${taskName}" removal requires the cron subsystem.`);
          return;
        }

        default: {
          piCtx.ui.notify(
            "⏰ Cron Task Management\n\n" +
            "No cron tasks scheduled.\n\n" +
            "Subcommands: list, create, update, pause, resume, run, remove"
          );
        }
      }
    },
    getArgumentCompletions: (prefix: string) => {
      const subs = ["list", "create", "update", "pause", "resume", "run", "remove"];
      return subs.filter(s => s.startsWith(prefix)).map(s => ({ value: s, label: s, description: `Cron ${s}` }));
    },
  };
}
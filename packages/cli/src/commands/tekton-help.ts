import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import type { CommandRegistry } from "./registry.js";
import { hasJsonFlag } from "./types.js";

export function createHelpCommand(registry: CommandRegistry): CommandRegistration {
  return {
    name: "tekton:help",
    description: "Show help for all tekton commands or a specific command",
    handler: async (args, ctx, _pi, piCtx) => {
      const cmdName = args.subcommand || args.positional[0];

      if (cmdName) {
        // Show help for a specific command
        const cmd = registry.get(cmdName.startsWith("tekton:") ? cmdName : `tekton:${cmdName}`);
        if (!cmd) {
          piCtx.ui.notify(`Unknown command: ${cmdName}`);
          return;
        }
        const help = registry.getHelp(cmd);
        piCtx.ui.notify(help);
        return;
      }

      // Show all commands
      if (hasJsonFlag(args)) {
        const commands = registry.list().map(c => ({
          name: c.name,
          description: c.description,
          subcommands: c.subcommands ? Object.keys(c.subcommands) : [],
        }));
        piCtx.ui.notify(JSON.stringify(commands, null, 2));
        return;
      }

      piCtx.ui.notify(registry.getFullHelp());
    },
    getArgumentCompletions: (prefix: string) => {
      // This will be populated after registration
      const commands = [
        "tekton", "tekton:status", "tekton:on", "tekton:off", "tekton:dashboard",
        "tekton:route", "tekton:models", "tekton:skills", "tekton:compress",
        "tekton:tokens", "tekton:memory", "tekton:agents", "tekton:config",
        "tekton:learn", "tekton:train", "tekton:gpu", "tekton:cron",
        "tekton:voice", "tekton:personality", "tekton:soul",
      ];
      return commands.filter(c => c.startsWith(prefix) || c.replace("tekton:", "").startsWith(prefix))
        .map(c => ({ value: c, label: c, description: `Help for /${c}` }));
    },
  };
}
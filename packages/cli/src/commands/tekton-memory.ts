import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag, formatBox } from "./types.js";

export function createMemoryCommand(): CommandRegistration {
  return {
    name: "tekton:memory",
    description: "View, search, add, and manage long-term memory",
    subcommands: {
      "show": "Show all memory entries",
      "search": "Search memory by query",
      "add": "Add a memory entry [--category <cat>]",
      "forget": "Clear all memory (with confirmation)",
      "export": "Export memory to JSON",
      "reset": "Reset memory to empty (with confirmation)",
      "user": "Show user model (preferences, corrections, tech stack)",
    },
    handler: async (args, ctx, _pi, piCtx) => {
      const sub = args.subcommand;

      switch (sub) {
        case "show": {
          const memory = ctx.memory.getMemory();
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify({ memory }, null, 2));
          } else {
            if (!memory.trim()) {
              piCtx.ui.notify("Memory is empty.");
            } else {
              const preview = memory.length > 3000 ? memory.slice(0, 3000) + "\n... (truncated)" : memory;
              piCtx.ui.notify(`📝 Memory (${memory.length} chars):\n\n${preview}`);
            }
          }
          return;
        }

        case "search": {
          const query = args.positional.join(" ");
          if (!query) {
            piCtx.ui.notify("Usage: /tekton:memory search <query>");
            return;
          }
          const results = ctx.memory.searchMemory(query);
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify({ query, results }, null, 2));
          } else if (results.length === 0) {
            piCtx.ui.notify(`No memory matching "${query}"`);
          } else {
            piCtx.ui.notify(`Memory results for "${query}":\n\n${results.join("\n")}`);
          }
          return;
        }

        case "add": {
          const content = args.positional.join(" ");
          if (!content) {
            piCtx.ui.notify("Usage: /tekton:memory add <text> [--category <cat>]");
            return;
          }
          const category = typeof args.flags.category === "string" ? args.flags.category : undefined;
          ctx.memory.addMemory(content, category);
          await ctx.memory.flush();
          piCtx.ui.notify(`✅ Memory added${category ? ` [${category}]` : ""}`);
          return;
        }

        case "forget": {
          if (!args.flags.force) {
            piCtx.ui.notify("⚠️ This will clear ALL memory. Use --force to confirm.");
            return;
          }
          ctx.memory.clearMemory();
          await ctx.memory.flush();
          piCtx.ui.notify("🗑️ All memory cleared.");
          return;
        }

        case "export": {
          const memory = ctx.memory.getMemory();
          const userModel = ctx.memory.getUserModel();
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify({ memory, userModel }, null, 2));
          } else {
            piCtx.ui.notify(`Memory (${memory.length} chars)\nUser model (${Object.keys(userModel.preferences).length} preferences)`);
          }
          return;
        }

        case "reset": {
          if (!args.flags.force) {
            piCtx.ui.notify("⚠️ This will clear ALL memory and user model. Use --force to confirm.");
            return;
          }
          ctx.memory.clearMemory();
          ctx.memory.updateUserModel({
            preferences: {},
            corrections: [],
            commonTasks: [],
            techStack: [],
            workingHours: "",
          });
          await ctx.memory.flush();
          piCtx.ui.notify("🗑️ Memory and user model reset to empty.");
          return;
        }

        case "user": {
          const userModel = ctx.memory.getUserModel();
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify(userModel, null, 2));
          } else {
            const rows: Array<[string, string]> = [
              ["Preferences", `${Object.keys(userModel.preferences).length} entries`],
              ["Corrections", `${userModel.corrections.length} entries`],
              ["Tech stack", userModel.techStack.join(", ") || "none"],
              ["Common tasks", `${userModel.commonTasks.length} patterns`],
              ["Working hours", userModel.workingHours || "not set"],
            ];
            piCtx.ui.notify(formatBox("User Model", rows));
          }
          return;
        }

        default: {
          const memory = ctx.memory.getMemory();
          const userModel = ctx.memory.getUserModel();
          piCtx.ui.notify(
            `📝 Memory: ${memory.length} chars\n` +
            `👤 User model: ${Object.keys(userModel.preferences).length} preferences\n\n` +
            `Subcommands: show, search, add, forget, export, reset, user`
          );
        }
      }
    },
    getArgumentCompletions: (prefix: string) => {
      const subs = ["show", "search", "add", "forget", "export", "reset", "user"];
      return subs.filter(s => s.startsWith(prefix)).map(s => ({ value: s, label: s, description: `Memory ${s}` }));
    },
  };
}
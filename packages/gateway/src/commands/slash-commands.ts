/**
 * Gateway Slash Commands — Handles /tekton:* commands in messaging platforms.
 */
import type { MessageEvent, GatewaySession } from "../types.js";
import type { SessionStore } from "../session/store.js";

export interface CommandContext {
  session: GatewaySession;
  sessionStore: SessionStore;
  gatewayStatus: () => string;
}

export interface CommandResult {
  response: string;
  sessionUpdates?: Partial<GatewaySession>;
}

const COMMANDS: Record<string, {
  description: string;
  handler: (args: string, event: MessageEvent, ctx: CommandContext) => Promise<CommandResult>;
}> = {};

/** Register built-in commands */
export function registerBuiltinCommands(): void {
  COMMANDS["status"] = {
    description: "Show gateway status",
    handler: async (_args, _event, ctx) => ({
      response: ctx.gatewayStatus(),
    }),
  };

  COMMANDS["model"] = {
    description: "Switch or show current model",
    handler: async (args, _event, ctx) => {
      if (args.trim()) {
        return {
          response: `Model switched to: ${args.trim()}`,
          sessionUpdates: { currentModel: args.trim() },
        };
      }
      return {
        response: ctx.session.currentModel
          ? `Current model: ${ctx.session.currentModel}`
          : "No model set. Usage: /model <model-name>",
      };
    },
  };

  COMMANDS["personality"] = {
    description: "Switch or show current personality",
    handler: async (args, _event, ctx) => {
      if (args.trim()) {
        return {
          response: `Personality switched to: ${args.trim()}`,
          sessionUpdates: { personalityId: args.trim() },
        };
      }
      return {
        response: ctx.session.personalityId
          ? `Current personality: ${ctx.session.personalityId}`
          : "No personality set. Usage: /personality <id>",
      };
    },
  };

  COMMANDS["voice"] = {
    description: "Toggle voice replies",
    handler: async (_args, _event, ctx) => {
      const newState = !ctx.session.voiceEnabled;
      return {
        response: `Voice replies ${newState ? "enabled" : "disabled"}`,
        sessionUpdates: { voiceEnabled: newState },
      };
    },
  };

  COMMANDS["skills"] = {
    description: "Browse installed skills",
    handler: async (args, _event, ctx) => {
      const skills = ctx.session.skillsInstalled;
      if (skills.length === 0) {
        return { response: "No skills installed yet." };
      }
      const list = skills.map((s, i) => `${i + 1}. ${s}`).join("\n");
      return { response: `Installed skills:\n${list}` };
    },
  };

  COMMANDS["reset"] = {
    description: "Reset session state",
    handler: async (_args, _event, _ctx) => ({
      response: "Session reset. Previous context cleared.",
      sessionUpdates: { currentModel: null, personalityId: null, voiceEnabled: false, skillsInstalled: [] },
    }),
  };

  COMMANDS["help"] = {
    description: "Show available commands",
    handler: async (_args, _event, _ctx) => {
      const cmds = Object.entries(COMMANDS)
        .map(([name, cmd]) => `  /tekton:${name} — ${cmd.description}`)
        .join("\n");
      return { response: `Available commands:\n${cmds}` };
    },
  };
}

/** Parse a slash command from a message. Returns [command, args] or null. */
export function parseCommand(text: string): { command: string; args: string } | null {
  const match = text.match(/^\/tekton:(\w+)(?:\s+(.*))?/);
  if (!match) return null;
  return { command: match[1], args: match[2] ?? "" };
}

/** Execute a parsed command */
export async function executeCommand(
  command: string,
  args: string,
  event: MessageEvent,
  ctx: CommandContext
): Promise<CommandResult> {
  const cmd = COMMANDS[command];
  if (!cmd) {
    return { response: `Unknown command: /tekton:${command}. Type /tekton:help for available commands.` };
  }
  return cmd.handler(args, event, ctx);
}

/** Get all registered command names */
export function getCommandNames(): string[] {
  return Object.keys(COMMANDS);
}

/** Register a custom command */
export function registerCommand(name: string, description: string, handler: (args: string, event: MessageEvent, ctx: CommandContext) => Promise<CommandResult>): void {
  COMMANDS[name] = { description, handler };
}
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
/** Register built-in commands */
export declare function registerBuiltinCommands(): void;
/** Parse a slash command from a message. Returns [command, args] or null. */
export declare function parseCommand(text: string): {
    command: string;
    args: string;
} | null;
/** Execute a parsed command */
export declare function executeCommand(command: string, args: string, event: MessageEvent, ctx: CommandContext): Promise<CommandResult>;
/** Get all registered command names */
export declare function getCommandNames(): string[];
/** Register a custom command */
export declare function registerCommand(name: string, description: string, handler: (args: string, event: MessageEvent, ctx: CommandContext) => Promise<CommandResult>): void;
//# sourceMappingURL=slash-commands.d.ts.map
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { CommandRegistration, CommandContext, FeatureState } from "./types.js";
/**
 * Central registry for all /tekton:* slash commands.
 */
export declare class CommandRegistry {
    private commands;
    register(command: CommandRegistration): void;
    get(name: string): CommandRegistration | undefined;
    list(): CommandRegistration[];
    /**
     * Register all commands with Pi's ExtensionAPI.
     */
    registerAll(pi: ExtensionAPI, ctx: CommandContext): void;
    /**
     * Generate help text for a specific command.
     */
    getHelp(cmd: CommandRegistration): string;
    /**
     * Generate a full help listing for all registered commands.
     */
    getFullHelp(): string;
}
/**
 * Feature state tracker — toggled by /tekton:on and /tekton:off.
 */
export declare const featureState: FeatureState;
//# sourceMappingURL=registry.d.ts.map
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { HermesBridge } from "@tekton/hermes-bridge";
import type { ModelRouter, SoulManager, PersonalityManager, MemoryManager, TelemetryTracker, TektonConfig } from "@tekton/core";
/**
 * Command context — all Tekton subsystems available to command handlers.
 */
export interface CommandContext {
    hermesBridge: HermesBridge;
    modelRouter: ModelRouter;
    soul: SoulManager;
    personality: PersonalityManager;
    memory: MemoryManager;
    telemetry: TelemetryTracker;
    config: TektonConfig;
    tektonHome: string;
}
/**
 * Parsed args from a slash command invocation.
 */
export interface ParsedArgs {
    /** The subcommand, e.g. "list" in /tekton:skills list */
    subcommand: string;
    /** Remaining positional arguments */
    positional: string[];
    /** Named flags, e.g. { json: true, verbose: true } from --json --verbose */
    flags: Record<string, string | boolean>;
    /** The original raw args string */
    raw: string;
}
/** Whether a feature is enabled/disabled */
export interface FeatureState {
    routing: boolean;
    learning: boolean;
    compression: boolean;
}
/**
 * A registered command definition.
 */
export interface AutocompleteEntry {
    value: string;
    label: string;
    description?: string;
}
export interface CommandRegistration {
    name: string;
    description: string;
    subcommands?: Record<string, string>;
    handler: (args: ParsedArgs, ctx: CommandContext, pi: ExtensionAPI, piCtx: ExtensionCommandContext) => Promise<void>;
    getArgumentCompletions?: (argumentPrefix: string) => AutocompleteEntry[] | null;
}
export declare function parseArgs(raw: string): ParsedArgs;
export declare function hasJsonFlag(args: ParsedArgs): boolean;
export declare function formatBox(title: string, rows: Array<[string, string | number]>, width?: number): string;
export declare function formatTable(headers: string[], rows: string[][]): string;
export declare function confirmAction(piCtx: ExtensionCommandContext, message: string): Promise<boolean>;
export declare function truncate(s: string, maxLen: number): string;
//# sourceMappingURL=types.d.ts.map
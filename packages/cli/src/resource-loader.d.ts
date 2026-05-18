import { type ResourceLoader } from "@earendil-works/pi-coding-agent";
import type { HermesBridge } from "@tekton/hermes-bridge";
import { ModelRouter, type SoulManager, type PersonalityManager, type MemoryManager, type TelemetryTracker, type TektonConfig } from "@tekton/core";
import type { ParsedArgs } from "./run.js";
export interface TektonResourceLoaderConfig {
    cwd: string;
    tektonHome: string;
    parsedArgs: ParsedArgs;
    config: TektonConfig;
    hermesBridge: HermesBridge;
    modelRouter: ModelRouter;
    soul: SoulManager;
    personality: PersonalityManager;
    memory: MemoryManager;
    telemetry: TelemetryTracker;
}
/**
 * Build DefaultResourceLoaderOptions for createAgentSessionServices.
 *
 * This creates the options object that embeds Tekton's custom system prompt,
 * hooks (extension factories), and agents file overrides into Pi's default
 * resource loader.
 */
export declare function createTektonResourceLoaderOptions(config: TektonResourceLoaderConfig): Record<string, unknown>;
/**
 * Create a full ResourceLoader with Tekton customizations.
 * Used when you need a standalone ResourceLoader (e.g., for direct SDK usage).
 */
export declare function createTektonResourceLoader(config: TektonResourceLoaderConfig): ResourceLoader;
//# sourceMappingURL=resource-loader.d.ts.map
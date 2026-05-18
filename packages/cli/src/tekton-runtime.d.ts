import { type CreateAgentSessionRuntimeFactory, type AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { ModelRouter, SoulManager, PersonalityManager, TelemetryTracker, MemoryManager, AgentPool, type TektonConfig } from "@tekton/core";
import { HermesBridge } from "@tekton/hermes-bridge";
import type { ParsedArgs } from "./run.js";
export interface TektonSubsystems {
    hermesBridge: HermesBridge;
    modelRouter: ModelRouter;
    telemetry: TelemetryTracker;
    soul: SoulManager;
    personality: PersonalityManager;
    memory: MemoryManager;
    agentPool: AgentPool;
}
export declare function getTektonSubsystems(): TektonSubsystems | null;
export declare function createTektonRuntimeFactory(parsedArgs: ParsedArgs, config: TektonConfig, tektonHome: string): CreateAgentSessionRuntimeFactory;
/**
 * Create a Tekton runtime from parsed args. This is the main entry point
 * for starting any mode (interactive, print, rpc).
 */
export declare function createTektonRuntime(parsedArgs: ParsedArgs, config: TektonConfig, tektonHome: string): Promise<AgentSessionRuntime>;
//# sourceMappingURL=tekton-runtime.d.ts.map
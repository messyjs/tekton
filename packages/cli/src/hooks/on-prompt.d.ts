import type { ExtensionFactory } from "@earendil-works/pi-coding-agent";
import type { HermesBridge } from "@tekton/hermes-bridge";
import type { ModelRouter, SoulManager, PersonalityManager, MemoryManager, TelemetryTracker, TektonConfig } from "@tekton/core";
export interface HookConfig {
    hermesBridge: HermesBridge;
    modelRouter: ModelRouter;
    soul: SoulManager;
    personality: PersonalityManager;
    memory: MemoryManager;
    telemetry: TelemetryTracker;
    config: TektonConfig;
    tektonHome: string;
}
export declare function createOnPromptHook(config: HookConfig): ExtensionFactory;
//# sourceMappingURL=on-prompt.d.ts.map
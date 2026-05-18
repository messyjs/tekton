import { type ToolDefinition } from "@earendil-works/pi-coding-agent";
import type { HermesBridge } from "@tekton/hermes-bridge";
import type { MemoryManager, AgentPool } from "@tekton/core";
export declare function createDelegateTool(pool: AgentPool): ToolDefinition;
export declare const delegateTool: ToolDefinition;
export declare function createSkillLookupTool(hermesBridge: HermesBridge): ToolDefinition;
export declare function createMemoryTools(memory: MemoryManager): ToolDefinition[];
export declare function createTektonTools(hermesBridge: HermesBridge, memory: MemoryManager, pool?: AgentPool): ToolDefinition[];
//# sourceMappingURL=tekton-tools.d.ts.map
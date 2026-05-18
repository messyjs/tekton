export { CommandRegistry, featureState } from "./registry.js";
export type { CommandRegistration, CommandContext, ParsedArgs, FeatureState } from "./types.js";
export { parseArgs, hasJsonFlag, formatBox, formatTable, confirmAction, truncate } from "./types.js";
export { createTektonCommand } from "./tekton.js";
export { createStatusCommand } from "./tekton-status.js";
export { createOnCommand } from "./tekton-on.js";
export { createOffCommand } from "./tekton-off.js";
export { createDashboardCommand } from "./tekton-dashboard.js";
export { createRouteCommand } from "./tekton-route.js";
export { createModelsCommand } from "./tekton-models.js";
export { createSkillsCommand } from "./tekton-skills.js";
export { createCompressCommand } from "./tekton-compress.js";
export { createTokensCommand } from "./tekton-tokens.js";
export { createMemoryCommand } from "./tekton-memory.js";
export { createAgentsCommand } from "./tekton-agents.js";
export { createConfigCommand } from "./tekton-config.js";
export { createLearnCommand } from "./tekton-learn.js";
export { createTrainCommand } from "./tekton-train.js";
export { createGpuCommand } from "./tekton-gpu.js";
export { createCronCommand } from "./tekton-cron.js";
export { createVoiceCommand } from "./tekton-voice.js";
export { createPersonalityCommand } from "./tekton-personality.js";
export { createSoulCommand } from "./tekton-soul.js";
export { createHelpCommand } from "./tekton-help.js";
export { createGatewayCommand } from "./tekton-gateway.js";
export { createDoclingCommand } from "./tekton-docling.js";
export { createForgeCommand } from "./tekton-forge.js";
export { createContextCommand } from "./tekton-context.js";
export { createKnowledgeCommand } from "./tekton-knowledge.js";
export { createBrowseCommand } from "./tekton-browse.js";
export { createAbletonCommand } from "./tekton-ableton.js";
export { createFLStudioCommand } from "./tekton-flstudio.js";
export { createPiCommand } from "./tekton-pi.js";
import { CommandRegistry } from "./registry.js";
import type { CommandContext } from "./types.js";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { AgentPool } from "@tekton/core";
export declare function setAgentPool(pool: AgentPool | null): void;
export declare function getAgentPool(): AgentPool | null;
/**
 * Create a CommandRegistry with all built-in commands registered.
 */
export declare function createFullCommandRegistry(): CommandRegistry;
/**
 * Register all Tekton commands with Pi's extension API.
 */
export declare function registerTektonCommands(pi: ExtensionAPI, ctx: CommandContext): CommandRegistry;
//# sourceMappingURL=index.d.ts.map
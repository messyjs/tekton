// Command registry and types
export { CommandRegistry, featureState } from "./registry.js";
export type { CommandRegistration, CommandContext, ParsedArgs, FeatureState } from "./types.js";
export { parseArgs, hasJsonFlag, formatBox, formatTable, confirmAction, truncate } from "./types.js";

// Individual command factories
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

// Convenience: register all commands with a registry
import { CommandRegistry } from "./registry.js";
import { createTektonCommand } from "./tekton.js";
import { createStatusCommand } from "./tekton-status.js";
import { createOnCommand } from "./tekton-on.js";
import { createOffCommand } from "./tekton-off.js";
import { createDashboardCommand } from "./tekton-dashboard.js";
import { createRouteCommand } from "./tekton-route.js";
import { createModelsCommand } from "./tekton-models.js";
import { createSkillsCommand } from "./tekton-skills.js";
import { createCompressCommand } from "./tekton-compress.js";
import { createTokensCommand } from "./tekton-tokens.js";
import { createMemoryCommand } from "./tekton-memory.js";
import { createAgentsCommand } from "./tekton-agents.js";
import { createConfigCommand } from "./tekton-config.js";
import { createLearnCommand } from "./tekton-learn.js";
import { createTrainCommand } from "./tekton-train.js";
import { createGpuCommand } from "./tekton-gpu.js";
import { createCronCommand } from "./tekton-cron.js";
import { createVoiceCommand } from "./tekton-voice.js";
import { createPersonalityCommand } from "./tekton-personality.js";
import { createSoulCommand } from "./tekton-soul.js";
import { createHelpCommand } from "./tekton-help.js";
import { createGatewayCommand } from "./tekton-gateway.js";
import { createDoclingCommand } from "./tekton-docling.js";
import { createForgeCommand } from "./tekton-forge.js";
import { createContextCommand } from "./tekton-context.js";
import { createKnowledgeCommand } from "./tekton-knowledge.js";
import type { CommandContext } from "./types.js";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { AgentPool } from "@tekton/core";

// Global pool reference — set during runtime initialization
let _agentPool: AgentPool | null = null;

export function setAgentPool(pool: AgentPool | null): void {
  _agentPool = pool;
}

export function getAgentPool(): AgentPool | null {
  return _agentPool;
}

/**
 * Create a CommandRegistry with all built-in commands registered.
 */
export function createFullCommandRegistry(): CommandRegistry {
  const registry = new CommandRegistry();

  registry.register(createTektonCommand(registry));
  registry.register(createStatusCommand());
  registry.register(createOnCommand());
  registry.register(createOffCommand());
  registry.register(createDashboardCommand());
  registry.register(createRouteCommand());
  registry.register(createModelsCommand());
  registry.register(createSkillsCommand());
  registry.register(createCompressCommand());
  registry.register(createTokensCommand());
  registry.register(createMemoryCommand());
  registry.register(createAgentsCommand(() => _agentPool));
  registry.register(createConfigCommand());
  registry.register(createLearnCommand());
  registry.register(createTrainCommand());
  registry.register(createGpuCommand());
  registry.register(createCronCommand());
  registry.register(createVoiceCommand());
  registry.register(createPersonalityCommand());
  registry.register(createSoulCommand());
  registry.register(createHelpCommand(registry));
  registry.register(createGatewayCommand());
  registry.register(createDoclingCommand());
  registry.register(createForgeCommand());
  registry.register(createContextCommand());
  registry.register(createKnowledgeCommand());

  return registry;
}

/**
 * Register all Tekton commands with Pi's extension API.
 */
export function registerTektonCommands(pi: ExtensionAPI, ctx: CommandContext): CommandRegistry {
  const registry = createFullCommandRegistry();
  registry.registerAll(pi, ctx);
  return registry;
}
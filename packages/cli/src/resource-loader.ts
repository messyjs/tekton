import {
  DefaultResourceLoader,
  createEventBus,
  type ResourceLoader,
  type LoadExtensionsResult,
  type Skill as PiSkill,
} from "@mariozechner/pi-coding-agent";
import type { HermesBridge } from "@tekton/hermes-bridge";
import { ModelRouter, type SoulManager, type PersonalityManager, type MemoryManager, type TelemetryTracker, type TektonConfig } from "@tekton/core";
import type { ParsedArgs } from "./run.js";
import { generateSystemPrompt, type SystemPromptConfig } from "./system-prompt.js";
import { createOnPromptHook, type HookConfig } from "./hooks/on-prompt.js";
import { createOnResponseHook } from "./hooks/on-response.js";
import { createOnToolCallHook } from "./hooks/on-tool-call.js";
import { createOnSessionHook } from "./hooks/on-session.js";

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
export function createTektonResourceLoaderOptions(config: TektonResourceLoaderConfig): Record<string, unknown> {
  const hookConfig: HookConfig = {
    hermesBridge: config.hermesBridge,
    modelRouter: config.modelRouter,
    soul: config.soul,
    personality: config.personality,
    memory: config.memory,
    telemetry: config.telemetry,
    config: config.config,
    tektonHome: config.tektonHome,
  };

  return {
    extensionFactories: [
      createOnPromptHook(hookConfig),
      createOnResponseHook(hookConfig),
      createOnToolCallHook(hookConfig),
      createOnSessionHook(hookConfig),
    ],
    systemPromptOverride: (_base: string | undefined) => {
      const skillsSummary = config.hermesBridge.skills.listSkills()
        .map(s => `- ${s.name}: ${s.description}`)
        .join("\n");
      const toolSummary = config.parsedArgs.tekton.toolsets.length > 0
        ? `Active toolsets: ${config.parsedArgs.tekton.toolsets.join(", ")}`
        : "All available tools (default set)";

      const promptConfig: SystemPromptConfig = {
        soul: config.soul,
        personality: config.personality,
        memory: config.memory,
        activeModel: config.modelRouter.getRecentDecisions()[0]?.model ?? config.config.models.fast.model,
        routingMode: config.parsedArgs.tekton.route,
        skillCount: config.hermesBridge.skills.listSkills().length,
        compressionLevel: config.parsedArgs.tekton.compress,
        learningEnabled: !config.parsedArgs.tekton.noLearning,
        memoryContent: config.memory.getMemory(),
        userContext: config.hermesBridge.userModel.toPromptContext(),
        toolSummary,
        skillsSummary,
      };

      return generateSystemPrompt(promptConfig);
    },
    agentsFilesOverride: (current: { agentsFiles: Array<{ path: string; content: string }> }) => ({
      agentsFiles: [
        ...current.agentsFiles,
        {
          path: `${config.tektonHome}/AGENTS.md`,
          content: getTektonAgentsContext(config),
        },
      ],
    }),
  };
}

/**
 * Create a full ResourceLoader with Tekton customizations.
 * Used when you need a standalone ResourceLoader (e.g., for direct SDK usage).
 */
export function createTektonResourceLoader(config: TektonResourceLoaderConfig): ResourceLoader {
  const hookConfig: HookConfig = {
    hermesBridge: config.hermesBridge,
    modelRouter: config.modelRouter,
    soul: config.soul,
    personality: config.personality,
    memory: config.memory,
    telemetry: config.telemetry,
    config: config.config,
    tektonHome: config.tektonHome,
  };

  const loader = new DefaultResourceLoader({
    cwd: config.cwd,
    agentDir: config.tektonHome,
    eventBus: createEventBus(),

    extensionFactories: [
      createOnPromptHook(hookConfig),
      createOnResponseHook(hookConfig),
      createOnToolCallHook(hookConfig),
      createOnSessionHook(hookConfig),
    ],

    systemPromptOverride: (_base: string | undefined) => {
      const skillsSummary = config.hermesBridge.skills.listSkills()
        .map(s => `- ${s.name}: ${s.description}`)
        .join("\n");
      const toolSummary = config.parsedArgs.tekton.toolsets.length > 0
        ? `Active toolsets: ${config.parsedArgs.tekton.toolsets.join(", ")}`
        : "All available tools (default set)";

      const promptConfig: SystemPromptConfig = {
        soul: config.soul,
        personality: config.personality,
        memory: config.memory,
        activeModel: config.modelRouter.getRecentDecisions()[0]?.model ?? config.config.models.fast.model,
        routingMode: config.parsedArgs.tekton.route,
        skillCount: config.hermesBridge.skills.listSkills().length,
        compressionLevel: config.parsedArgs.tekton.compress,
        learningEnabled: !config.parsedArgs.tekton.noLearning,
        memoryContent: config.memory.getMemory(),
        userContext: config.hermesBridge.userModel.toPromptContext(),
        toolSummary,
        skillsSummary,
      };

      return generateSystemPrompt(promptConfig);
    },

    agentsFilesOverride: (current: { agentsFiles: Array<{ path: string; content: string }> }) => ({
      agentsFiles: [
        ...current.agentsFiles,
        {
          path: `${config.tektonHome}/AGENTS.md`,
          content: getTektonAgentsContext(config),
        },
      ],
    }),
  });

  return loader;
}

function getTektonAgentsContext(config: TektonResourceLoaderConfig): string {
  return `# Tekton Agent Configuration

## Routing
- Mode: ${config.parsedArgs.tekton.route}
- Compression: ${config.parsedArgs.tekton.compress}
- Learning: ${config.parsedArgs.tekton.noLearning ? "disabled" : "active"}

## Toolsets
${config.parsedArgs.tekton.toolsets.length > 0
    ? `Active: ${config.parsedArgs.tekton.toolsets.join(", ")}`
    : "All available (default)"}
`;
}
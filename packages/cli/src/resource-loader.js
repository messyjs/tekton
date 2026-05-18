import { DefaultResourceLoader, createEventBus, } from "@mariozechner/pi-coding-agent";
import { generateSystemPrompt } from "./system-prompt.js";
import { createOnPromptHook } from "./hooks/on-prompt.js";
import { createOnResponseHook } from "./hooks/on-response.js";
import { createOnToolCallHook } from "./hooks/on-tool-call.js";
import { createOnSessionHook } from "./hooks/on-session.js";
/**
 * Build DefaultResourceLoaderOptions for createAgentSessionServices.
 *
 * This creates the options object that embeds Tekton's custom system prompt,
 * hooks (extension factories), and agents file overrides into Pi's default
 * resource loader.
 */
export function createTektonResourceLoaderOptions(config) {
    const hookConfig = {
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
        systemPromptOverride: (_base) => {
            const skillsSummary = config.hermesBridge.skills.listSkills()
                .map(s => `- ${s.name}: ${s.description}`)
                .join("\n");
            const toolSummary = config.parsedArgs.tekton.toolsets.length > 0
                ? `Active toolsets: ${config.parsedArgs.tekton.toolsets.join(", ")}`
                : "All available tools (default set)";
            const promptConfig = {
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
        agentsFilesOverride: (current) => ({
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
export function createTektonResourceLoader(config) {
    const hookConfig = {
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
        systemPromptOverride: (_base) => {
            const skillsSummary = config.hermesBridge.skills.listSkills()
                .map(s => `- ${s.name}: ${s.description}`)
                .join("\n");
            const toolSummary = config.parsedArgs.tekton.toolsets.length > 0
                ? `Active toolsets: ${config.parsedArgs.tekton.toolsets.join(", ")}`
                : "All available tools (default set)";
            const promptConfig = {
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
        agentsFilesOverride: (current) => ({
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
function getTektonAgentsContext(config) {
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
//# sourceMappingURL=resource-loader.js.map
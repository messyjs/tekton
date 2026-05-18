import { InteractiveMode, SessionManager, createAgentSessionRuntime, getAgentDir, } from "@mariozechner/pi-coding-agent";
import { createTektonRuntimeFactory } from "../tekton-runtime.js";
function displayBanner(config) {
    console.log(`
  ╔════════════════════════════════════════╗
  ║           T E K T O N                  ║
  ║    The self-improving coding agent     ║
  ╠════════════════════════════════════════╣
  ║  Model:    ${config.activeModel.padEnd(27)}║
  ║  Route:    ${config.routingMode.padEnd(27)}║
  ║  Skills:   ${String(config.skillCount).padEnd(27)}║
  ║  Compress: ${config.compression.padEnd(27)}║
  ║  Learning: ${config.learning.padEnd(27)}║
  ╚════════════════════════════════════════╝
  `);
}
export async function startInteractiveMode(config, parsed, tektonHome) {
    const factory = createTektonRuntimeFactory(parsed, config, tektonHome);
    const cwd = process.cwd();
    const runtime = await createAgentSessionRuntime(factory, {
        cwd,
        agentDir: getAgentDir(),
        sessionManager: SessionManager.create(cwd),
    });
    // Extract Tekton subsystems from custom property
    const tekton = runtime.tekton;
    // Display banner
    const effectiveModel = tekton?.modelRouter.getRecentDecisions()[0]?.model ?? config.models.fast.model;
    displayBanner({
        activeModel: effectiveModel,
        routingMode: parsed.tekton.route,
        skillCount: tekton?.hermesBridge.skills.listSkills().length ?? 0,
        compression: parsed.tekton.compress,
        learning: parsed.tekton.noLearning ? "paused" : "active",
    });
    // Start Pi's InteractiveMode
    const mode = new InteractiveMode(runtime, {
        migratedProviders: [],
        modelFallbackMessage: undefined,
        initialMessage: parsed.initialMessage ?? undefined,
        initialImages: [],
        initialMessages: [],
    });
    await mode.run();
}
//# sourceMappingURL=interactive.js.map
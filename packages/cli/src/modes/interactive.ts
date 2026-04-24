import {
  InteractiveMode,
  type AgentSessionRuntime,
  SessionManager,
  createAgentSessionRuntime,
  getAgentDir,
} from "@mariozechner/pi-coding-agent";
import type { TektonConfig } from "@tekton/core";
import type { ParsedArgs } from "../run.js";
import { getTektonHome } from "../run.js";
import { createTektonRuntimeFactory, type TektonSubsystems } from "../tekton-runtime.js";

// ── Interactive mode ─────────────────────────────────────────────────

export interface TektonConfigEffective {
  activeModel: string;
  routingMode: string;
  skillCount: number;
  compression: string;
  learning: string;
}

function displayBanner(config: TektonConfigEffective): void {
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

export async function startInteractiveMode(
  config: TektonConfig,
  parsed: ParsedArgs,
  tektonHome: string,
): Promise<void> {
  const factory = createTektonRuntimeFactory(parsed, config, tektonHome);
  const cwd = process.cwd();

  const runtime = await createAgentSessionRuntime(factory, {
    cwd,
    agentDir: getAgentDir(),
    sessionManager: SessionManager.create(cwd),
  });

  // Extract Tekton subsystems from custom property
  const tekton = (runtime as any).tekton as TektonSubsystems;

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
import {
  InteractiveMode,
  type AgentSessionRuntime,
  SessionManager,
  createAgentSessionRuntime,
  getAgentDir,
} from "@earendil-works/pi-coding-agent";
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

const SPLASH = "                  \u2694                       \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n                  \u2588                       \u2551   T E K T O N                \u2551\n                  \u2588                       \u2551   The self-improving         \u2551\n                 \u2554\u2569\u2557                      \u2551   coding agent               \u2551\n    \u2584\u2584\u2588\u2588\u2584\u2584      \u2590\u2588 \u2588\u258c                     \u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563\n   \u259f\u2588\u2588\u2588\u2588\u2588\u2588\u2599    \u2590\u2588 \u2588\u258c                      \u2551  Pi   \u00b7 minimal core         \u2551\n   \u2588 \u25c9  \u25c9 \u2588   \u2590\u2588 \u2588\u258c                      \u2551  Hermes \u00b7 orchestration      \u2551\n   \u259c\u2588\u2588\u2588\u2588\u2588\u2588\u259b    \u2572\u2588\u2571                       \u2551  OpenMythos \u00b7 deep routing   \u2551\n    \u2590\u2588\u2584\u2588\u258c     \u2584\u2584\u2588\u2584\u2584\u2584\u2584\u2584                   \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d\n    \u2590\u2588\u2588\u2588\u2588\u258c   \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584\n    \u2590\u2588\u2588\u2588\u2588\u258c  \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584\n     \u2588\u2588\u2588\u2588  \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584\n  \u2584\u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584\u2584\u2584\n \u2590\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588  T H E   S T O N E  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u258c\n  \u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\n   Only the worthy may draw the blade.";
function displayBanner(config: TektonConfigEffective): void {
  const fit = (s: unknown, n = 27) => {
    const t = String(s);
    return (t.length > n ? t.slice(0, n - 1) + "…" : t).padEnd(n);
  };
  const info =
`  ╔═══════════════════════════════════════╗
  ║  Model:    ${fit(config.activeModel)}║
  ║  Route:    ${fit(config.routingMode)}║
  ║  Skills:   ${fit(config.skillCount)}║
  ║  Compress: ${fit(config.compression)}║
  ║  Learning: ${fit(config.learning)}║
  ╚═══════════════════════════════════════╝`;
  console.log(SPLASH);
  console.log(info);
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
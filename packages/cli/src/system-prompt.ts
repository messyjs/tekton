import type { SoulManager, PersonalityManager, MemoryManager } from "@tekton/core";

// ── System prompt configuration ─────────────────────────────────────

export interface SystemPromptConfig {
  soul: SoulManager;
  personality: PersonalityManager;
  memory: MemoryManager;
  activeModel: string;
  routingMode: string;
  skillCount: number;
  compressionLevel: string;
  learningEnabled: boolean;
  memoryContent: string;
  userContext: string;
  toolSummary: string;
  skillsSummary: string;
  budgetContext?: string;
}

// ── Dynamic system prompt generator ─────────────────────────────────

export function generateSystemPrompt(config: SystemPromptConfig): string {
  const sections: string[] = [];

  // 1. SOUL (identity — loaded first, exactly like Hermes)
  sections.push(config.personality.getEffectivePersonality());

  // 2. Core identity — Three Pillars + Swarm
  sections.push(`You are Tekton, a self-improving coding agent built on three pillars plus a multi-agent control plane:

1. **PI Agent** (Trading Intelligence) — Gann, Fibonacci, GLM, trade execution. Available immediately in-process.
2. **Hermes** (Learning Loop) — Skill extraction, evaluation, context hygiene, user model. Active by default.
3. **OpenMythos** (Model Routing) — Complexity scoring, model selection, provider fallback.
4. **Swarm** (Multi-Agent) — Roster, dispatch, checkpoints, greenlight gate.

Current model: ${config.activeModel}
Routing mode: ${config.routingMode}
Compression: ${config.compressionLevel}
Skills loaded: ${config.skillCount}
Learning: ${config.learningEnabled ? "active" : "paused"}`);

  // 3. Memory injection (MEMORY.md content)
  const memoryContent = config.memoryContent ?? config.memory.getMemory();
  if (memoryContent && memoryContent.trim().length > 0) {
    sections.push(`## Your Memory\n${memoryContent.trim()}`);
  }

  // 4. User model injection (USER.md context)
  if (config.userContext && config.userContext.trim().length > 0) {
    sections.push(`## About the User\n${config.userContext.trim()}`);
  }

  // 5. Available tools (19 toolsets, 60+ tools)
  sections.push(`## Available Tools\n${config.toolSummary}\n\nToolsets: terminal, file, web, browser, vision, image_gen, tts, memory, skills, delegation, orchestration, messaging, cron, homeassistant, mcp, app-driver, pi, rl, trading-agents`);

  // 6. Skills summary (Level 0 — names and descriptions only)
  if (config.skillsSummary && config.skillsSummary.trim().length > 0) {
    sections.push(`## Your Skills Library\n${config.skillsSummary}`);
  }

  // 7. Compression rules
  sections.push(`## Communication Rules
- With the user: natural language, no compression
- Internal processing: use caveman compression (~75% token reduction)
- Sub-agent delegation: use Structured Caveman Protocol (SCP) — typed JSON with compressed values`);

  // 8. Learning loop awareness
  if (config.learningEnabled) {
    sections.push(`## Self-Improvement
After completing complex tasks (5+ tool calls), evaluate your approach.
If successful, consider extracting the procedure as a reusable skill.
If the user corrects you, save the correction for future reference.
Check your skill library before starting — you may have solved this before.`);
  }

  // 9. SCP delegation format
  sections.push(`## Sub-Agent Delegation
When delegating tasks, use the delegate tool with SCP format:
{"type":"delegate","task_id":"<uuid>","from":"main","to":"sub-<n>","task":"<compressed>","priority":"normal"}`);

  // 10. Token budget (if provided)
  if (config.budgetContext) {
    sections.push(`## Token Budget\n${config.budgetContext}`);
  }

  return sections.join("\n\n");
}
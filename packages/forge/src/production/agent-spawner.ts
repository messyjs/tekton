/**
 * Agent Spawner — Creates AgentTuples for production agents.
 *
 * Builds curated context (not the full brief), combining role system prompt,
 * task card details, and handoff context. Respects token size limits.
 * When Knowledge Librarian is configured, pre-seeds domain-specific topics
 * for more accurate auto-injection.
 */
import type { AgentTuple, TaskCard, RoleDefinition, HandoffPackage } from "../types.js";

const MAX_CONTEXT_TOKENS = 4000;
const AVG_CHARS_PER_TOKEN = 4; // rough estimate

/**
 * Spawn a production agent tuple with curated context.
 */
export function spawnProductionAgent(
  card: TaskCard,
  role: RoleDefinition,
  handoff?: HandoffPackage,
): AgentTuple {
  const instruction = buildInstruction(card, role);
  const context = buildCuratedContext(card, handoff);
  const tools = role.tools;
  const model = role.model;

  return { instruction, context, tools, model };
}

/**
 * Build the instruction (system prompt) for the agent.
 */
function buildInstruction(card: TaskCard, role: RoleDefinition): string {
  const parts = [
    role.systemPrompt,
    "",
    "## Your Task",
    card.title,
    "",
    card.description,
    "",
    "## Acceptance Criteria",
    ...card.acceptanceCriteria.map((c) => `- ${c}`),
    "",
    "## Expected Output Files",
    ...card.outputFiles.map((f) => `- ${f}`),
  ];

  return parts.join("\n");
}

/**
 * Build curated context from the task card and optional handoff.
 *
 * Includes ONLY:
 * - Relevant section of product brief (context field of the card)
 * - Handoff continuation context if present
 * - Maximum context size: ~4000 tokens
 */
function buildCuratedContext(card: TaskCard, handoff?: HandoffPackage): string {
  const parts: string[] = [];

  // Task context (not the full brief)
  if (card.context) {
    parts.push("## Task Context");
    parts.push(card.context);
  }

  // Handoff from previous session
  if (handoff) {
    parts.push("");
    parts.push("## Previous Session Handoff");
    parts.push(`Summary: ${handoff.summary}`);

    if (handoff.completedWork.length > 0) {
      parts.push("");
      parts.push("### Completed Work");
      for (const item of handoff.completedWork) {
        parts.push(`- ${item}`);
      }
    }

    if (handoff.remainingWork.length > 0) {
      parts.push("");
      parts.push("### Remaining Work");
      for (const item of handoff.remainingWork) {
        parts.push(`- ${item}`);
      }
    }

    if (handoff.importantDecisions.length > 0) {
      parts.push("");
      parts.push("### Important Decisions");
      for (const item of handoff.importantDecisions) {
        parts.push(`- ${item}`);
      }
    }

    if (handoff.nextSessionContext) {
      parts.push("");
      parts.push("### Next Session Focus");
      parts.push(handoff.nextSessionContext);
    }
  }

  let context = parts.join("\n");

  // Truncate if exceeding token limit
  const maxChars = MAX_CONTEXT_TOKENS * AVG_CHARS_PER_TOKEN;
  if (context.length > maxChars) {
    context = context.slice(0, maxChars) + "\n\n[Context truncated to fit session limits]";
  }

  return context;
}

/**
 * Get domain-specific topic seeds for a given role.
 * These help the Knowledge Librarian find relevant reference material
 * even from generic messages within that domain.
 */
export function getDomainTopics(role: RoleDefinition): string[] {
  const domainTopicMap: Record<string, string[]> = {
    "dsp-engineer": ["juce", "dsp", "audio", "vst", "filter", "fft"],
    "frontend-engineer": ["react", "html", "css", "component", "responsive"],
    "backend-engineer": ["api", "database", "server", "endpoint", "node"],
    "mobile-engineer": ["ios", "android", "swift", "kotlin", "mobile"],
    "unreal-engineer": ["unreal", "ue5", "blueprint", "actor", "component"],
    "cad-engineer": ["openscad", "scad", "parametric", "stl", "boolean"],
    "core-developer": ["cmake", "build", "compiler", "linker", "static"],
  };

  const roleId = role.id.toLowerCase();
  const allTopics: string[] = [];

  for (const [key, topics] of Object.entries(domainTopicMap)) {
    if (roleId.includes(key)) {
      allTopics.push(...topics);
    }
  }

  if (role.tools) {
    const toolStr = role.tools.join(" ").toLowerCase();
    if (toolStr.includes("juce") || toolStr.includes("audio")) allTopics.push("juce", "dsp", "audio");
    if (toolStr.includes("react") || toolStr.includes("frontend")) allTopics.push("react", "component");
  }

  return [...new Set(allTopics)];
}
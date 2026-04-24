/**
 * Plan Generator — Creates a ProductionPlan from an approved brief and domains.
 *
 * Loads team templates, generates task cards, validates dependency graph,
 * and estimates sessions.
 */
import { randomUUID } from "node:crypto";
import { getTeamTemplate, listDomains } from "../domain-registry.js";
import { mergeTemplates } from "../team-assembler.js";
import { createTaskCard, getDependencyOrder } from "../task-card.js";
import type { ProductBrief, ProductDomain, ProductionPlan, TaskCard, TeamTemplate } from "../types.js";

/**
 * Generate a ProductionPlan from brief and domains.
 *
 * Uses the provided LLM call for task breakdown, or falls back
 * to role-based template task generation.
 */
export async function generatePlan(
  brief: ProductBrief,
  domains: ProductDomain[],
  callLLM?: (systemPrompt: string, userPrompt: string) => Promise<string>,
): Promise<ProductionPlan> {
  // Load team templates
  const templates = domains
    .map((d) => getTeamTemplate(d))
    .filter((t): t is TeamTemplate => t !== undefined);

  if (templates.length === 0) {
    throw new Error(`No team templates found for domains: ${domains.join(", ")}`);
  }

  // Merge if multi-domain
  const teamTemplate = templates.length === 1 ? templates[0] : mergeTemplates(templates);

  // Generate task cards
  let taskCards: TaskCard[];
  try {
    taskCards = await llmGenerateTasks(brief, teamTemplate, callLLM!);
  } catch {
    taskCards = templateGenerateTasks(brief, teamTemplate);
  }

  // Validate dependency graph (no cycles)
  try {
    getDependencyOrder(taskCards);
  } catch (e) {
    throw new Error(`Generated plan has circular dependencies: ${(e as Error).message}`);
  }

  // Build dependency graph
  const dependencyGraph: Record<string, string[]> = {};
  for (const card of taskCards) {
    dependencyGraph[card.id] = card.dependencies;
  }

  // Estimate sessions (avg 1.5 sessions per card)
  const estimatedSessions = Math.ceil(taskCards.length * 1.5);

  const plan: ProductionPlan = {
    id: `plan-${randomUUID().slice(0, 8)}`,
    briefId: brief.id,
    domains,
    teamTemplate,
    taskCards,
    dependencyGraph,
    estimatedSessions,
  };

  return plan;
}

/** Template-based task generation — one card per role. */
function templateGenerateTasks(brief: ProductBrief, teamTemplate: TeamTemplate): TaskCard[] {
  const planId = `plan-${randomUUID().slice(0, 8)}`;
  const cards: TaskCard[] = [];

  // Create initial setup card
  const setupCard = createTaskCard(planId, "setup", "Project Setup", `Initialize project structure for ${brief.title}`, []);
  setupCard.acceptanceCriteria = ["Project structure created", "Dependencies installed", "Build starts successfully"];
  setupCard.outputFiles = ["package.json", "README.md"];
  cards.push(setupCard);

  // Create cards for each role
  for (const role of teamTemplate.roles) {
    const deps = cards.length > 0 ? [cards[0].id] : [];
    const card = createTaskCard(
      planId,
      role.id,
      `${role.name}: ${brief.title}`,
      `Implement ${role.name} responsibilities for the ${brief.title} product. Brief context: ${brief.proposedSolution}`,
      deps,
    );
    card.acceptanceCriteria = [
      `${role.name} implementation complete`,
      "All files saved with .beta suffix",
      "No compilation errors",
    ];
    card.outputFiles = [];
    cards.push(card);
  }

  // Create integration card
  const allRoleIds = cards.slice(1).map((c) => c.id);
  const integrationCard = createTaskCard(
    planId,
    "integrator",
    "Integration and Testing",
    `Integrate all components and verify the product works end-to-end`,
    allRoleIds,
  );
  integrationCard.acceptanceCriteria = [
    "All components integrated",
    "End-to-end test passes",
    "Product builds and runs",
  ];
  integrationCard.outputFiles = [];
  cards.push(integrationCard);

  return cards;
}

/** LLM-based task generation. */
async function llmGenerateTasks(
  brief: ProductBrief,
  teamTemplate: TeamTemplate,
  callLLM: (systemPrompt: string, userPrompt: string) => Promise<string>,
): Promise<TaskCard[]> {
  const roleDescriptions = teamTemplate.roles
    .map((r) => `  - ${r.id}: ${r.systemPrompt.slice(0, 100)}...`)
    .join("\n");

  const systemPrompt = `You are a project planner. Break this product into discrete task cards.
For each task provide: title, description, role (from available roles), acceptanceCriteria (array of strings), outputFiles (array of strings), and dependencies (array of task IDs, use sequential IDs like "tc-1", "tc-2").
Return ONLY valid JSON array of task objects.`;

  const userPrompt = `Product: ${brief.title}
Problem: ${brief.problemStatement}
Solution: ${brief.proposedSolution}
Technical: ${brief.technicalApproach}
Available roles:
${roleDescriptions}

Generate the task breakdown.`;

  const raw = await callLLM(systemPrompt, userPrompt);

  try {
    let cleaned = raw.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      const planId = `plan-${randomUUID().slice(0, 8)}`;
      return parsed.map((t: any) => {
        const card = createTaskCard(
          planId,
          t.role ?? "unknown",
          t.title ?? "Untitled task",
          t.description ?? "",
          t.dependencies ?? [],
        );
        card.acceptanceCriteria = t.acceptanceCriteria ?? [];
        card.outputFiles = t.outputFiles ?? [];
        return card;
      });
    }
  } catch {
    // Fall back to template generation
  }

  return templateGenerateTasks(brief, teamTemplate);
}
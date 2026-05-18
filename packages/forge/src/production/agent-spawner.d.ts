/**
 * Agent Spawner — Creates AgentTuples for production agents.
 *
 * Builds curated context (not the full brief), combining role system prompt,
 * task card details, and handoff context. Respects token size limits.
 * When Knowledge Librarian is configured, pre-seeds domain-specific topics
 * for more accurate auto-injection.
 */
import type { AgentTuple, TaskCard, RoleDefinition, HandoffPackage } from "../types.js";
/**
 * Spawn a production agent tuple with curated context.
 */
export declare function spawnProductionAgent(card: TaskCard, role: RoleDefinition, handoff?: HandoffPackage): AgentTuple;
/**
 * Get domain-specific topic seeds for a given role.
 * These help the Knowledge Librarian find relevant reference material
 * even from generic messages within that domain.
 */
export declare function getDomainTopics(role: RoleDefinition): string[];
//# sourceMappingURL=agent-spawner.d.ts.map
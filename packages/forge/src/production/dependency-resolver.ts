/**
 * Dependency Resolver — Topological sort and readiness checks for task cards.
 */
import type { TaskCard } from "../types.js";

/**
 * Resolve task execution order via topological sort.
 * Throws descriptive error on cycle detection including the cycle path.
 */
export function resolveOrder(cards: TaskCard[]): TaskCard[] {
  const cardMap = new Map(cards.map((c) => [c.id, c]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const order: TaskCard[] = [];
  const path: string[] = [];

  function visit(id: string): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      // Find cycle path
      const cycleStart = path.indexOf(id);
      const cyclePath = cycleStart >= 0 ? path.slice(cycleStart).concat(id).join(" → ") : `${id} → ... → ${id}`;
      throw new Error(`Circular dependency detected: ${cyclePath}`);
    }

    const card = cardMap.get(id);
    if (!card) return;

    visiting.add(id);
    path.push(id);

    for (const depId of card.dependencies) {
      visit(depId);
    }

    visiting.delete(id);
    path.pop();
    visited.add(id);
    order.push(card);
  }

  for (const card of cards) {
    visit(card.id);
  }

  return order;
}

/**
 * Get all task cards that are ready to start:
 * - Status is "pending"
 * - All dependencies have status "completed"
 */
export function getReady(cards: TaskCard[]): TaskCard[] {
  const completedIds = new Set(
    cards.filter((c) => c.status === "completed").map((c) => c.id),
  );

  return cards.filter((card) => {
    if (card.status !== "pending") return false;
    if (card.dependencies.length === 0) return true;
    return card.dependencies.every((depId) => completedIds.has(depId));
  });
}

/**
 * Check if the dependency graph has a cycle.
 * Returns true if a cycle is detected, false otherwise.
 */
export function hasCycle(cards: TaskCard[]): boolean {
  try {
    resolveOrder(cards);
    return false;
  } catch {
    return true;
  }
}
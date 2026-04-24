/**
 * Task Card — Create, validate, and manage task cards in the dependency graph.
 */
import { randomUUID } from "node:crypto";
import type { TaskCard, TaskCardStatus } from "./types.js";

// ── Valid status transitions ────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<TaskCardStatus, TaskCardStatus[]> = {
  "pending": ["in-progress"],
  "in-progress": ["completed", "failed"],
  "failed": ["in-progress"],
  "blocked": ["pending"],
  "completed": [], // terminal state
};

// ── Create ─────────────────────────────────────────────────────────────────

export function createTaskCard(
  planId: string,
  role: string,
  title: string,
  description: string,
  deps: string[] = [],
): TaskCard {
  return {
    id: `tc-${randomUUID().slice(0, 8)}`,
    planId,
    role,
    title,
    description,
    context: "",
    acceptanceCriteria: [],
    outputFiles: [],
    dependencies: deps,
    status: "pending",
    sessionHistory: [],
  };
}

// ── Status transitions ─────────────────────────────────────────────────────

export function updateStatus(card: TaskCard, newStatus: TaskCardStatus): TaskCard {
  const allowed = VALID_TRANSITIONS[card.status];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new Error(
      `Invalid status transition: ${card.status} → ${newStatus}. ` +
      `Allowed transitions from '${card.status}': [${allowed.join(", ")}]`
    );
  }

  return { ...card, status: newStatus };
}

// ── Dependency resolution ──────────────────────────────────────────────────

/**
 * Get all task cards that are ready to start:
 * - Status is "pending"
 * - All dependencies have status "completed"
 */
export function getNextReady(cards: TaskCard[]): TaskCard[] {
  const completedIds = new Set(
    cards.filter(c => c.status === "completed").map(c => c.id)
  );

  return cards.filter(card => {
    if (card.status !== "pending") return false;
    if (card.dependencies.length === 0) return true;
    return card.dependencies.every(depId => completedIds.has(depId));
  });
}

/**
 * Topological sort of task cards based on dependencies.
 * Throws if a cycle is detected.
 */
export function getDependencyOrder(cards: TaskCard[]): TaskCard[] {
  const cardMap = new Map(cards.map(c => [c.id, c]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const order: TaskCard[] = [];

  function visit(id: string): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new Error(`Circular dependency detected involving task: ${id}`);
    }

    visiting.add(id);
    const card = cardMap.get(id);
    if (card) {
      for (const depId of card.dependencies) {
        visit(depId);
      }
      visited.add(id);
      order.push(card);
    }
    visiting.delete(id);
  }

  for (const card of cards) {
    visit(card.id);
  }

  return order;
}
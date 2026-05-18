import type { TaskCard, TaskCardStatus } from "./types.js";
export declare function createTaskCard(planId: string, role: string, title: string, description: string, deps?: string[]): TaskCard;
export declare function updateStatus(card: TaskCard, newStatus: TaskCardStatus): TaskCard;
/**
 * Get all task cards that are ready to start:
 * - Status is "pending"
 * - All dependencies have status "completed"
 */
export declare function getNextReady(cards: TaskCard[]): TaskCard[];
/**
 * Topological sort of task cards based on dependencies.
 * Throws if a cycle is detected.
 */
export declare function getDependencyOrder(cards: TaskCard[]): TaskCard[];
//# sourceMappingURL=task-card.d.ts.map
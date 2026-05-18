/**
 * Dependency Resolver — Topological sort and readiness checks for task cards.
 */
import type { TaskCard } from "../types.js";
/**
 * Resolve task execution order via topological sort.
 * Throws descriptive error on cycle detection including the cycle path.
 */
export declare function resolveOrder(cards: TaskCard[]): TaskCard[];
/**
 * Get all task cards that are ready to start:
 * - Status is "pending"
 * - All dependencies have status "completed"
 */
export declare function getReady(cards: TaskCard[]): TaskCard[];
/**
 * Check if the dependency graph has a cycle.
 * Returns true if a cycle is detected, false otherwise.
 */
export declare function hasCycle(cards: TaskCard[]): boolean;
//# sourceMappingURL=dependency-resolver.d.ts.map
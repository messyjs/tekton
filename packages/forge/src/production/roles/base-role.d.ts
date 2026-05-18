/**
 * Base Role — Shared types and utilities for role definitions.
 */
import type { RoleDefinition } from "../../types.js";
/**
 * Validate a role definition has all required fields.
 */
export declare function validateRole(role: RoleDefinition): string[];
/**
 * Build a full system prompt for a role given a task.
 */
export declare function buildSystemPrompt(role: RoleDefinition, taskTitle: string, taskDescription: string): string;
//# sourceMappingURL=base-role.d.ts.map
/**
 * Base Role — Shared types and utilities for role definitions.
 */
import type { RoleDefinition } from "../../types.js";

/**
 * Validate a role definition has all required fields.
 */
export function validateRole(role: RoleDefinition): string[] {
  const errors: string[] = [];

  if (!role.id || role.id.trim() === "") errors.push("id is required");
  if (!role.name || role.name.trim() === "") errors.push("name is required");
  if (!role.systemPrompt || role.systemPrompt.trim() === "") errors.push("systemPrompt is required");
  if (!Array.isArray(role.tools)) errors.push("tools must be an array");
  if (!role.model || role.model.trim() === "") errors.push("model is required");
  if (typeof role.sessionLimit !== "number" || role.sessionLimit <= 0) errors.push("sessionLimit must be a positive number");
  if (!role.systemPrompt.includes(".beta")) errors.push("systemPrompt must mention .beta file naming");

  return errors;
}

/**
 * Build a full system prompt for a role given a task.
 */
export function buildSystemPrompt(role: RoleDefinition, taskTitle: string, taskDescription: string): string {
  return [
    role.systemPrompt,
    "",
    "## Current Assignment",
    `Task: ${taskTitle}`,
    taskDescription,
    "",
    "IMPORTANT: When modifying existing files, use the patch tool for targeted changes. Only use write_file when creating new files or making extensive changes (>40% of file). This saves tokens and reduces error risk.",
    "",
    "Reference material from the knowledge library may be provided automatically. When reference material appears under '## Reference Material', use it as authoritative guidance for your implementation.",
  ].join("\n");
}
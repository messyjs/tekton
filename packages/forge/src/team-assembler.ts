/**
 * Team Assembler — Merges multiple domain templates into a unified team.
 *
 * When a product spans multiple domains (e.g. VST + web-app for a plugin with
 * a preset store), the assembler de-duplicates roles, combines build commands,
 * and merges tool requirements.
 */
import type { TeamTemplate, RoleDefinition, TestRoleDefinition } from "./types.js";

/**
 * Merge multiple TeamTemplates into a single unified template.
 * - De-duplicates roles by ID (keeps first occurrence)
 * - Merges build/test commands with &&
 * - Combines required/optional tools (union)
 * - Uses the first domain's projectTemplate as base
 */
export function mergeTemplates(templates: TeamTemplate[]): TeamTemplate {
  if (templates.length === 0) {
    throw new Error("Cannot merge zero templates");
  }

  if (templates.length === 1) {
    return { ...templates[0] };
  }

  // De-duplicate roles by ID
  const seenRoleIds = new Set<string>();
  const roles: RoleDefinition[] = [];
  const testRoles: TestRoleDefinition[] = [];
  const seenTestRoleIds = new Set<string>();

  for (const tmpl of templates) {
    for (const role of tmpl.roles) {
      if (!seenRoleIds.has(role.id)) {
        seenRoleIds.add(role.id);
        roles.push(role);
      }
    }
    for (const tRole of tmpl.testRoles) {
      if (!seenTestRoleIds.has(tRole.id)) {
        seenTestRoleIds.add(tRole.id);
        testRoles.push(tRole);
      }
    }
  }

  // Merge build commands
  const buildCommands = templates
    .map(t => t.buildCommand)
    .filter((c): c is string => c !== null && c !== undefined);
  const mergedBuild = buildCommands.length > 0 ? buildCommands.join(" && ") : undefined;

  // Merge test commands
  const testCommands = templates
    .map(t => t.testCommand)
    .filter((c): c is string => c !== null && c !== undefined);
  const mergedTest = testCommands.length > 0 ? testCommands.join(" && ") : undefined;

  // Merge required tools (union)
  const requiredTools = [...new Set(templates.flatMap(t => t.requiredTools))];
  const optionalTools = [...new Set(templates.flatMap(t => t.optionalTools))];

  // Use first domain's project template as base
  return {
    domain: templates.map(t => t.domain).join("+"),
    roles,
    testRoles,
    projectTemplate: templates[0].projectTemplate,
    buildCommand: mergedBuild,
    testCommand: mergedTest,
    requiredTools,
    optionalTools,
  };
}
/**
 * Team Assembler — Merges multiple domain templates into a unified team.
 *
 * When a product spans multiple domains (e.g. VST + web-app for a plugin with
 * a preset store), the assembler de-duplicates roles, combines build commands,
 * and merges tool requirements.
 */
import type { TeamTemplate } from "./types.js";
/**
 * Merge multiple TeamTemplates into a single unified template.
 * - De-duplicates roles by ID (keeps first occurrence)
 * - Merges build/test commands with &&
 * - Combines required/optional tools (union)
 * - Uses the first domain's projectTemplate as base
 */
export declare function mergeTemplates(templates: TeamTemplate[]): TeamTemplate;
//# sourceMappingURL=team-assembler.d.ts.map
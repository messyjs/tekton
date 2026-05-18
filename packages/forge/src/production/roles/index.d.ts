/**
 * Role Definitions Registry — Maps role IDs to RoleDefinitions.
 */
import type { RoleDefinition } from "../../types.js";
export { validateRole, buildSystemPrompt } from "./base-role.js";
export declare const roleRegistry: Record<string, RoleDefinition>;
/**
 * Get a role definition by ID.
 */
export declare function getRoleDefinition(roleId: string): RoleDefinition | undefined;
/**
 * Get all role IDs.
 */
export declare function listRoleIds(): string[];
//# sourceMappingURL=index.d.ts.map
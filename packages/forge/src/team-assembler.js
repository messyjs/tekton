/**
 * Merge multiple TeamTemplates into a single unified template.
 * - De-duplicates roles by ID (keeps first occurrence)
 * - Merges build/test commands with &&
 * - Combines required/optional tools (union)
 * - Uses the first domain's projectTemplate as base
 */
export function mergeTemplates(templates) {
    if (templates.length === 0) {
        throw new Error("Cannot merge zero templates");
    }
    if (templates.length === 1) {
        return { ...templates[0] };
    }
    // De-duplicate roles by ID
    const seenRoleIds = new Set();
    const roles = [];
    const testRoles = [];
    const seenTestRoleIds = new Set();
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
        .filter((c) => c !== null && c !== undefined);
    const mergedBuild = buildCommands.length > 0 ? buildCommands.join(" && ") : undefined;
    // Merge test commands
    const testCommands = templates
        .map(t => t.testCommand)
        .filter((c) => c !== null && c !== undefined);
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
//# sourceMappingURL=team-assembler.js.map
/**
 * Plugin Validation Runner — Runs pluginval to validate VST plugins.
 *
 * Gracefully skips if pluginval is not installed.
 */
import { execSync } from "node:child_process";
function isWindows() {
    return process.platform === "win32";
}
async function toolExists(tool) {
    const cmd = isWindows() ? `where ${tool}` : `which ${tool}`;
    try {
        execSync(cmd, { stdio: "pipe" });
        return true;
    }
    catch {
        return false;
    }
}
export async function validatePlugin(projectDir, buildOutput) {
    // Check if pluginval is available
    if (!(await toolExists("pluginval"))) {
        return {
            tester: "pluginval-runner",
            passed: true,
            skipped: true,
            artifact: buildOutput ?? "plugin",
            category: "domain-validation",
            details: "pluginval not found — skipped",
        };
    }
    if (!buildOutput) {
        return {
            tester: "pluginval-runner",
            passed: true,
            skipped: true,
            artifact: "plugin",
            category: "domain-validation",
            details: "No build output specified — skipped",
        };
    }
    try {
        const output = execSync(`pluginval --strictness-level 10 --validate "${buildOutput}"`, { cwd: projectDir, timeout: 120000, encoding: "utf-8" });
        return {
            tester: "pluginval-runner",
            passed: true,
            artifact: buildOutput,
            category: "domain-validation",
            details: output.slice(0, 500),
        };
    }
    catch (e) {
        return {
            tester: "pluginval-runner",
            passed: false,
            artifact: buildOutput,
            category: "domain-validation",
            details: `Plugin validation failed: ${(e.stdout ?? e.message ?? "").slice(0, 500)}`,
            severity: "critical",
        };
    }
}
//# sourceMappingURL=pluginval-runner.js.map
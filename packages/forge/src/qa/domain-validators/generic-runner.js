/**
 * Generic Test Runner — Runs whatever test command is specified in domain config.
 * Returns pass/fail based on exit code.
 */
import { execSync } from "node:child_process";
export async function runGenericTests(projectDir, config) {
    try {
        const output = execSync(config.testCommand, {
            cwd: projectDir,
            timeout: config.timeout ?? 120000,
            encoding: "utf-8",
        });
        return {
            tester: "generic-runner",
            passed: true,
            artifact: projectDir,
            category: "integration",
            details: `Command "${config.testCommand}" passed\n${output.slice(0, 500)}`,
        };
    }
    catch (e) {
        const exitCode = e.status ?? "unknown";
        return {
            tester: "generic-runner",
            passed: false,
            artifact: projectDir,
            category: "integration",
            details: `Command "${config.testCommand}" failed (exit ${exitCode}): ${(e.stdout ?? e.message ?? "").slice(0, 500)}`,
            severity: "major",
        };
    }
}
//# sourceMappingURL=generic-runner.js.map
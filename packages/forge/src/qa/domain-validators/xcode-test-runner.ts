/**
 * Xcode Test Runner — Runs xcodebuild test for iOS/macOS projects.
 * Gracefully skips if Xcode is not available.
 */
import { execSync } from "node:child_process";
import type { QAResult } from "../verdict.js";

async function toolExists(tool: string): Promise<boolean> {
  const cmd = process.platform === "win32" ? `where ${tool}` : `which ${tool}`;
  try {
    execSync(cmd, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

export async function runXcodeTests(projectDir: string, scheme?: string): Promise<QAResult> {
  if (!(await toolExists("xcodebuild"))) {
    return {
      tester: "xcode-test-runner",
      passed: true,
      skipped: true,
      artifact: "xcode-project",
      category: "domain-validation",
      details: "xcodebuild not found — skipped",
    };
  }

  try {
    const schemeArg = scheme ? `-scheme ${scheme}` : "-scheme Debug";
    const output = execSync(
      `xcodebuild test ${schemeArg} -destination 'platform=iOS Simulator,name=iPhone 15' -quiet`,
      {
        cwd: projectDir,
        timeout: 600000, // 10 minutes
        encoding: "utf-8",
      },
    );

    const testMatch = output.match(/(\d+) tests?,\s*(\d+) passed?,\s*(\d+) failed?/i);
    const passed = testMatch ? parseInt(testMatch[2]) : 0;
    const failed = testMatch ? parseInt(testMatch[3]) : 0;

    return {
      tester: "xcode-test-runner",
      passed: failed === 0,
      artifact: "xcode-project",
      category: "unit-test",
      details: `${passed} tests passed, ${failed} failed`,
    };
  } catch (e: any) {
    return {
      tester: "xcode-test-runner",
      passed: false,
      artifact: "xcode-project",
      category: "unit-test",
      details: `Xcode test execution failed: ${(e.stdout ?? e.message ?? "").slice(0, 500)}`,
      severity: "major",
    };
  }
}
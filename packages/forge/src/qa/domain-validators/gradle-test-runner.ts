/**
 * Gradle Test Runner — Runs ./gradlew test for Android/JVM projects.
 * Gracefully skips if Gradle is not available.
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

export async function runGradleTests(projectDir: string): Promise<QAResult> {
  // Check if gradlew exists in the project
  const fs = await import("node:fs");
  const path = await import("node:path");

  const gradlew = process.platform === "win32" ? "gradlew.bat" : "gradlew";
  const gradlewPath = path.join(projectDir, gradlew);

  if (!fs.existsSync(gradlewPath)) {
    // Check for system gradle
    if (!(await toolExists("gradle"))) {
      return {
        tester: "gradle-test-runner",
        passed: true,
        skipped: true,
        artifact: "gradle-project",
        category: "domain-validation",
        details: "Gradle wrapper not found and system gradle not available — skipped",
      };
    }
  }

  try {
    const cmd = fs.existsSync(gradlewPath)
      ? `./${gradlew} test`
      : "gradle test";

    const output = execSync(cmd, {
      cwd: projectDir,
      timeout: 300000, // 5 minutes
      encoding: "utf-8",
    });

    // Parse test results from output
    const testMatch = output.match(/(\d+) tests?,\s*(\d+) passed?,\s*(\d+) failed?/i);
    const tests = testMatch ? parseInt(testMatch[1]) : 0;
    const passed = testMatch ? parseInt(testMatch[2]) : 0;
    const failed = testMatch ? parseInt(testMatch[3]) : 0;

    return {
      tester: "gradle-test-runner",
      passed: failed === 0,
      artifact: "gradle-project",
      category: "unit-test",
      details: `${passed}/${tests} tests passed, ${failed} failed`,
    };
  } catch (e: any) {
    return {
      tester: "gradle-test-runner",
      passed: false,
      artifact: "gradle-project",
      category: "unit-test",
      details: `Gradle test execution failed: ${(e.stdout ?? e.message ?? "").slice(0, 500)}`,
      severity: "major",
    };
  }
}
/**
 * Unreal Engine Automation Runner — Runs UE automation tests.
 * Gracefully skips if UE is not available.
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

export async function runUEAutomation(projectDir: string, projectFile?: string): Promise<QAResult> {
  // Check for Unreal Editor
  if (!(await toolExists("UnrealEditor-Cmd")) && !(await toolExists("UnrealEditor"))) {
    return {
      tester: "ue-automation",
      passed: true,
      skipped: true,
      artifact: "unreal-project",
      category: "domain-validation",
      details: "UnrealEditor not found — skipped",
    };
  }

  try {
    const projFile = projectFile ?? "UnrealProject.uproject";
    const cmd = `UnrealEditor-Cmd "${projFile}" -ExecCmds="Automation RunTests;Quit" -unattended -nopause -NullRHI -log`;
    const output = execSync(cmd, {
      cwd: projectDir,
      timeout: 600000, // 10 minutes
      encoding: "utf-8",
    });

    // Parse automation results
    const successMatch = output.match(/Automation:\s*(\d+) Completed/i);
    const failMatch = output.match(/(\d+) Failed/i);

    const total = successMatch ? parseInt(successMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;
    const passed = total - failed;

    return {
      tester: "ue-automation",
      passed: failed === 0,
      artifact: "unreal-project",
      category: "integration",
      details: `${passed}/${total} automation tests passed, ${failed} failed`,
    };
  } catch (e: any) {
    return {
      tester: "ue-automation",
      passed: false,
      artifact: "unreal-project",
      category: "integration",
      details: `UE automation failed: ${(e.stdout ?? e.message ?? "").slice(0, 500)}`,
      severity: "major",
    };
  }
}
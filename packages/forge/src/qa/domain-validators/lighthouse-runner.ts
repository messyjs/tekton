/**
 * Lighthouse Runner — Runs Lighthouse audits on web projects.
 *
 * Gracefully skips if Lighthouse is not available.
 */
import { execSync } from "node:child_process";
import type { QAResult } from "../verdict.js";

function isWindows(): boolean {
  return process.platform === "win32";
}

async function toolExists(tool: string): Promise<boolean> {
  const cmd = isWindows() ? `where ${tool}` : `which ${tool}`;
  try {
    execSync(cmd, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

export async function runLighthouse(url: string, minScore = 70): Promise<QAResult> {
  // Check if lighthouse is available
  if (!(await toolExists("npx"))) {
    return {
      tester: "lighthouse-runner",
      passed: true,
      skipped: true,
      artifact: url,
      category: "domain-validation",
      details: "npx not found — skipped lighthouse audit",
    };
  }

  try {
    const output = execSync(
      `npx lighthouse "${url}" --output=json --chrome-flags="--headless" --quiet`,
      { timeout: 120000, encoding: "utf-8" },
    );

    const result = JSON.parse(output);
    const scores: Record<string, number> = {
      performance: Math.round((result.categories?.performance?.score ?? 0) * 100),
      accessibility: Math.round((result.categories?.accessibility?.score ?? 0) * 100),
      bestPractices: Math.round((result.categories?.["best-practices"]?.score ?? 0) * 100),
      seo: Math.round((result.categories?.seo?.score ?? 0) * 100),
    };

    const allPass = Object.values(scores).every(s => s >= minScore);

    return {
      tester: "lighthouse-runner",
      passed: allPass,
      artifact: url,
      category: "domain-validation",
      details: `Lighthouse scores: ${Object.entries(scores).map(([k, v]) => `${k}: ${v}`).join(", ")}`,
      scores,
    };
  } catch (e: any) {
    return {
      tester: "lighthouse-runner",
      passed: false,
      artifact: url,
      category: "domain-validation",
      details: `Lighthouse audit failed: ${(e.message ?? "").slice(0, 300)}`,
      severity: "major",
    };
  }
}
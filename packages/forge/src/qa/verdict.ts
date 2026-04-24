/**
 * Verdict — Aggregates QA results into a final verdict.
 */

export interface QAResult {
  tester: string;
  passed: boolean;
  skipped?: boolean;
  artifact: string;
  category: "unit-test" | "integration" | "review" | "domain-validation" | "security" | string;
  details: string;
  scores?: Record<string, number>;
  severity?: "critical" | "major" | "minor";
}

/**
 * Aggregate QA results into a final verdict.
 *
 * - "pass": all testers passed, no failures
 * - "conditional-pass": only minor issues (review comments, non-critical warnings),
 *   all tests passed, no security issues
 * - "fail": any test failure, build failure, or security issue found
 */
export function aggregateResults(results: QAResult[]): "pass" | "conditional-pass" | "fail" {
  // Any skipped results don't count against
  const active = results.filter(r => !r.skipped);

  if (active.length === 0) {
    // No active results at all — pass by default
    return "pass";
  }

  // Check for outright failures
  const failures = active.filter(r => !r.passed);

  // If any failure, check severity
  for (const failure of failures) {
    // Security failures are always critical
    if (failure.category === "security" || failure.category === "domain-validation") {
      return "fail";
    }
    // Integration/unit test failures are critical
    if (failure.category === "unit-test" || failure.category === "integration") {
      return "fail";
    }
    // Build failures are critical
    if (failure.details.toLowerCase().includes("build failed") ||
        failure.details.toLowerCase().includes("compilation error")) {
      return "fail";
    }
  }

  // If there are failures but they're all review/warning category
  if (failures.length > 0) {
    const allMinor = failures.every(f => f.severity === "minor" || f.category === "review");
    if (allMinor) {
      return "conditional-pass";
    }
    // Non-critical but non-minor failures
    return "conditional-pass";
  }

  // All passed
  return "pass";
}
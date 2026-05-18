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
export declare function aggregateResults(results: QAResult[]): "pass" | "conditional-pass" | "fail";
//# sourceMappingURL=verdict.d.ts.map
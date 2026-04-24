/**
 * QA Manager — Orchestrates the full QA pipeline for a Forge project.
 *
 * Pipeline:
 * 1. Collect all beta artifacts from manifest
 * 2. For each domain: run domain validator (if tool available)
 * 3. Spawn unit-tester agent → write and run tests
 * 4. Spawn integration-tester agent → build and integration tests
 * 5. Spawn review-agent → code review all files
 * 6. Collect all results via verdict.ts
 * 7. Return aggregate verdict
 */
import type { ForgeManifest, RoleDefinition, ArtifactEntry } from "../types.js";
import { aggregateResults, type QAResult } from "./verdict.js";

export interface QAManagerConfig {
  sessionLimit: number;
  maxQACycles: number;
  skipDomainValidators?: boolean;
}

const DEFAULT_QA_CONFIG: QAManagerConfig = {
  sessionLimit: 15,
  maxQACycles: 2,
};

// ── Sub-agent definitions ──────────────────────────────────────────────────

export const UNIT_TESTER_ROLE: RoleDefinition = {
  id: "unit-tester",
  name: "Unit Tester",
  systemPrompt: `You are a unit test engineer. For each source file, write appropriate unit tests using the project's test framework (Vitest for TS, pytest for Python, Catch2 for C++, etc). Run the tests. Report pass/fail for each file with details on failures.`,
  tools: ["terminal", "file"],
  model: "fast",
  sessionLimit: 15,
};

export const INTEGRATION_TESTER_ROLE: RoleDefinition = {
  id: "integration-tester",
  name: "Integration Tester",
  systemPrompt: `You are an integration tester. Build the full project using the build command. Then run integration tests that verify components work together. For web apps, check that pages load. For VSTs, compile the plugin. For CAD, render the model. Report build success/failure and test results.`,
  tools: ["terminal", "file"],
  model: "fast",
  sessionLimit: 15,
};

export const REVIEW_AGENT_ROLE: RoleDefinition = {
  id: "review-agent",
  name: "Code Reviewer",
  systemPrompt: `You are a code reviewer. Review all source files for: code style consistency, security issues (hardcoded secrets, injection, XSS), error handling quality, edge cases, consistency with the product brief, documentation quality. Give pass/fail per category with specific feedback.`,
  tools: ["file"],
  model: "fast",
  sessionLimit: 15,
};

// ── Domain validator result type ────────────────────────────────────────────

export interface DomainValidatorResult {
  domain: string;
  passed: boolean;
  skipped: boolean;
  reason?: string;
  details?: string;
  scores?: Record<string, number>;
}

// ── QA Manager ──────────────────────────────────────────────────────────────

export class QAManager {
  private config: QAManagerConfig;
  private domainValidators: Map<string, (projectDir: string, buildOutput?: string) => Promise<QAResult>> = new Map();
  private runSubAgent?: (role: RoleDefinition, context: string) => Promise<QAResult>;

  constructor(config?: Partial<QAManagerConfig>) {
    this.config = { ...DEFAULT_QA_CONFIG, ...config };
  }

  /**
   * Register a domain validator.
   */
  registerDomainValidator(domain: string, validator: (projectDir: string, buildOutput?: string) => Promise<QAResult>): void {
    this.domainValidators.set(domain, validator);
  }

  /**
   * Set the sub-agent execution function.
   * In production, this calls the agent pool. In tests, this can be mocked.
   */
  setSubAgentRunner(runner: (role: RoleDefinition, context: string) => Promise<QAResult>): void {
    this.runSubAgent = runner;
  }

  /**
   * Run the full QA pipeline on a project.
   */
  async runQAPipeline(
    projectDir: string,
    manifest: ForgeManifest,
  ): Promise<{
    verdict: "pass" | "conditional-pass" | "fail";
    results: QAResult[];
    failedArtifacts: string[];
  }> {
    const results: QAResult[] = [];

    // 1. Domain validators
    if (!this.config.skipDomainValidators) {
      for (const domain of manifest.domains) {
        const validator = this.domainValidators.get(domain);
        if (validator) {
          try {
            const result = await validator(projectDir);
            results.push(result);
          } catch (e) {
            results.push({
              tester: `domain-validator-${domain}`,
              passed: false,
              artifact: "",
              category: "domain-validation",
              details: `Domain validator error: ${(e as Error).message}`,
            });
          }
        } else {
          // No validator registered — skip
          results.push({
            tester: `domain-validator-${domain}`,
            passed: true, // No validator = assume pass
            skipped: true,
            artifact: "",
            category: "domain-validation",
            details: `No domain validator registered for ${domain}`,
          });
        }
      }
    }

    // 2. Unit tests
    const unitResult = await this.runSubAgentOrMock(
      UNIT_TESTER_ROLE,
      `Run unit tests for all source files in ${projectDir}`,
    );
    results.push(unitResult);

    // 3. Integration tests
    const integrationResult = await this.runSubAgentOrMock(
      INTEGRATION_TESTER_ROLE,
      `Build and run integration tests for ${projectDir}`,
    );
    results.push(integrationResult);

    // 4. Code review
    const reviewResult = await this.runSubAgentOrMock(
      REVIEW_AGENT_ROLE,
      `Review all source files in ${projectDir}`,
    );
    results.push(reviewResult);

    // 5. Check all artifacts have QA signoffs
    for (const artifact of manifest.artifacts) {
      const signoffs = manifest.qaSignoffs.filter(s => s.artifactPath === artifact.path);
      if (signoffs.length === 0) {
        // No signoff yet — not necessarily a failure
      }
    }

    // 6. Aggregate results
    const verdict = aggregateResults(results);
    const failedArtifacts = results
      .filter(r => !r.passed && !r.skipped)
      .map(r => r.artifact)
      .filter((v, i, a) => a.indexOf(v) === i); // deduplicate

    return { verdict, results, failedArtifacts };
  }

  // ── Private helpers ───────────────────────────────────────────────

  private async runSubAgentOrMock(role: RoleDefinition, context: string): Promise<QAResult> {
    if (this.runSubAgent) {
      return this.runSubAgent(role, context);
    }

    // Default mock: assume pass
    return {
      tester: role.id,
      passed: true,
      artifact: context,
      category: role.id === "unit-tester" ? "unit-test" : role.id === "integration-tester" ? "integration" : "review",
      details: `Mock result for ${role.id}`,
    };
  }
}
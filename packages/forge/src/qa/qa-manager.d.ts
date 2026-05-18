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
import type { ForgeManifest, RoleDefinition } from "../types.js";
import { type QAResult } from "./verdict.js";
export interface QAManagerConfig {
    sessionLimit: number;
    maxQACycles: number;
    skipDomainValidators?: boolean;
}
export declare const UNIT_TESTER_ROLE: RoleDefinition;
export declare const INTEGRATION_TESTER_ROLE: RoleDefinition;
export declare const REVIEW_AGENT_ROLE: RoleDefinition;
export interface DomainValidatorResult {
    domain: string;
    passed: boolean;
    skipped: boolean;
    reason?: string;
    details?: string;
    scores?: Record<string, number>;
}
export declare class QAManager {
    private config;
    private domainValidators;
    private runSubAgent?;
    constructor(config?: Partial<QAManagerConfig>);
    /**
     * Register a domain validator.
     */
    registerDomainValidator(domain: string, validator: (projectDir: string, buildOutput?: string) => Promise<QAResult>): void;
    /**
     * Set the sub-agent execution function.
     * In production, this calls the agent pool. In tests, this can be mocked.
     */
    setSubAgentRunner(runner: (role: RoleDefinition, context: string) => Promise<QAResult>): void;
    /**
     * Run the full QA pipeline on a project.
     */
    runQAPipeline(projectDir: string, manifest: ForgeManifest): Promise<{
        verdict: "pass" | "conditional-pass" | "fail";
        results: QAResult[];
        failedArtifacts: string[];
    }>;
    private runSubAgentOrMock;
}
//# sourceMappingURL=qa-manager.d.ts.map
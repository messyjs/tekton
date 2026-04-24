/**
 * QA — Exports for quality assurance pipeline.
 */

// QA Manager — Orchestrates the full QA pipeline
export { QAManager, UNIT_TESTER_ROLE, INTEGRATION_TESTER_ROLE, REVIEW_AGENT_ROLE, type QAManagerConfig } from "./qa-manager.js";

// Verdict — Aggregates QA results
export { aggregateResults, type QAResult } from "./verdict.js";

// Failure Router — Creates retry task cards
export { createRetryCard } from "./failure-router.js";

// Promotion — Beta → Release artifact promotion
export { promoteArtifact, promoteAll } from "./promotion.js";

// Domain Validators
export { validatePlugin } from "./domain-validators/pluginval-runner.js";
export { runLighthouse } from "./domain-validators/lighthouse-runner.js";
export { runGradleTests } from "./domain-validators/gradle-test-runner.js";
export { runXcodeTests } from "./domain-validators/xcode-test-runner.js";
export { runUEAutomation } from "./domain-validators/ue-automation.js";
export { validateOpenSCAD } from "./domain-validators/openscad-validator.js";
export { runGenericTests, type GenericRunnerConfig } from "./domain-validators/generic-runner.js";
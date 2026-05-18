/**
 * QA — Exports for quality assurance pipeline.
 */
export { QAManager, UNIT_TESTER_ROLE, INTEGRATION_TESTER_ROLE, REVIEW_AGENT_ROLE, type QAManagerConfig } from "./qa-manager.js";
export { aggregateResults, type QAResult } from "./verdict.js";
export { createRetryCard } from "./failure-router.js";
export { promoteArtifact, promoteAll } from "./promotion.js";
export { validatePlugin } from "./domain-validators/pluginval-runner.js";
export { runLighthouse } from "./domain-validators/lighthouse-runner.js";
export { runGradleTests } from "./domain-validators/gradle-test-runner.js";
export { runXcodeTests } from "./domain-validators/xcode-test-runner.js";
export { runUEAutomation } from "./domain-validators/ue-automation.js";
export { validateOpenSCAD } from "./domain-validators/openscad-validator.js";
export { runGenericTests, type GenericRunnerConfig } from "./domain-validators/generic-runner.js";
//# sourceMappingURL=index.d.ts.map
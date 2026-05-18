/**
 * @tekton/forge — Autonomous product engineering system.
 *
 * Forge manages multi-agent teams that build real, shippable products
 * across 9 product domains with session budgets, artifact tracking,
 * and QA gates.
 */
export { ProductDomainEnum, ProductBriefSchema, RevisionNoteSchema, DirectorDecisionSchema, ProductionPlanSchema, TaskCardSchema, TeamTemplateSchema, RoleDefinitionSchema, TestRoleDefinitionSchema, AgentTupleSchema, SessionRecordSchema, HandoffPackageSchema, FileChangeSchema, ForgeManifestSchema, ArtifactEntrySchema, QASignoffSchema, PreflightResultSchema, } from "./types.js";
// Domain registry
export { DomainRegistry, loadDomains, getDomain, matchDomains, getTeamTemplate, listDomains } from "./domain-registry.js";
// Core utilities
export { mergeTemplates } from "./team-assembler.js";
export { createTaskCard, updateStatus, getNextReady, getDependencyOrder } from "./task-card.js";
export { loadManifest, saveManifest, addArtifact, updateArtifactStatus, getArtifactsByStatus, addQASignoff, getSignoffs } from "./manifest.js";
export { createBudget, increment, remaining, isWarningZone, isExhausted, getLimit } from "./session-budget.js";
export { markBeta, markTesting, promote, getStatus } from "./artifact-tracker.js";
// Ideation
export { strategist } from "./ideation/personas/strategist.js";
export { architect } from "./ideation/personas/architect.js";
export { uxThinker } from "./ideation/personas/ux-thinker.js";
export { ChatRoom } from "./ideation/chat-room.js";
export { CreativeTeam } from "./ideation/creative-team.js";
export { validateBrief } from "./ideation/brief-schema.js";
export { generateBrief } from "./ideation/brief-generator.js";
// Director
export { evaluateBrief } from "./director/evaluator.js";
export { classifyDomains } from "./director/domain-classifier.js";
export { generatePlan } from "./director/plan-generator.js";
export { approvalGate } from "./director/index.js";
export { addRevision, getRevisionCount, getLatestRevision, hasExceededMaxRevisions } from "./director/revision-tracker.js";
export { finalSignoff } from "./director/final-signoff.js";
// Production
export { spawnProductionAgent } from "./production/agent-spawner.js";
export { SessionRunner } from "./production/session-runner.js";
export { resolveOrder, getReady, hasCycle } from "./production/dependency-resolver.js";
export { ParallelExecutor } from "./production/parallel-executor.js";
export { markAsBeta, isBetaFile, getOriginalName, listBetaFiles } from "./production/beta-file-manager.js";
export { ProductionManager } from "./production/production-manager.js";
export { validateRole, buildSystemPrompt, roleRegistry, getRoleDefinition, listRoleIds } from "./production/roles/index.js";
// Continuity
export { Scribe } from "./continuity/scribe.js";
export { ScribePool } from "./continuity/scribe-pool.js";
export { SessionManager, getWarningMessage } from "./continuity/session-manager.js";
export { buildHandoff } from "./continuity/handoff-builder.js";
export { loadLatestHandoff, formatAsContext } from "./continuity/handoff-loader.js";
export { ForgeCavememBridge } from "./continuity/cavemem-bridge.js";
export { FileTracker } from "./continuity/file-tracker.js";
export { ResetOrchestrator } from "./continuity/reset-orchestrator.js";
// QA
export { QAManager, UNIT_TESTER_ROLE, INTEGRATION_TESTER_ROLE, REVIEW_AGENT_ROLE } from "./qa/qa-manager.js";
export { aggregateResults } from "./qa/verdict.js";
export { createRetryCard } from "./qa/failure-router.js";
export { promoteArtifact, promoteAll } from "./qa/promotion.js";
export { validatePlugin } from "./qa/domain-validators/pluginval-runner.js";
export { runLighthouse } from "./qa/domain-validators/lighthouse-runner.js";
export { runGradleTests } from "./qa/domain-validators/gradle-test-runner.js";
export { runXcodeTests } from "./qa/domain-validators/xcode-test-runner.js";
export { runUEAutomation } from "./qa/domain-validators/ue-automation.js";
export { validateOpenSCAD } from "./qa/domain-validators/openscad-validator.js";
export { runGenericTests } from "./qa/domain-validators/generic-runner.js";
// Preflight
export { checkDomain, checkMultipleDomains } from "./preflight.js";
// Forge Runtime
export { ForgeRuntime } from "./forge-runtime.js";
//# sourceMappingURL=index.js.map
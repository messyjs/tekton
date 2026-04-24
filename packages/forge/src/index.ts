/**
 * @tekton/forge — Autonomous product engineering system.
 *
 * Forge manages multi-agent teams that build real, shippable products
 * across 9 product domains with session budgets, artifact tracking,
 * and QA gates.
 */

// Types
export type {
  ProductDomain,
  ProductBrief,
  RevisionNote,
  DirectorVerdict,
  DirectorDecision,
  ProductionPlan,
  TaskCard,
  TaskCardStatus,
  TeamTemplate,
  RoleDefinition,
  TestRoleDefinition,
  AgentTuple,
  SessionRecord,
  SessionRecordStatus,
  HandoffPackage,
  FileChange,
  FileChangeAction,
  FileChangeStatus,
  ForgeManifest,
  ForgePhase,
  ArtifactEntry,
  ArtifactStatus,
  QASignoff,
  PreflightResult,
} from "./types.js";

export {
  ProductDomainEnum,
  ProductBriefSchema,
  RevisionNoteSchema,
  DirectorDecisionSchema,
  ProductionPlanSchema,
  TaskCardSchema,
  TeamTemplateSchema,
  RoleDefinitionSchema,
  TestRoleDefinitionSchema,
  AgentTupleSchema,
  SessionRecordSchema,
  HandoffPackageSchema,
  FileChangeSchema,
  ForgeManifestSchema,
  ArtifactEntrySchema,
  QASignoffSchema,
  PreflightResultSchema,
} from "./types.js";

// Domain registry
export { DomainRegistry, loadDomains, getDomain, matchDomains, getTeamTemplate, listDomains } from "./domain-registry.js";

// Core utilities
export { mergeTemplates } from "./team-assembler.js";
export { createTaskCard, updateStatus, getNextReady, getDependencyOrder } from "./task-card.js";
export { loadManifest, saveManifest, addArtifact, updateArtifactStatus, getArtifactsByStatus, addQASignoff, getSignoffs } from "./manifest.js";
export { SessionBudget, createBudget, increment, remaining, isWarningZone, isExhausted, getLimit } from "./session-budget.js";
export { markBeta, markTesting, promote, getStatus } from "./artifact-tracker.js";

// Ideation
export { strategist } from "./ideation/personas/strategist.js";
export type { Persona } from "./ideation/personas/strategist.js";
export { architect } from "./ideation/personas/architect.js";
export { uxThinker } from "./ideation/personas/ux-thinker.js";
export { ChatRoom } from "./ideation/chat-room.js";
export type { ChatMessage, ConversationPhase, ChatRoomConfig } from "./ideation/chat-room.js";
export { CreativeTeam } from "./ideation/creative-team.js";
export type { CreativeTeamConfig, CreativeTeamResponse } from "./ideation/creative-team.js";
export { validateBrief } from "./ideation/brief-schema.js";
export type { BriefValidationResult } from "./ideation/brief-schema.js";
export { generateBrief } from "./ideation/brief-generator.js";

// Director
export { evaluateBrief } from "./director/evaluator.js";
export { classifyDomains } from "./director/domain-classifier.js";
export { generatePlan } from "./director/plan-generator.js";
export { approvalGate } from "./director/index.js";
export type { ApprovalGateConfig } from "./director/approval-gate.js";
export { addRevision, getRevisionCount, getLatestRevision, hasExceededMaxRevisions } from "./director/revision-tracker.js";
export { finalSignoff } from "./director/final-signoff.js";
export type { SignoffResult } from "./director/final-signoff.js";

// Production
export { spawnProductionAgent } from "./production/agent-spawner.js";
export { SessionRunner } from "./production/session-runner.js";
export type { SessionResult, SessionRunnerConfig } from "./production/session-runner.js";
export { resolveOrder, getReady, hasCycle } from "./production/dependency-resolver.js";
export { ParallelExecutor } from "./production/parallel-executor.js";
export { markAsBeta, isBetaFile, getOriginalName, listBetaFiles } from "./production/beta-file-manager.js";
export { ProductionManager } from "./production/production-manager.js";
export type { ProductionResult, ProductionManagerConfig } from "./production/production-manager.js";
export { validateRole, buildSystemPrompt, roleRegistry, getRoleDefinition, listRoleIds } from "./production/roles/index.js";

// Continuity
export { Scribe, type ScribeConfig, type CavememStore, type AgentMessage, type Observation } from "./continuity/scribe.js";
export { ScribePool, type ScribePoolConfig } from "./continuity/scribe-pool.js";
export { SessionManager, type TrackedSession, type SessionManagerConfig, getWarningMessage } from "./continuity/session-manager.js";
export { buildHandoff, type SessionRecordExtended } from "./continuity/handoff-builder.js";
export { loadLatestHandoff, formatAsContext } from "./continuity/handoff-loader.js";
export { ForgeCavememBridge } from "./continuity/cavemem-bridge.js";
export { FileTracker, type FileChangeWithRole } from "./continuity/file-tracker.js";
export { ResetOrchestrator, type AgentSpawner, type SessionRunnerInterface } from "./continuity/reset-orchestrator.js";

// QA
export { QAManager, UNIT_TESTER_ROLE, INTEGRATION_TESTER_ROLE, REVIEW_AGENT_ROLE, type QAManagerConfig } from "./qa/qa-manager.js";
export { aggregateResults, type QAResult } from "./qa/verdict.js";
export { createRetryCard } from "./qa/failure-router.js";
export { promoteArtifact, promoteAll } from "./qa/promotion.js";
export { validatePlugin } from "./qa/domain-validators/pluginval-runner.js";
export { runLighthouse } from "./qa/domain-validators/lighthouse-runner.js";
export { runGradleTests } from "./qa/domain-validators/gradle-test-runner.js";
export { runXcodeTests } from "./qa/domain-validators/xcode-test-runner.js";
export { runUEAutomation } from "./qa/domain-validators/ue-automation.js";
export { validateOpenSCAD } from "./qa/domain-validators/openscad-validator.js";
export { runGenericTests, type GenericRunnerConfig } from "./qa/domain-validators/generic-runner.js";

// Preflight
export { checkDomain, checkMultipleDomains } from "./preflight.js";

// Forge Runtime
export { ForgeRuntime, type ForgeRuntimeConfig, type ForgeState } from "./forge-runtime.js";
/**
 * Director — re-export all director modules.
 */
export { evaluateBrief } from "./evaluator.js";
export { classifyDomains } from "./domain-classifier.js";
export { generatePlan } from "./plan-generator.js";
export { evaluate as approvalGate } from "./approval-gate.js";
export { addRevision, getRevisionCount, getLatestRevision, hasExceededMaxRevisions } from "./revision-tracker.js";
export { finalSignoff } from "./final-signoff.js";
export type { ApprovalGateConfig } from "./approval-gate.js";
export type { SignoffResult } from "./final-signoff.js";
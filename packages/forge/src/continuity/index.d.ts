/**
 * Continuity Layer — Exports for session persistence, handoff, and reset.
 */
export { Scribe, type ScribeConfig, type CavememStore, type AgentMessage, type Observation } from "./scribe.js";
export { ScribePool, type ScribePoolConfig } from "./scribe-pool.js";
export { SessionManager, type TrackedSession, type SessionManagerConfig, getWarningMessage } from "./session-manager.js";
export { buildHandoff, type SessionRecordExtended } from "./handoff-builder.js";
export { loadLatestHandoff, formatAsContext } from "./handoff-loader.js";
export { ForgeCavememBridge } from "./cavemem-bridge.js";
export { FileTracker, type FileChangeWithRole } from "./file-tracker.js";
export { ResetOrchestrator, type AgentSpawner, type SessionRunnerInterface } from "./reset-orchestrator.js";
//# sourceMappingURL=index.d.ts.map
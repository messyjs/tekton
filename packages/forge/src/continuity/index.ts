/**
 * Continuity Layer — Exports for session persistence, handoff, and reset.
 */

// Scribe — Observes sessions and produces handoff packages
export { Scribe, type ScribeConfig, type CavememStore, type AgentMessage, type Observation } from "./scribe.js";

// Scribe Pool — Manages scribes for different production layers
export { ScribePool, type ScribePoolConfig } from "./scribe-pool.js";

// Session Manager — Monitors budgets and triggers handoff
export { SessionManager, type TrackedSession, type SessionManagerConfig, getWarningMessage } from "./session-manager.js";

// Handoff Builder — Constructs HandoffPackages from session data
export { buildHandoff, type SessionRecordExtended } from "./handoff-builder.js";

// Handoff Loader — Loads and formats handoff packages from disk
export { loadLatestHandoff, formatAsContext } from "./handoff-loader.js";

// Cavemem Bridge — Wraps Cavemem for Forge observation storage
export { ForgeCavememBridge } from "./cavemem-bridge.js";

// File Tracker — Detects file changes during sessions
export { FileTracker, type FileChangeWithRole } from "./file-tracker.js";

// Reset Orchestrator — Handles session reset with handoff context
export { ResetOrchestrator, type AgentSpawner, type SessionRunnerInterface } from "./reset-orchestrator.js";
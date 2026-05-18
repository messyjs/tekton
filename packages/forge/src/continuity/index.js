/**
 * Continuity Layer — Exports for session persistence, handoff, and reset.
 */
// Scribe — Observes sessions and produces handoff packages
export { Scribe } from "./scribe.js";
// Scribe Pool — Manages scribes for different production layers
export { ScribePool } from "./scribe-pool.js";
// Session Manager — Monitors budgets and triggers handoff
export { SessionManager, getWarningMessage } from "./session-manager.js";
// Handoff Builder — Constructs HandoffPackages from session data
export { buildHandoff } from "./handoff-builder.js";
// Handoff Loader — Loads and formats handoff packages from disk
export { loadLatestHandoff, formatAsContext } from "./handoff-loader.js";
// Cavemem Bridge — Wraps Cavemem for Forge observation storage
export { ForgeCavememBridge } from "./cavemem-bridge.js";
// File Tracker — Detects file changes during sessions
export { FileTracker } from "./file-tracker.js";
// Reset Orchestrator — Handles session reset with handoff context
export { ResetOrchestrator } from "./reset-orchestrator.js";
//# sourceMappingURL=index.js.map
/**
 * /tekton:pi — PI Agent trading intelligence control command.
 *
 * PI Agent is one of the three pillars of Tekton Agent (PI + Hermes + OpenMythos).
 * It runs in-process — no separate sidecar needed. Engines are available immediately.
 *
 * The optional `http-start` / `http-stop` commands start the HTTP sidecar
 * for external consumers (TradingView bot, Telegram bot) that need the REST API.
 */
import type { CommandRegistration } from "./types.js";
export declare function createPiCommand(): CommandRegistration;
//# sourceMappingURL=tekton-pi.d.ts.map
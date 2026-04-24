/**
 * AgentPilot Web — Standalone server entry point.
 * Run: npx tsx packages/agentpilot/src/start.ts
 */
import { AgentPilotServer } from "./server/server.js";

const server = new AgentPilotServer({
  port: Number(process.env.AGENTPILOT_PORT) || 7799,
  host: process.env.AGENTPILOT_HOST || "127.0.0.1",
});

server.start().catch(console.error);
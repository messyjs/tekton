#!/usr/bin/env node
/**
 * Standalone dashboard launcher — starts the Tekton Dashboard server
 * without needing the full CLI/runtime.
 */
import { DashboardServer } from "../packages/dashboard/dist/index.js";

const port = Number(process.env.PORT) || 7700;
const host = process.env.HOST || "127.0.0.1";

const server = new DashboardServer({ port, host });

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down dashboard...");
  await server.stop();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await server.stop();
  process.exit(0);
});

await server.start();
console.log(`\n✅ Dashboard ready — open http://${host}:${port} in your browser`);
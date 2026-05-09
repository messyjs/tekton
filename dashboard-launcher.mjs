#!/usr/bin/env node
/**
 * Tekton Dashboard — standalone launcher.
 * Usage: node dashboard-launcher.mjs [--port 7700] [--host 127.0.0.1]
 */
import { DashboardServer } from "@tekton/dashboard";

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}

const port = parseInt(getArg("port", "7700"), 10);
const host = getArg("host", "127.0.0.1");

const server = new DashboardServer({ port, host });

process.on("SIGINT", async () => {
  console.log("\nShutting down...");
  await server.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await server.stop();
  process.exit(0);
});

server.start().then(() => {
  console.log(`\n  Tekton Dashboard: ${server.getUrl()}`);
  console.log("  Press Ctrl+C to stop.\n");
}).catch((err) => {
  console.error("Failed to start dashboard:", err.message);
  process.exit(1);
});
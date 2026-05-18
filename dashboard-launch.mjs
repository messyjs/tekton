#!/usr/bin/env node
/**
 * Tekton Dashboard — Full Modular Launcher
 * Bridges the modular DashboardServer with live Ollama data
 */

import { DashboardServer } from "./packages/dashboard/dist/index.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { WebSocketServer } from "ws";
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
function getArg(name, fallback) { const i = args.indexOf("--" + name); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; }
const PORT = parseInt(getArg("port", "7700"), 10);
const HOST = getArg("host", "127.0.0.1");
const WS_PORT = parseInt(getArg("wsPort", String(PORT + 1)), 10);
const TEKTON_HOME = process.env.TEKTON_HOME || join(homedir(), ".tekton");
const CKPT_DIR = join(TEKTON_HOME, "checkpoints");
const startTime = Date.now();

function ollamaModels() {
  try {
    const raw = execSync("curl -s http://localhost:11434/api/tags", { timeout: 5000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    const d = JSON.parse(raw);
    const all = (d.models || []).map(m => m.name);
    return { all, cloud: all.filter(m => m.includes(":cloud")), local: all.filter(m => !m.includes(":cloud")), error: null };
  } catch { return { all: [], cloud: [], local: [], error: "Ollama not reachable" }; }
}

function bestChatModel(models) {
  const cloudModels = ["deepseek-v4-pro:cloud", "deepseek-v4-flash:cloud", "glm-5.1:cloud"];
  for (const cm of cloudModels) { if (models.cloud && models.cloud.includes(cm)) return cm; }
  const localModels = ["qwen3:1.7b", "deepseek-r1:1.5b", "gemma3:1b"];
  for (const lm of localModels) { if (models.local && models.local.includes(lm)) return lm; }
  return (models.local && models.local[0]) || "llama3.2:1b";
}

function livePorts() {
  try {
    const raw = execSync("netstat -ano | findstr LISTENING", { timeout: 5000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    const s = new Set();
    for (const l of raw.split("\n")) { const m = l.match(/:(\d+)\s/); if (m) { const p = parseInt(m[1], 10); if ((p >= 7700 && p <= 7799) || p === 8888 || p === 11434 || p === 9222 || p === 19222) s.add(p); } }
    return [...s].sort((a, b) => a - b);
  } catch { return []; }
}

if (!existsSync(CKPT_DIR)) mkdirSync(CKPT_DIR, { recursive: true });
function listCheckpoints() {
  return readdirSync(CKPT_DIR).filter(f => !f.startsWith("_") && f.endsWith(".json")).map(f => { try { return JSON.parse(readFileSync(join(CKPT_DIR, f), "utf-8")); } catch { return null; } }).filter(Boolean).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}
function getRestore() {
  const f = join(CKPT_DIR, "_restore.json");
  if (!existsSync(f)) return null;
  try { const { checkpointId } = JSON.parse(readFileSync(f, "utf-8")); const cf = join(CKPT_DIR, checkpointId + ".json"); return existsSync(cf) ? JSON.parse(readFileSync(cf, "utf-8")) : null; } catch { return null; }
}
function saveCp(cp) {
  writeFileSync(join(CKPT_DIR, cp.id + ".json"), JSON.stringify(cp, null, 2));
  writeFileSync(join(CKPT_DIR, "_restore.json"), JSON.stringify({ checkpointId: cp.id, timestamp: cp.timestamp }, null, 2));
}

console.log("  ⚡ Starting Tekton Modular Dashboard...");
console.log("  📦 Config: port=" + PORT + ", host=" + HOST + ", ws=" + WS_PORT);

const dashConfig = { port: PORT, host: HOST, autoStart: true, refreshIntervalMs: 5000, theme: "dark", wsPort: WS_PORT, authEnabled: false };
const server = new DashboardServer(dashConfig);

// Patch status with live Ollama data
server.app.get("/api/status", (c) => {
  const m = ollamaModels();
  return c.json({
    version: "0.2.0-modular", uptimeMs: Date.now() - startTime,
    model: { current: bestChatModel(m), provider: m.cloud.length ? "ollama-cloud" : "ollama-local", available: m.all, cloudModels: m.cloud, localModels: m.local },
    tokens: { total: 0, input: 0, output: 0, budget: null },
    compression: { ratio: 0, tokensSaved: 0 },
    skills: { total: 0, topUsed: [] },
    agents: { active: 0, max: 4 },
    learning: { enabled: true, totalEvaluations: 0, avgConfidence: 0 },
    gateway: {},
    voice: { enabled: false, sttProvider: "local", ttsProvider: "edge" },
    ollama: m.error ? { error: m.error } : { connected: true, modelCount: m.all.length },
  });
});

// Patch models with live Ollama data
server.app.get("/api/models", (c) => {
  const m = ollamaModels();
  return c.json({ ...m, recommended: m.all[0] || "none", chatDefault: bestChatModel(m) });
});

// Add system ports endpoint
server.app.get("/api/system/ports", (c) => c.json({ ports: livePorts() }));

// Add checkpoint endpoints
server.app.get("/api/checkpoint/status", (c) => {
  const cps = listCheckpoints(); const r = getRestore();
  return c.json({ totalCheckpoints: cps.length, restorePoint: r ? { id: r.id, label: r.label, timestamp: r.timestamp } : null, autoCheckpoint: "10min", compaction: "7 days" });
});
server.app.get("/api/checkpoint/list", (c) => c.json({ checkpoints: listCheckpoints() }));
server.app.get("/api/checkpoint/restore", (c) => { const r = getRestore(); return r ? c.json(r) : c.json({ error: "No restore point" }, 404); });
server.app.post("/api/checkpoint/set", async (c) => {
  try {
    const b = await c.req.json().catch(() => ({})); const m = ollamaModels();
    const cp = { id: "manual-" + Date.now(), label: b.label || "manual", timestamp: new Date().toISOString(), task: b.task || "Dashboard checkpoint", context: { cwd: process.cwd(), model: bestChatModel(m), provider: "ollama" }, recentMessages: [], runningProcesses: [], listeningPorts: livePorts(), type: "manual" };
    saveCp(cp); return c.json({ success: true, checkpoint: cp });
  } catch (e) { return c.json({ error: e.message }, 500); }
});
server.app.delete("/api/checkpoint/clear-restore", (c) => { const f = join(CKPT_DIR, "_restore.json"); if (existsSync(f)) rmSync(f); return c.json({ success: true }); });

// Broadcast endpoint (for gann_app etc.)
server.app.post("/api/broadcast", async (c) => {
  const b = await c.req.json().catch(() => ({})); const type = b?.type;
  if (!type) return c.json({ error: "type required" });
  let sent = 0; wss.clients.forEach((ws) => { if (ws.readyState === 1) { ws.send(JSON.stringify({ type, data: b.data || {}, timestamp: Date.now() })); sent++; } });
  return c.json({ broadcast: true, type, sent, timestamp: Date.now() });
});

// Override SPA catch-all with enhanced HTML
const ENHANCED_HTML = resolve("./served-page.html");
let customHTML;
if (existsSync(ENHANCED_HTML)) {
  customHTML = readFileSync(ENHANCED_HTML, "utf-8");
  console.log("  🎨 Loaded enhanced SPA: " + ENHANCED_HTML + " (" + (customHTML.length / 1024).toFixed(1) + " KB)");
} else {
  console.log("  ⚠️  Enhanced SPA not found, using built-in SPA");
}

// Override catch-all route — must be defined after all API routes
server.app.get("/*", (c) => {
  if (customHTML) return c.html(customHTML);
  return c.html("<html><body><h1>Tekton Dashboard</h1><p>SPA not found at " + ENHANCED_HTML + "</p></body></html>");
});

// WebSocket Server
const wss = new WebSocketServer({ port: WS_PORT, host: "0.0.0.0" });
console.log("  📡 [WS] WebSocket on ws://" + HOST + ":" + WS_PORT);

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "connected", data: { version: "0.2.0-modular" } }));
  const iv = setInterval(() => {
    if (ws.readyState === 1) {
      const m = ollamaModels();
      ws.send(JSON.stringify({ type: "status_update", data: { uptimeMs: Date.now() - startTime, model: bestChatModel(m), ports: livePorts(), conversations: server.chat.listConversations().length } }));
    }
  }, 5000);
  ws.on("close", () => clearInterval(iv));
  ws.on("message", (d) => { try { const msg = JSON.parse(d.toString()); if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong" })); } catch {} });
});

// Startup 

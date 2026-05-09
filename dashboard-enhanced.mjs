#!/usr/bin/env node
/**
 * Tekton Dashboard Enhanced
 * Full custom SPA + models, checkpoints, streaming chat, ports
 * Usage: node dashboard-enhanced.mjs [--port 7700] [--html path.html]
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { WebSocketServer } from "ws";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
function getArg(name, fallback) { const i = args.indexOf("--" + name); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; }
const port = parseInt(getArg("port", "7700"), 10);
const host = getArg("host", "127.0.0.1");
const defaultHtml = resolve(import.meta.dirname || ".", "served-page.html");
const htmlPath = getArg("html", defaultHtml);
const TEKTON_HOME = process.env.TEKTON_HOME || join(homedir(), ".tekton");
const CKPT_DIR = join(TEKTON_HOME, "checkpoints");
const startTime = Date.now();
let conversations = [];

// ── Helpers ──────────────────────────────────────────────────────────

function ollamaModels() {
  try {
    const raw = execSync("curl -s http://localhost:11434/api/tags", { timeout: 5000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    const d = JSON.parse(raw);
    const all = (d.models || []).map(m => m.name);
    return { all, cloud: all.filter(m => m.includes(":cloud")), local: all.filter(m => !m.includes(":cloud")), error: null };
  } catch { return { all: [], cloud: [], local: [], error: "Ollama not reachable" }; }
}

function livePorts() {
  try {
    const raw = execSync("netstat -ano | findstr LISTENING", { timeout: 5000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    const s = new Set();
    for (const l of raw.split("\n")) {
      const m = l.match(/:(\d+)\s/);
      if (m) {
        const p = parseInt(m[1], 10);
        if ((p >= 7700 && p <= 7799) || p === 8888 || p === 11434 || p === 9222 || p === 19222) s.add(p);
      }
    }
    return [...s].sort((a, b) => a - b);
  } catch { return []; }
}

function bestChatModel(models) {
  // Cloud models with subscription; prefer cloud, fallback to local
  const cloudModels = ['deepseek-v4-flash:cloud', 'glm-5.1:cloud'];
  for (const cm of cloudModels) {
    if (models.cloud && models.cloud.includes(cm)) return cm;
  }
  const localModels = ['qwen3:1.7b', 'deepseek-r1:1.5b', 'gemma3:1b'];
  for (const lm of localModels) {
    if (models.local && models.local.includes(lm)) return lm;
  }
  return (models.local && models.local[0]) || 'llama3.2:1b';
}

// ── Checkpoint helpers ───────────────────────────────────────────────

if (!existsSync(CKPT_DIR)) mkdirSync(CKPT_DIR, { recursive: true });

function listCheckpoints() {
  return readdirSync(CKPT_DIR)
    .filter(f => !f.startsWith("_") && f.endsWith(".json"))
    .map(f => { try { return JSON.parse(readFileSync(join(CKPT_DIR, f), "utf-8")); } catch { return null; } })
    .filter(Boolean)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function getRestore() {
  const f = join(CKPT_DIR, "_restore.json");
  if (!existsSync(f)) return null;
  try {
    const { checkpointId } = JSON.parse(readFileSync(f, "utf-8"));
    const cf = join(CKPT_DIR, checkpointId + ".json");
    return existsSync(cf) ? JSON.parse(readFileSync(cf, "utf-8")) : null;
  } catch { return null; }
}

function saveCp(cp) {
  writeFileSync(join(CKPT_DIR, cp.id + ".json"), JSON.stringify(cp, null, 2));
  writeFileSync(join(CKPT_DIR, "_restore.json"), JSON.stringify({ checkpointId: cp.id, timestamp: cp.timestamp }, null, 2));
}

// ── Load HTML ────────────────────────────────────────────────────────

let customHTML = existsSync(htmlPath)
  ? readFileSync(htmlPath, "utf-8")
  : "<html><body><h1>Tekton Dashboard</h1><p>HTML not found at " + htmlPath + "</p></body></html>";
console.log("  Loaded SPA: " + htmlPath + " (" + (customHTML.length / 1024).toFixed(1) + " KB)");

// Startup checkpoint
saveCp({
  id: "startup-" + Date.now(),
  label: "dashboard-start",
  timestamp: new Date().toISOString(),
  task: "Enhanced dashboard started",
  context: { cwd: process.cwd(), model: "enhanced", provider: "tekton", activeTools: [], featureState: { routing: true, learning: true, compression: true } },
  recentMessages: [],
  runningProcesses: [],
  listeningPorts: livePorts(),
  type: "auto",
});

// ── Hono App ──────────────────────────────────────────────────────────

const app = new Hono();
app.use("*", cors());

// ── Status
app.get("/api/status", (c) => {
  const m = ollamaModels();
  return c.json({
    version: "0.1.0-enhanced",
    uptimeMs: Date.now() - startTime,
    model: { current: m.cloud[0] || m.local[0] || "none", provider: m.cloud.length ? "ollama-cloud" : "ollama-local", available: m.all, cloudModels: m.cloud, localModels: m.local },
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

// ── Models
app.get("/api/models", (c) => {
  const m = ollamaModels();
  return c.json({ ...m, recommended: m.all[0] || "none", chatDefault: bestChatModel(m) });
});

// ── Ports
app.get("/api/system/ports", (c) => c.json({ ports: livePorts() }));

// ── Checkpoints
app.get("/api/checkpoint/status", (c) => {
  const cps = listCheckpoints();
  const r = getRestore();
  return c.json({ totalCheckpoints: cps.length, restorePoint: r ? { id: r.id, label: r.label, timestamp: r.timestamp } : null, autoCheckpoint: "10min", compaction: "7 days" });
});

app.get("/api/checkpoint/list", (c) => c.json({ checkpoints: listCheckpoints() }));

app.get("/api/checkpoint/restore", (c) => {
  const r = getRestore();
  return r ? c.json(r) : c.json({ error: "No restore point" }, 404);
});

app.post("/api/checkpoint/set", async (c) => {
  try {
    const b = await c.req.json().catch(() => ({}));
    const m = ollamaModels();
    const cp = {
      id: "manual-" + Date.now(),
      label: b.label || "manual",
      timestamp: new Date().toISOString(),
      task: b.task || "Dashboard checkpoint",
      context: { cwd: process.cwd(), model: bestChatModel(m), provider: "ollama", activeTools: [], featureState: { routing: true, learning: true, compression: true } },
      recentMessages: [],
      runningProcesses: [],
      listeningPorts: livePorts(),
      type: "manual",
    };
    saveCp(cp);
    return c.json({ success: true, checkpoint: cp });
  } catch (e) { return c.json({ error: e.message }, 500); }
});

app.delete("/api/checkpoint/clear-restore", (c) => {
  const f = join(CKPT_DIR, "_restore.json");
  if (existsSync(f)) rmSync(f);
  return c.json({ success: true });
});

// ── Chat config
app.get("/api/chat/config", (c) => {
  const m = ollamaModels();
  return c.json({ model: bestChatModel(m), provider: "ollama", baseUrl: "http://localhost:11434", systemPrompt: "Tekton Agent - adaptive coding agent that learns", maxTokens: 8192, temperature: 0.3 });
});

app.get("/api/chat/health", (c) => {
  const m = ollamaModels();
  const cm = bestChatModel(m);
  const ok = m.all.includes(cm);
  return c.json({ ok, model: cm, provider: "ollama", latencyMs: ok ? 50 : 0, error: ok ? null : "Model " + cm + " not found" });
});

app.get("/api/chat/conversations", (c) => c.json({ conversations, total: conversations.length }));

app.post("/api/chat/conversations", async (c) => {
  try {
    const b = await c.req.json().catch(() => ({}));
    const cv = { id: "conv-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8), title: b.title || "New Chat", messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    conversations.unshift(cv);
    return c.json(cv, 201);
  } catch (e) { return c.json({ error: e.message }, 400); }
});

app.get("/api/chat/conversations/:id", (c) => {
  const id = c.req.param("id");
  const cv = conversations.find(v => v.id === id);
  return cv ? c.json(cv) : c.json({ error: "Not found" }, 404);
});

app.delete("/api/chat/conversations/:id", (c) => {
  const id = c.req.param("id");
  const i = conversations.findIndex(v => v.id === id);
  if (i === -1) return c.json({ error: "Not found" }, 404);
  conversations.splice(i, 1);
  return c.json({ success: true });
});

app.post("/api/chat/conversations/:id/messages", async (c) => {
  const id = c.req.param("id");
  const cv = conversations.find(v => v.id === id);
  if (!cv) return c.json({ error: "Not found" }, 404);
  try {
    const b = await c.req.json();
    if (!b.content) return c.json({ error: "Content required" }, 400);
    cv.messages.push({ id: "msg-" + Date.now(), role: "user", content: b.content, timestamp: Date.now() });
    const m = ollamaModels();
    const cm = bestChatModel(m);
    const msgs = [{ role: "system", content: "You are Tekton Agent. Be concise and direct." }, ...cv.messages.map(x => ({ role: x.role, content: x.content }))];
    let content = "", inp = 0, out = 0;
    try {
      const r = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: cm, messages: msgs, stream: false, options: { temperature: 0.3, num_predict: 8192 } }),
        signal: AbortSignal.timeout(120000),
      });
      if (!r.ok) throw new Error("Ollama " + r.status);
      const d = await r.json();
      content = d.message?.content || d.response || "";
      inp = d.prompt_eval_count || 0;
      out = d.eval_count || 0;
    } catch (e) { content = "**Error:** " + e.message; }
    const am = { id: "msg-" + Date.now(), role: "assistant", content, timestamp: Date.now(), model: cm, provider: "ollama", tokens: { input: inp, output: out } };
    cv.messages.push(am);
    cv.updatedAt = Date.now();
    return c.json(am);
  } catch (e) { return c.json({ error: e.message }, 500); }
});

// ── SSE streaming endpoint
app.get("/api/chat/conversations/:id/stream", async (c) => {
  const id = c.req.param("id");
  const content = c.req.query("content") || "";
  const cv = conversations.find(v => v.id === id);
  if (!cv) return c.json({ error: "Not found" }, 404);
  cv.messages.push({ id: "msg-" + Date.now(), role: "user", content, timestamp: Date.now() });
  const m = ollamaModels();
  const cm = bestChatModel(m);
  const msgs = [{ role: "system", content: "You are Tekton Agent. Be concise." }, ...cv.messages.map(x => ({ role: x.role, content: x.content }))];

  return new Response(
    new ReadableStream({
      async start(ctrl) {
        const enc = new TextEncoder();
        const send = (t, d) => ctrl.enqueue(enc.encode("data: " + JSON.stringify({ type: t, data: d }) + "\n\n"));
        try {
          const r = await fetch("http://localhost:11434/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: cm, messages: msgs, stream: true, options: { temperature: 0.3, num_predict: 8192 } }),
            signal: AbortSignal.timeout(120000),
          });
          if (!r.ok) { send("error", { error: "Ollama " + r.status }); ctrl.close(); return; }
          let full = "";
          const rd = r.body.getReader();
          const dec = new TextDecoder();
          while (true) {
            const { done, value } = await rd.read();
            if (done) break;
            for (const l of dec.decode(value, { stream: true }).split("\n")) {
              if (!l.trim()) continue;
              try {
                const d = JSON.parse(l);
                if (d.message?.content) {
                  full += d.message.content;
                  send("token", { text: d.message.content, fullText: full });
                }
              } catch {}
            }
          }
          const am = { id: "msg-" + Date.now(), role: "assistant", content: full, timestamp: Date.now(), model: cm, provider: "ollama" };
          cv.messages.push(am);
          cv.updatedAt = Date.now();
          send("done", { id: am.id, content: full, model: cm, provider: "ollama" });
        } catch (e) { send("error", { error: e.message }); }
        ctrl.close();
      },
    }),
    { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } }
  );
});

// ── Stubs for other pages
app.get("/api/sessions", (c) => c.json({ sessions: [], total: 0 }));
app.get("/api/skills", (c) => c.json({ skills: [], total: 0 }));
app.get("/api/routing/log", (c) => c.json({ entries: [] }));
app.get("/api/routing/rules", (c) => c.json({ rules: [] }));
app.get("/api/analytics/tokens", (c) => c.json({ entries: [], totalTokens: 0, totalCost: 0 }));
app.get("/api/analytics/compression", (c) => c.json({ entries: [], totalTokensSaved: 0, avgRatio: 0 }));
app.get("/api/analytics/cost", (c) => c.json({ entries: [], totalCost: 0 }));
app.get("/api/scp/traffic", (c) => c.json({ entries: [] }));
app.get("/api/config", (c) => c.json({ config: {} }));
app.get("/api/training/status", (c) => c.json({ running: false, jobs: [] }));
app.get("/api/memory", (c) => {
  let memory = "";
  try { const f = join(TEKTON_HOME, "MEMORY.md"); if (existsSync(f)) memory = readFileSync(f, "utf-8"); } catch {}
  return c.json({ memory, userModel: "", sessions: [] });
});
app.get("/api/gateway/status", (c) => c.json({ running: false, platforms: {}, totalMessagesIn: 0, totalMessagesOut: 0, uptimeMs: 0 }));
app.get("/api/voice/status", (c) => c.json({ enabled: false, stt: "local", tts: "edge" }));
app.get("/api/docling/health", (c) => c.json({ status: "unavailable" }));
app.get("/api/docling/recent", (c) => c.json({ recent: [] }));
app.get("/api/docling/stats", (c) => c.json({ totalDocuments: 0, totalPages: 0 }));
app.get("/api/forge/status", (c) => c.json({ error: "Forge not enabled" }));
app.get("/api/trading/data", (c) => c.json({ traders: [], positions: [], total_pnl: 0, trades_placed: 0 }));
app.get("/api/context/status", (c) => c.json({ enabled: false, mode: "raw" }));
app.get("/api/knowledge/status", (c) => c.json({ enabled: false }));

// ── Vendor fallbacks
const VENDOR_DIR = resolve(import.meta.dirname || ".", "vendor");
app.get("/vendor/react.min.js", (c) => {
  const f = join(VENDOR_DIR, "react.js");
  return existsSync(f) ? c.body(readFileSync(f), 200, { "Content-Type": "application/javascript", "Cache-Control": "public, max-age=86400" }) : c.redirect("https://unpkg.com/react@18/umd/react.production.min.js");
});
app.get("/vendor/react-dom.min.js", (c) => {
  const f = join(VENDOR_DIR, "react-dom.js");
  return existsSync(f) ? c.body(readFileSync(f), 200, { "Content-Type": "application/javascript", "Cache-Control": "public, max-age=86400" }) : c.redirect("https://unpkg.com/react-dom@18/umd/react-dom.production.min.js");
});
app.get("/vendor/tailwind.min.css", (c) => {
  const f = join(VENDOR_DIR, "tailwind.min.css");
  return existsSync(f) ? c.body(readFileSync(f), 200, { "Content-Type": "text/css", "Cache-Control": "public, max-age=86400" }) : c.redirect("https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css");
});

// ── SPA catch-all
app.get("/*", (c) => c.html(customHTML));

// ── Start server ──────────────────────────────────────────────────────

const server = serve({ fetch: app.fetch, hostname: host, port }, () => {
  console.log("\n  ⚡ Tekton Enhanced Dashboard: http://" + host + ":" + port);
  console.log("  📡 WebSocket: ws://" + host + ":7701");
  console.log("  🔧 API: /api/status /api/models /api/checkpoint/* /api/chat/*");
  console.log("  Press Ctrl+C to stop.\n");
});

// ── WebSocket server
const wss = new WebSocketServer({ port: 7701, host: "0.0.0.0" });
console.log("  [WS] WebSocket on ws://127.0.0.1:7701");

// Broadcast to all connected WS clients
function wsBroadcast(type, data) {
  const msg = JSON.stringify({ type, data, timestamp: Date.now() });
  let sent = 0;
  wss.clients.forEach((ws) => { if (ws.readyState === 1) { ws.send(msg); sent++; } });
  return sent;
}

// HTTP endpoint to broadcast events from gann_app/etc
app.post("/api/broadcast", async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const { type, data } = b || {};
  if (!type) return c.json({ error: "type required" });
  const sent = wsBroadcast(type, data || {});
  return c.json({ broadcast: true, type, sent, timestamp: Date.now() });
});

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "connected", data: { version: "0.1.0-enhanced" } }));
  const iv = setInterval(() => {
    if (ws.readyState === 1) {
      const m = ollamaModels();
      ws.send(JSON.stringify({
        type: "status_update",
        data: { uptimeMs: Date.now() - startTime, model: m.cloud[0] || "none", ports: livePorts(), conversations: conversations.length },
      }));
    }
  }, 5000);
  ws.on("close", () => clearInterval(iv));
  ws.on("message", (d) => { try { const msg = JSON.parse(d.toString()); if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong" })); } catch {} });
});

// ── Graceful shutdown
async function shutdown() {
  console.log("\n  Shutting down...");
  saveCp({
    id: "shutdown-" + Date.now(),
    label: "dashboard-shutdown",
    timestamp: new Date().toISOString(),
    task: "Enhanced dashboard shutdown",
    context: { cwd: process.cwd(), model: "enhanced", provider: "tekton", activeTools: [], featureState: { routing: true, learning: true, compression: true } },
    recentMessages: [],
    runningProcesses: [],
    listeningPorts: livePorts(),
    type: "auto",
  });
  wss.close();
  server.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
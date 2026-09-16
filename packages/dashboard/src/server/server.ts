/**
 * Dashboard Server — Hono HTTP server serving the React SPA + REST API.
 * Runs on 0.0.0.0:7700 by default (accessible from any network).
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { generateDashboardHTML } from "./spa.js";
import { DashboardAPI } from "./api.js";
import { ChatManager } from "./chat.js";
import { DashboardWS } from "./ws.js";
import { TerminalManager } from "./terminal.js";
import { FileManager } from "./files.js";
import { KanbanManager } from "./kanban.js";
import { AuthManager } from "./auth.js";
import { generateConductorHTML } from "./conductor.js";
import type { DashboardConfig } from "./types.js";
import { DEFAULT_DASHBOARD_CONFIG } from "./types.js";
import { SwarmMemoryManager, SwarmSkillManager, AgentPool } from "@tekton/core";
import path from "path";
import fs from "fs";

export class DashboardServer {
  readonly config: DashboardConfig;
  readonly app: Hono;

  /** Lazy-loaded swarm memory manager */
  get swarmMemory(): any {
    if (!this._swarmMemory) {
      try {
        this._swarmMemory = new SwarmMemoryManager();
      } catch {
        // Fallback stub when @tekton/core can't be loaded
        const mem = new Map();
        this._swarmMemory = {
          getMemory: (id: string) => { if (!mem.has(id)) mem.set(id, { workerId: id, completions: [], failures: [], patterns: [], skills: {}, notes: "", tokensUsed: 0, totalCompleted: 0, totalFailed: 0, avgCompletionMs: 0, lastActiveAt: Date.now(), createdAt: Date.now(), updatedAt: Date.now() }); return mem.get(id); },
          recordCompletion: (id: string) => this._swarmMemory.getMemory(id),
          recordFailure: (id: string) => this._swarmMemory.getMemory(id),
          learnPattern: () => this._swarmMemory.getMemory(""),
          getBestPatterns: () => [],
          setNotes: (id: string) => this._swarmMemory.getMemory(id),
          exerciseSkill: (id: string) => this._swarmMemory.getMemory(id),
          assignSkills: (id: string) => this._swarmMemory.getMemory(id),
          removeSkill: () => false,
          listWorkers: () => Array.from(mem.keys()),
          getSummary: () => [],
          deleteMemory: () => true,
        };
      }
    }
    return this._swarmMemory;
  }

  /** Lazy-loaded swarm skill manager */
  get swarmSkills(): any {
    if (!this._swarmSkills) {
      try {
        this._swarmSkills = new SwarmSkillManager(this.swarmMemory);
      } catch {
        this._swarmSkills = {
          listSkills: () => [],
          getSkill: () => undefined,
          getSkillsForRole: () => [],
          getWorkerSkills: (wId: string) => this.swarmMemory?.getMemory(wId)?.skills ?? {},
          assignSkillsToWorker: () => {},
          removeSkillFromWorker: () => false,
          recommendWorkers: () => [],
          registerSkill: () => {},
        };
      }
    }
    return this._swarmSkills;
  }
  readonly api: DashboardAPI;
  readonly chat: ChatManager;
  readonly terminal: TerminalManager;
  readonly files: FileManager;
  readonly kanban: KanbanManager;
  readonly auth: AuthManager;
  private _swarmMemory: any;
  private _swarmSkills: any;
  readonly ws: DashboardWS;
  private server: ReturnType<typeof serve> | null = null;

  constructor(config?: Partial<DashboardConfig>) {
    this.config = { ...DEFAULT_DASHBOARD_CONFIG, ...config };
    this.app = new Hono();
    this.api = new DashboardAPI(this.config);
    this.chat = new ChatManager();
    this.terminal = new TerminalManager();
    this.files = new FileManager();
    this.kanban = new KanbanManager();
    this.auth = new AuthManager({ enabled: this.config.authEnabled });
    // Swarm Memory/Skills are loaded lazily from @tekton/core to avoid ESM resolution issues
    this._swarmMemory = null;
    this._swarmSkills = null;
    this.ws = new DashboardWS({ port: this.config.wsPort ?? this.config.port + 1 });
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // CORS
    this.app.use("*", cors());

    // ── API Routes ───────────────────────────────────────────────────

    // Status
    this.app.get("/api/status", this.api.getStatus);

    // Discovery (returns server IPs for auto-connect)
    this.app.get("/api/discover", async (c) => {
      const os = await import("node:os");
      const interfaces = os.networkInterfaces();
      const ips: string[] = [];
      for (const [name, addrs] of Object.entries(interfaces)) {
        for (const addr of (addrs || [])) {
          if (addr.family === "IPv4" && !addr.internal) {
            ips.push(addr.address);
          }
        }
      }
      return c.json({
        port: this.config.port,
        ips,
        host: this.config.host,
        url: ips.length > 0 ? `http://${ips[0]}:${this.config.port}` : `http://localhost:${this.config.port}`,
      });
    });

    // Sessions
    this.app.get("/api/sessions", this.api.getSessions);
    this.app.delete("/api/sessions/:id", this.api.deleteSession);

    // Skills
    this.app.get("/api/skills", this.api.getSkills);

    // Routing
    this.app.get("/api/routing/log", this.api.getRoutingLog);
    this.app.get("/api/routing/rules", this.api.getRoutingRules);

    // Analytics
    this.app.get("/api/analytics/tokens", this.api.getAnalyticsTokens);
    this.app.get("/api/analytics/compression", this.api.getAnalyticsCompression);
    this.app.get("/api/analytics/cost", this.api.getAnalyticsCost);

    // SCP Traffic
    this.app.get("/api/scp/traffic", this.api.getSCPTraffic);

    // Config
    this.app.get("/api/config", this.api.getConfig);
    this.app.put("/api/config", this.api.updateConfig);

    // Training
    this.app.get("/api/training/status", this.api.getTrainingStatus);

    // Memory
    this.app.get("/api/memory", this.api.getMemory);
    this.app.post("/api/memory/search", this.api.searchMemory);

    // Gateway
    this.app.get("/api/gateway/status", this.api.getGatewayStatus);

    // Voice
    this.app.get("/api/voice/status", this.api.getVoiceStatus);

    // Models catalog
    this.app.get("/api/models", this.api.getModels);

    // ── Docling Document Intelligence ───────────────────────────────

    this.app.get("/api/docling/health", this.api.getDoclingHealth);
    this.app.get("/api/docling/recent", this.api.getDoclingRecent);
    this.app.get("/api/docling/stats", this.api.getDoclingStats);
    this.app.post("/api/docling/upload", this.api.uploadDocument);

    // ── Forge ─────────────────────────────────────────────────────────────

    this.app.get("/api/forge/status", this.api.getForgeStatus);
    this.app.get("/api/forge/projects", this.api.getForgeProjects);
    this.app.get("/api/forge/projects/:id", this.api.getForgeProject);
    this.app.post("/api/forge/projects", this.api.createForgeProject);
    this.app.post("/api/forge/projects/:id/approve", this.api.approveForgeProject);
    this.app.post("/api/forge/projects/:id/reject", this.api.rejectForgeProject);

    // ── Trading ──────────────────────────────────────────────────────────
    this.app.get("/api/trading/data", this.api.getTradingData);
    this.app.get("/api/trading/positions", this.api.getTradingPositions);

    // -- PI Agent --
    this.app.get("/api/pi/signals", this.api.getPISignals);
    this.app.get("/api/pi/engines", this.api.getPIEngines);
    this.app.get("/api/pi/quote/:symbol", this.api.getPIQuote);
    this.app.post("/api/pi/analyze", this.api.postPIAnalyze);

    // ── Agent Pool ────────────────────────────────────────────────
    this.app.get("/api/agents", this.api.getAgents);
    this.app.post("/api/agents", this.api.spawnAgent);
    this.app.post("/api/agents/kill-all", this.api.killAllAgents);
    this.app.post("/api/agents/delegate", this.api.delegateTasks);
    this.app.post("/api/agents/:id/kill", this.api.killAgent);

    // ── Swarm ──────────────────────────────────────────────────────────
    this.app.get("/api/swarm/roster", this.api.getSwarmRoster);
    this.app.get("/api/swarm/runtime", this.api.getSwarmRuntime);
    this.app.get("/api/swarm/health", this.api.getSwarmHealth);
    this.app.get("/api/swarm/missions", this.api.getSwarmMissions);
    this.app.get("/api/swarm/briefs", this.api.getSwarmBriefs);
    this.app.get("/api/swarm/checkpoints", this.api.getSwarmCheckpoint);
    this.app.post("/api/swarm/dispatch", this.api.dispatchSwarm);
    this.app.post("/api/swarm/checkpoint", this.api.receiveCheckpoint);
    this.app.post("/api/swarm/worker/:id/start", this.api.startSwarmWorker);
    this.app.post("/api/swarm/worker/:id/kill", this.api.killSwarmWorker);

    // ── Swarm Memory & Skills ──────────────────────────────────────

    // Worker memory
    this.app.get("/api/swarm/memory/:workerId", (c) => {
      const memory = this.swarmMemory.getMemory(c.req.param("workerId"));
      return c.json(memory);
    });

    // Record completion
    this.app.post("/api/swarm/memory/:workerId/completion", async (c) => {
      try {
        const body = await c.req.json();
        const mem = this.swarmMemory.recordCompletion(c.req.param("workerId"), body);
        return c.json(mem);
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
      }
    });

    // Record failure
    this.app.post("/api/swarm/memory/:workerId/failure", async (c) => {
      try {
        const body = await c.req.json();
        const mem = this.swarmMemory.recordFailure(c.req.param("workerId"), body);
        return c.json(mem);
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
      }
    });

    // Learn pattern
    this.app.post("/api/swarm/memory/:workerId/pattern", async (c) => {
      try {
        const body = await c.req.json();
        const mem = this.swarmMemory.learnPattern(c.req.param("workerId"), body.taskType, body.approach, body.success, body.tokensUsed);
        return c.json(mem);
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
      }
    });

    // Set notes
    this.app.post("/api/swarm/memory/:workerId/notes", async (c) => {
      try {
        const body = await c.req.json();
        const mem = this.swarmMemory.setNotes(c.req.param("workerId"), body.notes || "");
        return c.json(mem);
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
      }
    });

    // Get best patterns
    this.app.get("/api/swarm/memory/:workerId/patterns", (c) => {
      const taskType = c.req.query("taskType") || "";
      const limit = parseInt(c.req.query("limit") || "3");
      const patterns = this.swarmMemory.getBestPatterns(c.req.param("workerId"), taskType, limit);
      return c.json({ patterns });
    });

    // Memory summary
    this.app.get("/api/swarm/memory", (c) => {
      return c.json({ workers: this.swarmMemory.getSummary() });
    });

    // Delete worker memory
    this.app.delete("/api/swarm/memory/:workerId", (c) => {
      const deleted = this.swarmMemory.deleteMemory(c.req.param("workerId"));
      return c.json({ success: deleted });
    });

    // ── Swarm Skills ──────────────────────────────────────────────

    // List all skills
    this.app.get("/api/swarm/skills", (c) => {
      const category = c.req.query("category");
      const skills = this.swarmSkills.listSkills(category || undefined);
      return c.json({ skills });
    });

    // Get skills for a role
    this.app.get("/api/swarm/skills/role/:role", (c) => {
      const skills = this.swarmSkills.getSkillsForRole(c.req.param("role") as any);
      return c.json({ skills });
    });

    // Get worker skills
    this.app.get("/api/swarm/skills/worker/:workerId", (c) => {
      const skills = this.swarmSkills.getWorkerSkills(c.req.param("workerId"));
      return c.json({ skills });
    });

    // Assign skills to worker
    this.app.post("/api/swarm/skills/worker/:workerId/assign", async (c) => {
      try {
        const body = await c.req.json();
        this.swarmSkills.assignSkillsToWorker(c.req.param("workerId"), body.skills || []);
        return c.json({ success: true });
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
      }
    });

    // Remove skill from worker
    this.app.delete("/api/swarm/skills/worker/:workerId/:skillId", (c) => {
      const removed = this.swarmSkills.removeSkillFromWorker(c.req.param("workerId"), c.req.param("skillId"));
      return c.json({ success: removed });
    });

    // Recommend workers for task types
    this.app.post("/api/swarm/skills/recommend", async (c) => {
      try {
        const body = await c.req.json();
        const workers = this.api.swarmRoster.getWorkers();
        const recommendations = this.swarmSkills.recommendWorkers(body.taskTypes || [], workers, body.limit || 3);
        return c.json({ recommendations });
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
      }
    });

    // Register a new skill
    this.app.post("/api/swarm/skills/register", async (c) => {
      try {
        const body = await c.req.json();
        if (!body.id || !body.name) return c.json({ error: "id and name are required" }, 400);
        this.swarmSkills.registerSkill({
          id: body.id,
          name: body.name,
          description: body.description || "",
          roles: body.roles || [],
          categories: body.categories || [],
          prerequisites: body.prerequisites,
          builtIn: false,
        });
        return c.json({ success: true });
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
      }
    });

    // ── Context Engineer ──────────────────────────────────────────────

    this.app.get("/api/context/status", this.api.getContextStatus);
    this.app.get("/api/context/log", this.api.getContextLog);
    this.app.post("/api/context/pin", this.api.pinContextItem);

    // ── Knowledge Librarian ───────────────────────────────────────────

    this.app.get("/api/knowledge/status", this.api.getKnowledgeStatus);
    this.app.get("/api/knowledge/documents", this.api.getKnowledgeDocuments);
    this.app.post("/api/knowledge/search", this.api.searchKnowledge);
    this.app.post("/api/knowledge/ingest", this.api.ingestKnowledge);
    this.app.delete("/api/knowledge/documents/:id", this.api.deleteKnowledgeDocument);

    // ── Chat ────────────────────────────────────────────────────────────

    // Get chat config and health
    this.app.get("/api/chat/config", (c) => {
      const cfg = this.chat.getConfig();
      return c.json({
        model: cfg.model,
        provider: cfg.provider,
        baseUrl: cfg.baseUrl,
        systemPrompt: cfg.systemPrompt,
        maxTokens: cfg.maxTokens,
        temperature: cfg.temperature,
      });
    });

    // Update chat config
    this.app.put("/api/chat/config", async (c) => {
      try {
        const body = await c.req.json();
        const updated = this.chat.updateConfig(body);
        return c.json({
          model: updated.model,
          provider: updated.provider,
          baseUrl: updated.baseUrl,
          systemPrompt: updated.systemPrompt,
          maxTokens: updated.maxTokens,
          temperature: updated.temperature,
        });
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
      }
    });

    // Health check — is the LLM reachable?
    this.app.get("/api/chat/health", async (c) => {
      const result = await this.chat.healthCheck();
      return c.json(result);
    });

    // List conversations
    this.app.get("/api/chat/conversations", (c) => {
      const conversations = this.chat.listConversations();
      return c.json({ conversations });
    });

    // Create conversation
    this.app.post("/api/chat/conversations", async (c) => {
      try {
        const body = await c.req.json().catch(() => ({}));
        const conv = this.chat.createConversation(body.title);
        return c.json(conv, 201);
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
      }
    });

    // Get conversation
    this.app.get("/api/chat/conversations/:id", (c) => {
      const id = c.req.param("id");
      const conv = this.chat.getConversation(id);
      if (!conv) return c.json({ error: "Conversation not found" }, 404);
      return c.json(conv);
    });

    // Delete conversation
    this.app.delete("/api/chat/conversations/:id", (c) => {
      const id = c.req.param("id");
      const deleted = this.chat.deleteConversation(id);
      if (!deleted) return c.json({ error: "Conversation not found" }, 404);
      return c.json({ success: true });
    });

    // Send a message (the main chat endpoint)
    this.app.post("/api/chat/conversations/:id/messages", async (c) => {
      const id = c.req.param("id");
      try {
        const body = await c.req.json();
        if (!body.content) {
          return c.json({ error: "Message content is required" }, 400);
        }
        const response = await this.chat.sendMessage(id, body.content, {
          ...(body.model && { model: body.model }),
          ...(body.provider && { provider: body.provider }),
          ...(body.systemPrompt && { systemPrompt: body.systemPrompt }),
          ...(body.maxTokens && { maxTokens: body.maxTokens }),
          ...(body.temperature !== undefined && { temperature: body.temperature }),
        });
        return c.json(response);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return c.json({ error: message }, 500);
      }
    });

    // SSE Streaming endpoint for chat
    this.app.get("/api/chat/conversations/:id/stream", async (c) => {
      const id = c.req.param("id");
      const conv = this.chat.getConversation(id);
      if (!conv) return c.json({ error: "Conversation not found" }, 404);

      // Get query params: content, model, provider
      const url = new URL(c.req.url);
      const content = url.searchParams.get("content") ?? "";
      if (!content) return c.json({ error: "Message content is required" }, 400);

      const configOverrides: any = {};
      if (url.searchParams.get("model")) configOverrides.model = url.searchParams.get("model");
      if (url.searchParams.get("provider")) configOverrides.provider = url.searchParams.get("provider");

      // Set SSE headers
      c.header("Content-Type", "text/event-stream");
      c.header("Cache-Control", "no-cache");
      c.header("Connection", "keep-alive");
      c.header("X-Accel-Buffering", "no");

      const chatManager = this.chat;
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            for await (const event of chatManager.sendMessageStream(id, content, configOverrides)) {
              const data = JSON.stringify(event);
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          } catch (err: any) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", data: { error: err.message ?? String(err) } })}\n\n`));
          }
          controller.close();
        },
      });

      // @ts-ignore — Hono supports ReadableStream responses
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    });

    // ── Conductor ────────────────────────────────────────────
    this.app.get("/conductor", (c) => {
      const html = generateConductorHTML(this.config);
      return c.html(html);
    });

    // ── Terminal ────────────────────────────────────────────────

    // Check terminal availability
    this.app.get("/api/terminal/status", (c) => {
      return c.json(this.terminal.getStats());
    });

    // List active terminal sessions
    this.app.get("/api/terminal/sessions", (c) => {
      return c.json({ sessions: this.terminal.listSessions() });
    });

    // Create a new terminal session
    this.app.post("/api/terminal/sessions", async (c) => {
      const body = await c.req.json().catch(() => ({}));
      const result = this.terminal.createSession({
        shell: body.shell,
        cwd: body.cwd,
        cols: body.cols,
        rows: body.rows,
        env: body.env,
      });
      if ("error" in result) {
        return c.json({ error: result.error }, 400);
      }
      const session = result.session;

      // Wire up terminal output to broadcast via WebSocket
      this.terminal.onOutput(session.id, (data: string, sid: string) => {
        this.ws.broadcast({
          type: "terminal_output",
          timestamp: new Date().toISOString(),
          data: { sessionId: sid, output: data },
        });
      });
      this.terminal.onExit(session.id, (exitCode: number | null, sid: string) => {
        this.ws.broadcast({
          type: "terminal_exit",
          timestamp: new Date().toISOString(),
          data: { sessionId: sid, exitCode },
        });
      });

      return c.json({
        id: session.id,
        shell: session.shell,
        cwd: session.cwd,
        createdAt: session.createdAt,
      }, 201);
    });

    // Send input to a terminal session
    this.app.post("/api/terminal/sessions/:id/input", async (c) => {
      const id = c.req.param("id");
      const body = await c.req.json().catch(() => ({}));
      if (!body.data) return c.json({ error: "Input data is required" }, 400);
      const ok = this.terminal.write(id, body.data);
      if (!ok) return c.json({ error: "Session not found" }, 404);
      return c.json({ success: true });
    });

    // Resize a terminal session
    this.app.post("/api/terminal/sessions/:id/resize", async (c) => {
      const id = c.req.param("id");
      const body = await c.req.json().catch(() => ({}));
      const cols = Number(body.cols) || 80;
      const rows = Number(body.rows) || 24;
      const ok = this.terminal.resize(id, cols, rows);
      if (!ok) return c.json({ error: "Session not found" }, 404);
      return c.json({ success: true });
    });

    // Kill a terminal session
    this.app.delete("/api/terminal/sessions/:id", (c) => {
      const id = c.req.param("id");
      const ok = this.terminal.kill(id);
      if (!ok) return c.json({ error: "Session not found" }, 404);
      return c.json({ success: true });
    });

    // Kill all terminal sessions
    this.app.delete("/api/terminal/sessions", (c) => {
      const count = this.terminal.killAll();
      return c.json({ success: true, killed: count });
    });

    // ── Files ──────────────────────────────────────────────────

    // List directory
    this.app.get("/api/files/list", (c) => {
      try {
        const dirPath = c.req.query("path") || ".";
        const entries = this.files.listDirectory(dirPath);
        return c.json({ path: dirPath, entries });
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
      }
    });

    // Read file
    this.app.get("/api/files/read", (c) => {
      try {
        const filePath = c.req.query("path");
        if (!filePath) return c.json({ error: "path query parameter is required" }, 400);
        const content = this.files.readFile(filePath);
        return c.json(content);
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
      }
    });

    // Write file
    this.app.put("/api/files/write", async (c) => {
      try {
        const body = await c.req.json();
        if (!body.path) return c.json({ error: "path is required" }, 400);
        if (body.content === undefined) return c.json({ error: "content is required" }, 400);
        const result = this.files.writeFile(body.path, body.content, body.encoding || "utf-8");
        return c.json(result);
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
      }
    });

    // Delete file or directory
    this.app.delete("/api/files/delete", (c) => {
      try {
        const itemPath = c.req.query("path");
        if (!itemPath) return c.json({ error: "path query parameter is required" }, 400);
        const result = this.files.deletePath(itemPath);
        return c.json(result);
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
      }
    });

    // Create directory
    this.app.post("/api/files/mkdir", async (c) => {
      try {
        const body = await c.req.json();
        if (!body.path) return c.json({ error: "path is required" }, 400);
        const result = this.files.createDirectory(body.path);
        return c.json(result);
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
      }
    });

    // Rename / move
    this.app.post("/api/files/rename", async (c) => {
      try {
        const body = await c.req.json();
        if (!body.oldPath || !body.newPath) return c.json({ error: "oldPath and newPath are required" }, 400);
        const result = this.files.renamePath(body.oldPath, body.newPath);
        return c.json(result);
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
      }
    });

    // File stat
    this.app.get("/api/files/stat", (c) => {
      try {
        const itemPath = c.req.query("path");
        if (!itemPath) return c.json({ error: "path query parameter is required" }, 400);
        const stat = this.files.statPath(itemPath);
        return c.json(stat);
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
      }
    });

    // ── Kanban ────────────────────────────────────────────────

    // List boards
    this.app.get("/api/kanban/boards", (c) => {
      try {
        const boards = this.kanban.listBoards();
        return c.json({ boards });
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
      }
    });

    // Create a board
    this.app.post("/api/kanban/boards", async (c) => {
      try {
        const body = await c.req.json();
        if (!body.title) return c.json({ error: "title is required" }, 400);
        const board = this.kanban.createBoard(body.title, body.description);
        return c.json(board, 201);
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
      }
    });

    // Get a board
    this.app.get("/api/kanban/boards/:id", (c) => {
      try {
        const board = this.kanban.getBoard(c.req.param("id"));
        if (!board) return c.json({ error: "Board not found" }, 404);
        return c.json(board);
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
      }
    });

    // Delete a board
    this.app.delete("/api/kanban/boards/:id", (c) => {
      try {
        const deleted = this.kanban.deleteBoard(c.req.param("id"));
        return c.json({ success: deleted });
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
      }
    });

    // Add a card to a board
    this.app.post("/api/kanban/boards/:id/cards", async (c) => {
      try {
        const body = await c.req.json();
        if (!body.title) return c.json({ error: "title is required" }, 400);
        const card = this.kanban.addCard(c.req.param("id"), body);
        if (!card) return c.json({ error: "Board not found" }, 404);
        return c.json(card, 201);
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
      }
    });

    // Move a card to a different lane
    this.app.post("/api/kanban/boards/:id/cards/:cardId/move", async (c) => {
      try {
        const body = await c.req.json();
        if (!body.lane) return c.json({ error: "lane is required" }, 400);
        const card = this.kanban.moveCard(c.req.param("id"), c.req.param("cardId"), body.lane);
        if (!card) return c.json({ error: "Card or board not found" }, 404);
        return c.json(card);
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
      }
    });

    // Update a card
    this.app.patch("/api/kanban/boards/:id/cards/:cardId", async (c) => {
      try {
        const body = await c.req.json();
        const card = this.kanban.updateCard(c.req.param("id"), c.req.param("cardId"), body);
        if (!card) return c.json({ error: "Card or board not found" }, 404);
        return c.json(card);
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
      }
    });

    // Delete a card
    this.app.delete("/api/kanban/boards/:id/cards/:cardId", (c) => {
      try {
        const deleted = this.kanban.deleteCard(c.req.param("id"), c.req.param("cardId"));
        return c.json({ success: deleted });
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
      }
    });

    // Get cards by lane
    this.app.get("/api/kanban/boards/:id/lanes/:lane", (c) => {
      try {
        const cards = this.kanban.getCardsByLane(c.req.param("id"), c.req.param("lane") as any);
        return c.json({ cards });
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
      }
    });

    // ── Auth ─────────────────────────────────────────────────────

    // Get auth status
    this.app.get("/api/auth/status", (c) => {
      return c.json({
        enabled: this.auth.enabled,
        hasPassword: true,
      });
    });

    // Login
    this.app.post("/api/auth/login", async (c) => {
      try {
        const body = await c.req.json();
        if (!body.password) {
          return c.json({ error: "Password required" }, 400);
        }
        const result = this.auth.login(body.username || "admin", body.password);
        if (result.success) {
          // Set session cookie
          c.header("Set-Cookie", `tekton_session=${result.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
          return c.json({ token: result.token, csrfToken: result.csrfToken });
        }
        return c.json({ error: result.error }, 401);
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
      }
    });

    // Logout
    this.app.post("/api/auth/logout", (c) => {
      const authHeader = c.req.header("Authorization");
      const token = authHeader?.replace("Bearer ", "");
      if (token) this.auth.logout(token);
      c.header("Set-Cookie", "tekton_session=; Path=/; HttpOnly; Max-Age=0");
      return c.json({ success: true });
    });

    // Change password
    this.app.post("/api/auth/change-password", async (c) => {
      try {
        const body = await c.req.json();
        const result = this.auth.changePassword(body.currentPassword, body.newPassword);
        if (result.success) {
          return c.json({ success: true });
        }
        return c.json({ error: result.error }, 400);
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
      }
    });

    // Session info
    this.app.get("/api/auth/session", (c) => {
      const authHeader = c.req.header("Authorization");
      const token = authHeader?.replace("Bearer ", "");
      if (!token) return c.json({ authenticated: !this.auth.enabled });
      const session = this.auth.validateSession(token);
      if (!session) return c.json({ authenticated: false });
      return c.json({ authenticated: true, username: session.username, expiresAt: session.expiresAt, csrfToken: session.csrfToken });
    });


    // ── Rules ──────────────────────────────────────────────────────────
    const RULES_PATH = path.join(String.raw`D:\AI Drive`, `.pi`, `agent`, `extensions`, `enforce-rules`, `index.js`);

    this.app.get("/api/rules", (c) => {
      try {
        const content = fs.readFileSync(RULES_PATH, "utf-8");
        return c.json({ content, path: RULES_PATH });
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
      }
    });
    this.app.put("/api/rules", async (c) => {
      try {
        const body = await c.req.json();
        fs.writeFileSync(RULES_PATH, body.content, "utf-8");
        return c.json({ success: true, path: RULES_PATH });
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
      }
    });

    // ── PWA Assets ──────────────────────────────────────────────

    // Manifest
    this.app.get("/manifest.json", (c) => {
      return c.json({
        name: "Tekton Dashboard",
        short_name: "Tekton",
        description: "AI Agent Dashboard",
        start_url: "/",
        display: "standalone",
        background_color: "#0a0f1a",
        theme_color: "#0a0f1a",
        icons: [
          { src: "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%233b82f6"/><text x="50" y="68" font-size="50" font-weight="bold" fill="white" text-anchor="middle" font-family="sans-serif">T</text></svg>'), sizes: "192x192", type: "image/svg+xml" },
        ],
      });
    });

    // Service Worker
    this.app.get("/sw.js", (c) => {
      c.header("Content-Type", "application/javascript");
      c.header("Cache-Control", "no-cache");
      return c.body(`
const CACHE_NAME = 'tekton-v1';
const ASSETS = ['/'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Only cache same-origin, non-API requests
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return fetch(event.request).then((response) => {
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      }).catch(() => cache.match(event.request));
    })
  );
});
      `);
    });

    // ── SPA ───────────────────────────────────────────────────────────

    // Serve the dashboard HTML for all non-API routes
    this.app.get("/*", (c) => {
      const html = generateDashboardHTML(this.config);
      return c.html(html);
    });
  }

  /** Start the dashboard server */
  private beaconInterval: ReturnType<typeof setInterval> | null = null;

  async start(): Promise<void> {
    // Start WebSocket server for live updates
    await this.ws.start();

    // Start UDP beacon for auto-discovery
    this.startBeacon();

    return new Promise((resolve, reject) => {
      try {
        this.server = serve({
          fetch: this.app.fetch,
          hostname: this.config.host,
          port: this.config.port,
        }, () => {
          console.log(`⚡ Tekton Dashboard running at http://${this.config.host}:${this.config.port}`);
          console.log(`🔌 WebSocket server running at ws://${this.config.host}:${this.config.wsPort ?? this.config.port + 1}`);
          resolve();
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /** Broadcast UDP beacon for auto-discovery by mobile apps */
  private startBeacon(): void {
    try {
      const dgram = require("node:dgram");
      const socket = dgram.createSocket("udp4");
      socket.bind(() => {
        socket.setBroadcast(true);
        const port = this.config.port;
        const msg = Buffer.from(JSON.stringify({ tekton: true, port }));
        this.beaconInterval = setInterval(() => {
          try {
            socket.send(msg, 0, msg.length, 7702, "255.255.255.255");
          } catch {}
        }, 2000);
      });
      socket.on("error", () => { /* beacon is optional */ });
    } catch {
      /* dgram not available or beacon failed - non-fatal */
    }
  }

  /** Stop the dashboard server */
  async stop(): Promise<void> {
    await this.ws.stop();
    if (this.beaconInterval) {
      clearInterval(this.beaconInterval);
      this.beaconInterval = null;
    }
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  /** Get the URL */
  getUrl(): string {
    return `http://${this.config.host}:${this.config.port}`;
  }
}
/**
 * Dashboard API Routes — Hono handlers for all REST endpoints.
 */
import type { Context } from "hono";
import path from "node:path";
import type {
  StatusResponse,
  SessionListResponse,
  SkillListResponse,
  RoutingRulesResponse,
  ConfigResponse,
  DashboardConfig,
} from "./types.js";
import { DEFAULT_CONFIG, SwarmRosterManager, SwarmDispatcher, SwarmCheckpointValidator, getSwarmRoster, getSwarmDispatcher, EXPANDED_PROVIDERS } from "@tekton/core";

type ContextHandler = (c: Context) => any;

export class DashboardAPI {
  private startTime = Date.now();
  readonly config: DashboardConfig;

  // Subsystem references (set during initialization)
  private _forgeEnabled: boolean = false;
  private _forgeProjects: Array<{ id: string; title: string; status: string; domains: string[] }> = [];
  private _forgeRuntime: any = null;
  private _contextEngineer: any = null;
  private _knowledgeLibrarian: any = null;
  private _knowledgeIngestor: any = null;
  private _knowledgeIndexStore: any = null;
  private telemetryDb: any = null;
  private memoryManager: any = null;
  private skillManager: any = null;
  // Swarm subsystems
  private _swarmRoster: SwarmRosterManager | null = null;
  private _swarmDispatcher: SwarmDispatcher | null = null;
  private _checkpointValidator: SwarmCheckpointValidator | null = null;
  private agentPool: any = null;
  private hermesBridge: any = null;
  private gatewayRunner: any = null;

  get swarmRoster(): SwarmRosterManager {
    if (!this._swarmRoster) this._swarmRoster = getSwarmRoster();
    return this._swarmRoster;
  }

  get swarmDispatcher(): SwarmDispatcher {
    if (!this._swarmDispatcher) this._swarmDispatcher = getSwarmDispatcher();
    return this._swarmDispatcher;
  }

  get checkpointValidator(): SwarmCheckpointValidator {
    if (!this._checkpointValidator) this._checkpointValidator = new SwarmCheckpointValidator(this.swarmRoster);
    return this._checkpointValidator;
  }
  private voiceManager: any = null;

  constructor(config?: Partial<DashboardConfig>) {
    this.config = {
      port: config?.port ?? (DEFAULT_CONFIG as any).dashboard?.port ?? 7700,
      host: config?.host ?? "127.0.0.1",
      autoStart: config?.autoStart ?? (DEFAULT_CONFIG as any).dashboard?.autoStart ?? false,
      refreshIntervalMs: config?.refreshIntervalMs ?? 5000,
      theme: config?.theme ?? "dark",
    };
  }

  /** Inject subsystem references */
  setTelemetryDb(db: any): void { this.telemetryDb = db; }
  setMemoryManager(mm: any): void { this.memoryManager = mm; }
  setSkillManager(sm: any): void { this.skillManager = sm; }
  setAgentPool(pool: any): void { this.agentPool = pool; }
  setHermesBridge(bridge: any): void { this.hermesBridge = bridge; }
  setGatewayRunner(runner: any): void { this.gatewayRunner = runner; }
  setVoiceManager(vm: any): void { this.voiceManager = vm; }
  setForgeRuntime(runtime: any): void { this._forgeRuntime = runtime; }
  setForgeEnabled(enabled: boolean): void { this._forgeEnabled = enabled; }
  setForgeProjects(projects: Array<{ id: string; title: string; status: string; domains: string[] }>): void { this._forgeProjects = projects; }
  setContextEngineer(ce: any): void { this._contextEngineer = ce; }
  setKnowledgeLibrarian(kl: any): void { this._knowledgeLibrarian = kl; }
  setKnowledgeIngestor(ki: any): void { this._knowledgeIngestor = ki; }
  setKnowledgeIndexStore(store: any): void { this._knowledgeIndexStore = store; }

  // ── Status ────────────────────────────────────────────────────────

  getStatus = (c: Context): Response => {
    const response: StatusResponse = {
      version: "0.1.0",
      uptimeMs: Date.now() - this.startTime,
      model: { current: "unknown", provider: "unknown" },
      tokens: { total: 0, input: 0, output: 0, budget: null },
      compression: { ratio: 0, tokensSaved: 0 },
      skills: { total: 0, topUsed: [] },
      agents: { active: 0, max: 4 },
      learning: { enabled: true, totalEvaluations: 0, avgConfidence: 0 },
      gateway: {},
      voice: { enabled: false, sttProvider: "local", ttsProvider: "edge" },
    };

    if (this.telemetryDb) {
      try {
        const totalRow = this.telemetryDb.prepare("SELECT SUM(input_tokens) as inp, SUM(output_tokens) as out FROM events").get() as any;
        response.tokens.input = totalRow?.inp ?? 0;
        response.tokens.output = totalRow?.out ?? 0;
        response.tokens.total = response.tokens.input + response.tokens.output;

        const compRow = this.telemetryDb.prepare("SELECT AVG(ratio) as avgRatio, SUM(tokens_saved) as saved FROM compression_events").get() as any;
        response.compression.ratio = compRow?.avgRatio ?? 0;
        response.compression.tokensSaved = compRow?.saved ?? 0;
      } catch {}
    }

    if (this.agentPool) {
      try {
        const status = this.agentPool.getStatus();
        response.agents.active = status.activeAgents;
        response.agents.max = status.maxAgents;
      } catch {}
    }

    if (this.skillManager) {
      try {
        const skills = this.skillManager.listSkills();
        response.skills.total = skills.length;
        response.skills.topUsed = skills.slice(0, 5).map((s: any) => s.name);
      } catch {}
    }

    if (this.gatewayRunner) {
      try {
        const gStatus = this.gatewayRunner.getStatus();
        const platforms: Record<string, { connected: boolean; messagesIn: number; messagesOut: number }> = {};
        for (const [name, ps] of Object.entries(gStatus.platforms)) {
          const p = ps as any;
          platforms[name] = { connected: p.connected ?? false, messagesIn: p.messagesIn ?? 0, messagesOut: p.messagesOut ?? 0 };
        }
        (response as any).gateway = platforms;
      } catch {}
    }

    if (this.voiceManager) {
      try {
        response.voice.enabled = this.voiceManager.isEnabled();
        response.voice.sttProvider = this.voiceManager.stt.config.provider;
        response.voice.ttsProvider = this.voiceManager.tts.config.provider;
      } catch {}
    }

    return c.json(response);
  };

  // ── Sessions ──────────────────────────────────────────────────────

  getSessions = (c: Context): Response => {
    const sessions: SessionListResponse["sessions"] = [];

    if (this.agentPool) {
      try {
        const agents = this.agentPool.getAgents();
        for (const agent of agents) {
          sessions.push({
            id: agent.id,
            name: agent.name,
            state: agent.state ?? agent.status ?? "unknown",
            tokensUsed: agent.tokensUsed ?? 0,
            tasksCompleted: agent.tasksCompleted ?? 0,
            createdAt: agent.createdAt ?? Date.now(),
            lastActivityAt: agent.lastActivityAt ?? Date.now(),
          });
        }
      } catch {}
    }

    if (this.gatewayRunner) {
      try {
        const gwSessions = this.gatewayRunner.sessions.listSessions();
        for (const s of gwSessions) {
          sessions.push({
            id: s.sessionKey,
            name: s.userName || s.userId,
            state: "gateway",
            tokensUsed: 0,
            tasksCompleted: s.messageCount,
            createdAt: s.createdAt,
            lastActivityAt: s.lastActivityAt,
          });
        }
      } catch {}
    }

    return c.json({ sessions, total: sessions.length });
  };

  deleteSession = (c: Context): Response => {
    const id = c.req.param("id");
    return c.json({ success: true, id });
  };

  // ── Skills ────────────────────────────────────────────────────────

  getSkills = (c: Context): Response => {
    const skills: SkillListResponse["skills"] = [];

    if (this.skillManager) {
      try {
        const allSkills = this.skillManager.listSkills();
        for (const s of allSkills) {
          skills.push({
            name: s.name,
            description: s.description ?? "",
            confidence: s.confidence ?? 0.5,
            usageCount: s.usageCount ?? 0,
            category: s.category ?? "general",
            enabled: s.enabled !== false,
          });
        }
      } catch {}
    }

    return c.json({ skills, total: skills.length });
  };

  // ── Routing ────────────────────────────────────────────────────────

  getRoutingLog = (c: Context): Response => {
    const entries: any[] = [];
    if (this.telemetryDb) {
      try {
        const rows = this.telemetryDb.prepare(
          "SELECT * FROM events ORDER BY timestamp DESC LIMIT 100"
        ).all() as any[];
        for (const row of rows) {
          entries.push({
            timestamp: row.timestamp,
            promptSnippet: (row.routing_decision ?? "").slice(0, 100),
            complexityScore: 0.5,
            modelChosen: row.model,
            provider: row.provider,
            outcome: row.type === "error" ? "error" : "success",
            latencyMs: row.latency_ms ?? 0,
            costEstimate: row.cost_estimate ?? 0,
          });
        }
      } catch {}
    }
    return c.json({ entries });
  };

  getRoutingRules = (c: Context): Response => {
    const rules: RoutingRulesResponse["rules"] = [];
    try {
      const { DEFAULT_ROUTING_RULES } = require("@tekton/core");
      for (const rule of DEFAULT_ROUTING_RULES) {
        rules.push({
          id: rule.id,
          name: rule.name,
          priority: rule.priority,
          enabled: rule.enabled,
          condition: JSON.stringify(rule.condition),
          action: JSON.stringify(rule.action),
        });
      }
    } catch {}
    return c.json({ rules });
  };

  // ── Analytics ──────────────────────────────────────────────────────

  getAnalyticsTokens = (c: Context): Response => {
    const entries: any[] = [];
    let totalTokens = 0;
    let totalCost = 0;

    if (this.telemetryDb) {
      try {
        const rows = this.telemetryDb.prepare(
          "SELECT timestamp, model, provider, input_tokens, output_tokens, cost_estimate FROM events ORDER BY timestamp DESC LIMIT 500"
        ).all() as any[];
        for (const row of rows) {
          entries.push({
            timestamp: row.timestamp,
            model: row.model,
            inputTokens: row.input_tokens,
            outputTokens: row.output_tokens,
            cost: row.cost_estimate ?? 0,
          });
          totalTokens += row.input_tokens + row.output_tokens;
          totalCost += row.cost_estimate ?? 0;
        }
      } catch {}
    }

    return c.json({ entries, totalTokens, totalCost });
  };

  getAnalyticsCompression = (c: Context): Response => {
    const entries: any[] = [];
    let totalTokensSaved = 0;
    let avgRatio = 0;

    if (this.telemetryDb) {
      try {
        const rows = this.telemetryDb.prepare(
          "SELECT * FROM compression_events ORDER BY timestamp DESC LIMIT 500"
        ).all() as any[];
        for (const row of rows) {
          entries.push({
            timestamp: row.timestamp,
            tier: row.tier,
            originalLength: row.original_length,
            compressedLength: row.compressed_length,
            ratio: row.ratio,
            tokensSaved: row.tokens_saved,
          });
          totalTokensSaved += row.tokens_saved;
        }
        const avgRow = this.telemetryDb.prepare("SELECT AVG(ratio) as avgRatio FROM compression_events").get() as any;
        avgRatio = avgRow?.avgRatio ?? 0;
      } catch {}
    }

    return c.json({ entries, totalTokensSaved, avgRatio });
  };

  getAnalyticsCost = (c: Context): Response => {
    const entries: any[] = [];
    let totalCost = 0;
    let savings = 0;

    if (this.telemetryDb) {
      try {
        const rows = this.telemetryDb.prepare(
          "SELECT date(timestamp) as date, model, provider, SUM(input_tokens + output_tokens) as tokens, COUNT(*) as requests, SUM(cost_estimate) as cost FROM events GROUP BY date, model ORDER BY date DESC LIMIT 100"
        ).all() as any[];
        for (const row of rows) {
          entries.push({
            date: row.date,
            provider: row.provider,
            model: row.model,
            requests: row.requests,
            tokens: row.tokens,
            cost: row.cost,
          });
          totalCost += row.cost;
        }
      } catch {}
    }

    return c.json({ entries, totalCost, savings });
  };

  // ── SCP Traffic ────────────────────────────────────────────────────

  getSCPTraffic = (c: Context): Response => {
    const entries: any[] = [];

    if (this.agentPool) {
      try {
        const agents = this.agentPool.getAgents();
        for (const agent of agents) {
          entries.push({
            id: agent.id,
            timestamp: new Date(agent.createdAt ?? Date.now()).toISOString(),
            from: "orchestrator",
            to: agent.name,
            taskType: agent.currentTask?.type ?? "idle",
            payloadSize: 0,
            status: agent.state ?? "unknown",
          });
        }
      } catch {}
    }

    return c.json({ entries });
  };

  // ── Config ──────────────────────────────────────────────────────────

  getConfig = (c: Context): Response => {
    return c.json({ config: DEFAULT_CONFIG, schema: {} });
  };

  updateConfig = (c: Context): Response => {
    return c.json({ success: true });
  };

  // ── Training ────────────────────────────────────────────────────────

  getTrainingStatus = (c: Context): Response => {
    return c.json({ running: false, jobs: [] });
  };

  // ── Memory ──────────────────────────────────────────────────────────

  getMemory = (c: Context): Response => {
    const response: any = { memory: "", userModel: "", sessions: [] };

    if (this.memoryManager) {
      try {
        response.memory = this.memoryManager.getMemory();
        const userModel = this.memoryManager.getUserModel();
        response.userModel = userModel ?? "";
      } catch {}
    }

    return c.json(response);
  };

  searchMemory = async (c: Context): Promise<Response> => {
    const body = await c.req.json();
    const query = body.query ?? "";
    const results: any[] = [];

    if (this.memoryManager && query) {
      try {
        const searcher = this.memoryManager.getSessionSearcher?.();
        if (searcher) {
          const searchResults = searcher.search(query);
          for (const r of searchResults) {
            results.push({ id: r.id, summary: r.summary, timestamp: r.timestamp });
          }
        }
      } catch {}
    }

    return c.json({ results });
  };

  // ── Gateway ──────────────────────────────────────────────────────────

  getGatewayStatus = (c: Context): Response => {
    if (this.gatewayRunner) {
      try {
        return c.json(this.gatewayRunner.getStatus());
      } catch {
        return c.json({ running: false, platforms: {}, totalMessagesIn: 0, totalMessagesOut: 0, uptimeMs: 0 });
      }
    }
    return c.json({ running: false, platforms: {}, totalMessagesIn: 0, totalMessagesOut: 0, uptimeMs: 0 });
  };

  // ── Voice ────────────────────────────────────────────────────────────

  getVoiceStatus = (c: Context): Response => {
    if (this.voiceManager) {
      try {
        return c.json(this.voiceManager.getConfigJson());
      } catch {
        return c.json({ enabled: false, stt: "local", tts: "edge" });
      }
    }
    return c.json({ enabled: false, stt: "local", tts: "edge" });
  };

  // ── Models Catalog ─────────────────────────────────────────────────

  getModels = (c: Context): Response => {
    const providers: any[] = [];
    for (const [id, p] of Object.entries(EXPANDED_PROVIDERS)) {
      providers.push({
        id: p.id,
        name: p.name,
        local: (p as any).local ?? false,
        apiMode: (p as any).apiMode ?? "chat_completions",
        models: p.models.map(m => ({
          id: m.id,
          name: m.name,
          type: m.type,
          costTier: m.costTier,
          contextWindow: m.contextWindow,
          maxOutputTokens: m.maxOutputTokens,
          latencyRange: m.latencyRange,
        })),
      });
    }
    return c.json({ providers, totalModels: providers.reduce((sum, p) => sum + p.models.length, 0) });
  };

  // ── Docling Document Intelligence ──────────────────────────────────────────

  private doclingRecent: Array<{ source: string; status: string; pages: number; format: string; timestamp: number }> = [];
  private doclingStats: { totalParsed: number; totalPages: number; formatBreakdown: Record<string, number>; cacheSizeMb: number } = {
    totalParsed: 0, totalPages: 0, formatBreakdown: {}, cacheSizeMb: 0,
  };

  getDoclingRecent = (c: Context): Response => {
    return c.json({ documents: this.doclingRecent.slice(-50), total: this.doclingRecent.length });
  };

  getDoclingStats = (c: Context): Response => {
    return c.json(this.doclingStats);
  };

  getDoclingHealth = async (c: Context): Promise<Response> => {
    try {
      const resp = await fetch("http://127.0.0.1:7701/health", { signal: AbortSignal.timeout(3000) });
      if (resp.ok) {
        const data = await resp.json();
        return c.json(data);
      }
      return c.json({ status: "unavailable", service: "tekton-docling", version: "N/A", capabilities: {} });
    } catch {
      return c.json({ status: "unavailable", service: "tekton-docling", version: "N/A", capabilities: {} });
    }
  };

  uploadDocument = async (c: Context): Promise<Response> => {
    try {
      const formData = await c.req.formData();
      const file = formData.get("file") as File | null;
      const outputFormat = formData.get("output_format") as string || "markdown";

      if (!file) {
        return c.json({ error: "No file provided" }, 400);
      }

      // Forward to Docling sidecar
      const sidecarFormData = new FormData();
      sidecarFormData.append("file", file, file.name);
      sidecarFormData.append("output_format", outputFormat);

      const resp = await fetch("http://127.0.0.1:7701/parse", {
        method: "POST",
        body: sidecarFormData,
        signal: AbortSignal.timeout(120000),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return c.json({ error: `Docling parse error: ${errText}` }, 500);
      }

      const result = await resp.json() as { source: string; format: string; content: string; success: boolean };

      // Track in recent documents
      this.doclingRecent.push({
        source: file.name,
        status: result.success ? "success" : "error",
        pages: (result.content?.split("\n").length ?? 0) / 40, // rough estimate
        format: path.extname(file.name) || "unknown",
        timestamp: Date.now(),
      });

      // Update stats
      this.doclingStats.totalParsed++;
      const ext = path.extname(file.name) || "unknown";
      this.doclingStats.formatBreakdown[ext] = (this.doclingStats.formatBreakdown[ext] || 0) + 1;

      return c.json(result);
    } catch (err) {
      return c.json({ error: `Upload/parse error: ${err instanceof Error ? err.message : String(err)}` }, 500);
    }
  };

  // ── Forge ───────────────────────────────────────────────────────────────

  getForgeStatus = (c: Context): Response => {
    if (!this._forgeEnabled) {
      return c.json({ error: "Forge is not enabled. Run /tekton:forge enable to activate." }, 403);
    }

    if (this._forgeRuntime) {
      try {
        const projects = this._forgeRuntime.listProjects();
        return c.json({
          enabled: true,
          projectCount: projects.length,
          projects: projects.map((p: any) => ({
            id: p.id,
            title: p.title ?? "",
            status: p.phase,
            domains: [],
          })),
        });
      } catch {
        // Fall through to static data
      }
    }

    return c.json({
      enabled: true,
      projectCount: this._forgeProjects.length,
      projects: this._forgeProjects,
    });
  };

  getForgeProjects = (c: Context): Response => {
    if (!this._forgeEnabled) {
      return c.json({ error: "Forge is not enabled." }, 403);
    }

    if (this._forgeRuntime) {
      try {
        const projects = this._forgeRuntime.listProjects();
        return c.json({ projects: projects.map((p: any) => ({
          id: p.id,
          title: p.title,
          status: p.phase,
          domains: [],
          error: p.error,
        })) });
      } catch {
        // Fall through
      }
    }

    return c.json({ projects: this._forgeProjects });
  };

  getForgeProject = (c: Context): Response => {
    if (!this._forgeEnabled) {
      return c.json({ error: "Forge is not enabled." }, 403);
    }
    const id = c.req.param("id");

    if (this._forgeRuntime) {
      try {
        const status = this._forgeRuntime.getProjectStatus(id);
        if (status) {
          return c.json(status);
        }
      } catch {
        // Fall through
      }
    }

    const project = this._forgeProjects.find(p => p.id === id);
    if (!project) {
      return c.json({ error: `Project not found: ${id}` }, 404);
    }
    return c.json(project);
  };

  createForgeProject = async (c: Context): Promise<Response> => {
    if (!this._forgeEnabled) {
      return c.json({ error: "Forge is not enabled." }, 403);
    }

    try {
      const body = await c.req.json();
      const brief = body.brief ?? body.idea ?? "";

      if (this._forgeRuntime && brief) {
        const projectId = await this._forgeRuntime.newProject(brief);
        const status = this._forgeRuntime.getProjectStatus(projectId);
        return c.json({ id: projectId, phase: status?.currentPhase ?? "ideation", status }, 201);
      }
    } catch (e) {
      return c.json({ error: `Failed to create project: ${(e as Error).message}` }, 500);
    }

    return c.json({ error: "Brief description required" }, 400);
  };

  approveForgeProject = (c: Context): Response => {
    if (!this._forgeEnabled) {
      return c.json({ error: "Forge is not enabled." }, 403);
    }
    const id = c.req.param("id");
    return c.json({ message: `Project ${id} approved (manual director override).`, id });
  };

  rejectForgeProject = (c: Context): Response => {
    if (!this._forgeEnabled) {
      return c.json({ error: "Forge is not enabled." }, 403);
    }
    const id = c.req.param("id");
    return c.json({ message: `Project ${id} rejected.`, id });
  };

  // ── Context Engineer ──────────────────────────────────────────────

  getContextStatus = (c: Context): Response => {
    const ce = this._contextEngineer;
    if (!ce) {
      return c.json({ enabled: false, mode: "raw", message: "No Context Engineer active" });
    }
    const stats = ce.getStats();
    return c.json({
      enabled: true,
      mode: "context-engineer",
      stats,
    });
  };

  getContextLog = (c: Context): Response => {
    const ce = this._contextEngineer;
    if (!ce) {
      return c.json({ log: "", message: "No Context Engineer active" });
    }
    return c.json({ log: ce.getPrecisionLog() });
  };

  pinContextItem = async (c: Context): Promise<Response> => {
    const ce = this._contextEngineer;
    if (!ce) {
      return c.json({ error: "No Context Engineer active" }, 400);
    }
    try {
      const body = await c.req.json();
      const { category, value, context } = body;
      if (!value) {
        return c.json({ error: "'value' is required" }, 400);
      }
      ce.pinItem({
        category: category ?? "pinned",
        value,
        context: context ?? "Manually pinned via API",
      });
      return c.json({ message: "Item pinned", value });
    } catch (e) {
      return c.json({ error: (e as Error).message }, 500);
    }
  };

  // ── Knowledge Librarian ────────────────────────────────────────────

  getKnowledgeStatus = (c: Context): Response => {
    const store = this._knowledgeIndexStore;
    if (!store) {
      return c.json({ enabled: false, message: "Knowledge library not initialized" });
    }
    return c.json({
      enabled: true,
      documents: 0,
      topics: [],
      totalTokens: 0,
    });
  };

  getKnowledgeDocuments = (c: Context): Response => {
    const store = this._knowledgeIndexStore;
    if (!store) {
      return c.json({ documents: [], message: "Knowledge library not initialized" });
    }
    return c.json({ documents: [] });
  };

  searchKnowledge = async (c: Context): Promise<Response> => {
    const librarian = this._knowledgeLibrarian;
    if (!librarian) {
      return c.json({ results: [], message: "Knowledge librarian not initialized" });
    }
    try {
      const body = await c.req.json();
      const results = await librarian.search(body.query ?? "", body.maxResults ?? 5);
      return c.json({ results });
    } catch (e) {
      return c.json({ error: (e as Error).message }, 500);
    }
  };

  ingestKnowledge = async (c: Context): Promise<Response> => {
    const ingestor = this._knowledgeIngestor;
    if (!ingestor) {
      return c.json({ error: "Knowledge ingestor not initialized" }, 400);
    }
    try {
      const body = await c.req.json();
      const { path } = body;
      if (!path) {
        return c.json({ error: "'path' is required" }, 400);
      }
      const doc = await ingestor.ingestFile(path);
      return c.json({ document: doc }, 201);
    } catch (e) {
      return c.json({ error: (e as Error).message }, 500);
    }
  };

  deleteKnowledgeDocument = (c: Context): Response => {
    const store = this._knowledgeIndexStore;
    if (!store) {
      return c.json({ error: "Knowledge library not initialized" }, 400);
    }
    const id = c.req.param("id");
    return c.json({ message: `Document ${id} removed (stub)` });
  };

  // ── Trading API ─────────────────────────────────────────────────
  // Proxies requests to the trading hub running on :8888
  private tradingHubUrl = process.env.TRADING_HUB_URL || "http://localhost:8888/api/data";

  getTradingData = async (c: Context): Promise<Response> => {
    try {
      const resp = await fetch(this.tradingHubUrl);
      if (!resp.ok) throw new Error(`Hub returned ${resp.status}`);
      const data = await resp.json() as any;
      return c.json(data);
    } catch (err: any) {
      return c.json({
        traders: [], positions: [], total_pnl: 0, trades_placed: 0,
        closed: [], remaining_seconds: 0, progress: 0, log: [],
        error: err.message
      });
    }
  };

  getTradingPositions = async (c: Context): Promise<Response> => {
    try {
      const resp = await fetch(this.tradingHubUrl);
      if (!resp.ok) throw new Error(`Hub returned ${resp.status}`);
      const data = await resp.json() as any;
      return c.json(data.positions || []);
    } catch (err: any) {
      return c.json([]);
    }
  };

  // ── Agent Pool API ──────────────────────────────────────────────

  getAgents = (c: Context): Response => {
    if (!this.agentPool) {
      return c.json({ agents: [], maxAgents: 0, activeAgents: 0 });
    }
    const status = this.agentPool.getStatus();
    const agents = this.agentPool.getAgents();
    return c.json({
      agents: agents.map((a: any) => ({
        id: a.id ?? a.agentId,
        status: a.status,
        task: a.currentTask?.description ?? a.task ?? null,
        skillHint: a.skillHint ?? a.skill_hint ?? null,
        createdAt: a.createdAt ?? a.spawnedAt,
        model: a.model ?? null,
      })),
      maxAgents: status.maxAgents ?? 4,
      activeAgents: status.activeAgents ?? agents.length,
    });
  };

  spawnAgent = async (c: Context): Promise<Response> => {
    if (!this.agentPool) {
      return c.json({ error: "Agent pool not initialized" }, 400);
    }
    try {
      const body = await c.req.json();
      const agentId = await this.agentPool.spawn(body);
      return c.json({ agentId, status: "spawning" });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  };

  killAgent = async (c: Context): Promise<Response> => {
    if (!this.agentPool) {
      return c.json({ error: "Agent pool not initialized" }, 400);
    }
    const id = c.req.param("id");
    try {
      await this.agentPool.kill(id, "Killed via dashboard");
      return c.json({ success: true, agentId: id });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  };

  killAllAgents = async (c: Context): Promise<Response> => {
    if (!this.agentPool) {
      return c.json({ error: "Agent pool not initialized" }, 400);
    }
    try {
      await this.agentPool.killAll("Killed all via dashboard");
      return c.json({ success: true });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  };

  delegateTasks = async (c: Context): Promise<Response> => {
    if (!this.agentPool) {
      return c.json({ error: "Agent pool not initialized" }, 400);
    }
    try {
      const body = await c.req.json();
      const { tasks, mode, context } = body;
      if (!tasks || !Array.isArray(tasks)) {
        return c.json({ error: "tasks must be an array" }, 400);
      }
      const results = await this.agentPool.submitBatch(tasks, { mode, context });
      return c.json({ results });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  };

  // ── Swarm API ─────────────────────────────────────────────────────

  /** GET /api/swarm/roster — Worker roster configuration */
  getSwarmRoster: ContextHandler = async (c) => {
    const roster = this.swarmRoster;
    return c.json({
      workers: roster.getWorkers(),
      runtimes: roster.getRuntimes(),
    });
  };

  /** GET /api/swarm/runtime — Worker runtime state */
  getSwarmRuntime: ContextHandler = async (c) => {
    return c.json(this.swarmRoster.getRuntimes());
  };

  /** GET /api/swarm/health — Swarm health summary */
  getSwarmHealth: ContextHandler = async (c) => {
    return c.json(this.swarmRoster.getHealth());
  };

  /** GET /api/swarm/missions — All missions */
  getSwarmMissions: ContextHandler = async (c) => {
    return c.json(this.swarmDispatcher.getMissions());
  };

  /** POST /api/swarm/dispatch — Dispatch work to swarm */
  dispatchSwarm: ContextHandler = async (c) => {
    try {
      const body = await c.req.json();
      const result = this.swarmDispatcher.dispatch({
        intent: body.intent,
        workerId: body.workerId,
        role: body.role,
        priority: body.priority,
        scope: body.scope,
        context: body.context,
      });
      return c.json(result);
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  };

  /** POST /api/swarm/checkpoint — Receive checkpoint from worker */
  receiveCheckpoint: ContextHandler = async (c) => {
    try {
      const body = await c.req.json();
      const checkpoint: import("@tekton/core").SwarmCheckpoint = {
        workerId: body.workerId,
        briefId: body.briefId,
        state: body.state,
        filesChanged: body.filesChanged ?? [],
        commandsRun: body.commandsRun ?? [],
        proof: body.proof ?? "",
        blocker: body.blocker ?? null,
        nextAction: body.nextAction ?? null,
        timestamp: Date.now(),
      };
      // Validate checkpoint
      const validation = this.checkpointValidator.validate(checkpoint);
      if (!validation.valid) {
        return c.json({ error: "Checkpoint validation failed", issues: validation.issues }, 400);
      }
      const mission = this.swarmDispatcher.receiveCheckpoint(checkpoint);
      return c.json({ mission, checkpoint, validation });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  };

  /** POST /api/swarm/worker/:id/start — Start (mark as idle) a worker */
  startSwarmWorker: ContextHandler = async (c) => {
    const id = c.req.param("id")!;
    this.swarmRoster.markIdle(id);
    return c.json({ ok: true, workerId: id, state: "idle" });
  };

  /** POST /api/swarm/worker/:id/kill — Kill a worker */
  killSwarmWorker: ContextHandler = async (c) => {
    const id = c.req.param("id")!;
    const reason = c.req.query("reason") ?? "killed via API";
    this.swarmRoster.killWorker(id, reason);
    return c.json({ ok: true, workerId: id, state: "offline" });
  };

  /** GET /api/swarm/briefs — All briefs */
  getSwarmBriefs: ContextHandler = async (c) => {
    return c.json(this.swarmRoster.getBriefs());
  };

  /** GET /api/swarm/checkpoints — All checkpoints for a brief */
  getSwarmCheckpoint: ContextHandler = async (c) => {
    const briefId = c.req.query("briefId");
    if (briefId) {
      return c.json(this.swarmDispatcher.getCheckpoints(briefId));
    }
    return c.json([]);
  };
}
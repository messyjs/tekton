/**
 * Dashboard Server — Hono HTTP server serving the React SPA + REST API.
 * Runs on 127.0.0.1:7700 by default.
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { generateDashboardHTML } from "./spa.js";
import { DashboardAPI } from "./api.js";
import type { DashboardConfig } from "./types.js";
import { DEFAULT_DASHBOARD_CONFIG } from "./types.js";

export class DashboardServer {
  readonly config: DashboardConfig;
  readonly app: Hono;
  readonly api: DashboardAPI;
  private server: ReturnType<typeof serve> | null = null;

  constructor(config?: Partial<DashboardConfig>) {
    this.config = { ...DEFAULT_DASHBOARD_CONFIG, ...config };
    this.app = new Hono();
    this.api = new DashboardAPI(this.config);
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // CORS
    this.app.use("*", cors());

    // ── API Routes ───────────────────────────────────────────────────

    // Status
    this.app.get("/api/status", this.api.getStatus);

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

    // ── SPA ───────────────────────────────────────────────────────────

    // Serve the dashboard HTML for all non-API routes
    this.app.get("/*", (c) => {
      const html = generateDashboardHTML(this.config);
      return c.html(html);
    });
  }

  /** Start the dashboard server */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = serve({
          fetch: this.app.fetch,
          hostname: this.config.host,
          port: this.config.port,
        }, () => {
          console.log(`⚡ Tekton Dashboard running at http://${this.config.host}:${this.config.port}`);
          resolve();
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /** Stop the dashboard server */
  async stop(): Promise<void> {
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
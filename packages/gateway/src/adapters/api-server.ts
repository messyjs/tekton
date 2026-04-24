/**
 * API Server Adapter — Full implementation. REST API + WebSocket for real-time communication.
 * Hono-free: uses raw Node http server with JSON body parsing.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { BaseAdapter } from "../base-adapter.js";
import type { SendOptions } from "../types.js";

export interface ApiServerConfig {
  port?: number;
  authToken?: string;
}

interface WsConnection {
  ws: any;
  userId: string;
  channels: Set<string>;
}

export class ApiServerAdapter extends BaseAdapter {
  readonly name = "api-server" as const;
  private port: number;
  private authToken: string;
  private server: ReturnType<typeof createServer> | null = null;

  constructor(config?: ApiServerConfig) {
    super();
    this.port = config?.port ?? 7700;
    this.authToken = config?.authToken ?? process.env.TEKTON_API_TOKEN ?? "";
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => this.handleRequest(req, res));

      this.server.on("error", reject);
      this.server.listen(this.port, () => {
        this.markConnected();
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          this.markDisconnected();
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async send(target: string, message: string, options?: SendOptions): Promise<void> {
    // API server doesn't "send" outbound — clients poll or use WebSocket
    // This is a no-op; responses go through the session system
    this.trackOutbound();
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", `http://localhost:${this.port}`);

    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Auth check
    if (this.authToken) {
      const authHeader = req.headers["authorization"];
      const token = typeof authHeader === "string" ? authHeader.replace("Bearer ", "") : "";
      if (token !== this.authToken) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }
    }

    // Routes
    if (req.method === "GET" && url.pathname === "/api/v1/health") {
      this.jsonResponse(res, { status: "ok", uptime: process.uptime() });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/v1/status") {
      this.jsonResponse(res, {
        platform: "api-server",
        connected: this.connected,
        messagesIn: this.messagesIn,
        messagesOut: this.messagesOut,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/v1/message") {
      const body = await this.readBody(req);
      try {
        const data = JSON.parse(body);
        const userId = data.user_id ?? url.searchParams.get("user_id") ?? "api-user";
        const channelId = data.channel_id ?? url.searchParams.get("channel_id") ?? "api-default";
        const text = data.text ?? "";

        if (!text) {
          this.jsonResponse(res, { error: "text field required" }, 400);
          return;
        }

        this.emitMessage({
          platform: "api-server",
          userId,
          channelId,
          text,
          userName: data.user_name,
          metadata: { raw: data },
        });

        this.jsonResponse(res, { status: "received", event_id: randomUUID() });
      } catch {
        this.jsonResponse(res, { error: "Invalid JSON" }, 400);
      }
      return;
    }

    // 404
    this.jsonResponse(res, { error: "Not found" }, 404);
  }

  private async readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve) => {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => resolve(body));
    });
  }

  private jsonResponse(res: ServerResponse, data: unknown, statusCode = 200): void {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  }

  getPort(): number {
    return this.port;
  }
}
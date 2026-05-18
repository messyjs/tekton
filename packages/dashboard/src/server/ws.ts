/**
 * Dashboard WebSocket Server — real-time event streaming to all dashboard pages.
 *
 * Broadcasts:
 *   - Agent pool events (spawn, kill, task started, task completed, task failed)
 *   - Service health changes
 *   - Trade signals (from PI Agent)
 *   - Learning events (skill extracted, skill refined)
 *   - MCP connection status
 *
 * Usage:
 *   const ws = new DashboardWS({ port: 7701 });
 *   ws.start();
 *   ws.broadcast({ type: "agent_spawned", agentId: "..." });
 */
import { WebSocketServer, WebSocket, type Data } from "ws";
import type { AgentPool } from "@tekton/core";

// ── Types ───────────────────────────────────────────────────────────────

export interface WSEvent {
  type: string;
  timestamp: string;
  data: any;
}

export interface WSConfig {
  port: number;
  host?: string;
  /** How often to send heartbeat pings (ms) */
  heartbeatInterval?: number;
  /** Max payload size in bytes */
  maxPayload?: number;
}

interface Client {
  ws: WebSocket;
  id: string;
  subscriptions: Set<string>; // event type subscriptions, empty = all
  connectedAt: number;
  lastPing: number;
}

// ── WebSocket Server ─────────────────────────────────────────────────────

export class DashboardWS {
  private config: Required<WSConfig>;
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, Client>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private eventBuffer: WSEvent[] = [];
  private maxBufferSize = 200;

  /** Set the terminal manager for PTY I/O */
  setTerminalManager(tm: import('./terminal.js').TerminalManager): void {
    this.terminalManager = tm;
  }

  // Subsystem references
  private agentPool: AgentPool | null = null;
  private terminalManager: import('./terminal.js').TerminalManager | null = null;

  constructor(config: Partial<WSConfig> = {}) {
    this.config = {
      port: config.port ?? 7701,
      host: config.host ?? "127.0.0.1",
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      maxPayload: config.maxPayload ?? 1024 * 1024, // 1MB
    };
  }

  /** Set the agent pool to monitor for events */
  setAgentPool(pool: AgentPool): void {
    this.agentPool = pool;
  }

  /** Start the WebSocket server */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({
        port: this.config.port,
        host: this.config.host,
        maxPayload: this.config.maxPayload,
      });

      this.wss.on("connection", (ws: WebSocket, req: any) => {
        const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const client: Client = {
          ws,
          id: clientId,
          subscriptions: new Set(),
          connectedAt: Date.now(),
          lastPing: Date.now(),
        };
        this.clients.set(clientId, client);

        // Send buffered events on connect so new clients catch up
        this.sendToClient(client, {
          type: "connected",
          timestamp: new Date().toISOString(),
          data: {
            clientId,
            eventBuffer: this.eventBuffer.slice(-50), // Last 50 events
          },
        });

        ws.on("message", (data: Data) => {
          try {
            const msg = JSON.parse(data.toString());
            this.handleClientMessage(clientId, msg);
          } catch {}
        });

        ws.on("close", () => {
          this.clients.delete(clientId);
          this.broadcast({
            type: "client_disconnected",
            timestamp: new Date().toISOString(),
            data: { clientId },
          });
        });

        ws.on("pong", () => {
          client.lastPing = Date.now();
        });

        // Notify other clients
        this.broadcast({
          type: "client_connected",
          timestamp: new Date().toISOString(),
          data: { clientId },
        });
      });

      this.wss.on("listening", () => {
        console.log(`[DashboardWS] WebSocket server listening on ws://${this.config.host}:${this.config.port}`);
        this.startHeartbeat();
        this.startPoolListener();
        this.startPIAgentPoller();
        resolve();
      });

      this.wss.on("error", (err: Error) => {
        console.error(`[DashboardWS] Server error:`, err.message);
        reject(err);
      });
    });
  }

  /** Stop the WebSocket server */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
      for (const client of this.clients.values()) {
        client.ws.close();
      }
      this.clients.clear();
      this.wss?.close(() => {
        this.wss = null;
        resolve();
      });
    });
  }

  /** Broadcast an event to all connected clients */
  broadcast(event: WSEvent): void {
    // Add to buffer
    this.eventBuffer.push(event);
    if (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer.shift();
    }

    const data = JSON.stringify(event);
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        // Check subscriptions
        if (client.subscriptions.size === 0 || client.subscriptions.has(event.type)) {
          client.ws.send(data);
        }
      }
    }
  }

  /** Send a direct message to a specific client */
  private sendToClient(client: Client, event: WSEvent): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(event));
    }
  }

  /** Handle incoming message from a client */
  private handleClientMessage(clientId: string, msg: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (msg.type) {
      case "subscribe":
        // Subscribe to specific event types
        if (Array.isArray(msg.events)) {
          for (const evt of msg.events) {
            client.subscriptions.add(evt);
          }
        }
        this.sendToClient(client, {
          type: "subscribed",
          timestamp: new Date().toISOString(),
          data: { events: [...client.subscriptions] },
        });
        break;

      case "unsubscribe":
        if (Array.isArray(msg.events)) {
          for (const evt of msg.events) {
            client.subscriptions.delete(evt);
          }
        }
        this.sendToClient(client, {
          type: "unsubscribed",
          timestamp: new Date().toISOString(),
          data: { events: [...client.subscriptions] },
        });
        break;

      case "ping":
        client.lastPing = Date.now();
        this.sendToClient(client, {
          type: "pong",
          timestamp: new Date().toISOString(),
          data: {},
        });
        break;

      case "get_state":
        // Client requests current state
        this.sendToClient(client, {
          type: "state",
          timestamp: new Date().toISOString(),
          data: {
            connectedClients: this.clients.size,
            poolStatus: this.agentPool?.getStatus() ?? null,
            recentEvents: this.eventBuffer.slice(-20),
          },
        });
        break;

      case "pool_command":
        // Client sends a command to the agent pool
        this.handlePoolCommand(clientId, msg);
        break;

      // ── Terminal I/O ───────────────────────────────
      case "terminal_input":
        // Client sends keyboard input to a PTY session
        if (msg.sessionId && msg.data && this.terminalManager) {
          this.terminalManager.write(msg.sessionId, msg.data);
        }
        break;

      case "terminal_resize":
        // Client resizes a PTY session
        if (msg.sessionId && this.terminalManager) {
          this.terminalManager.resize(msg.sessionId, msg.cols || 80, msg.rows || 24);
        }
        break;

      case "terminal_create":
        // Client requests a new terminal session via WS
        if (this.terminalManager) {
          const result = this.terminalManager.createSession({
            shell: msg.shell,
            cwd: msg.cwd,
            cols: msg.cols,
            rows: msg.rows,
          });
          if ("error" in result) {
            this.sendToClient(client, {
              type: "terminal_error",
              timestamp: new Date().toISOString(),
              data: { error: result.error },
            });
          } else {
            const session = result.session;
            // Wire output and exit events back to this specific client
            this.terminalManager.onOutput(session.id, (data: string, sid: string) => {
              this.sendToClient(client, {
                type: "terminal_output",
                timestamp: new Date().toISOString(),
                data: { sessionId: sid, output: data },
              });
            });
            this.terminalManager.onExit(session.id, (exitCode: number | null, sid: string) => {
              this.sendToClient(client, {
                type: "terminal_exit",
                timestamp: new Date().toISOString(),
                data: { sessionId: sid, exitCode },
              });
            });
            this.sendToClient(client, {
              type: "terminal_created",
              timestamp: new Date().toISOString(),
              data: {
                sessionId: session.id,
                shell: session.shell,
                cwd: session.cwd,
                createdAt: session.createdAt,
              },
            });
          }
        }
        break;

      case "terminal_kill":
        // Client kills a PTY session via WS
        if (msg.sessionId && this.terminalManager) {
          this.terminalManager.kill(msg.sessionId);
        }
        break;
    }
  }

  /** Handle pool commands from clients */
  private handlePoolCommand(clientId: string, msg: any): void {
    if (!this.agentPool) return;

    switch (msg.action) {
      case "spawn":
        this.agentPool.spawn(msg.config).then((agentId) => {
          this.broadcast({
            type: "agent_spawned",
            timestamp: new Date().toISOString(),
            data: { agentId, clientId },
          });
        });
        break;

      case "kill":
        this.agentPool.kill(msg.agentId, `Killed by client ${clientId}`).then((success) => {
          this.broadcast({
            type: "agent_killed",
            timestamp: new Date().toISOString(),
            data: { agentId: msg.agentId, success },
          });
        });
        break;

      case "killAll":
        this.agentPool.killAll(`Killed all by client ${clientId}`).then(() => {
          this.broadcast({
            type: "pool_killed_all",
            timestamp: new Date().toISOString(),
            data: { clientId },
          });
        });
        break;

      case "submitTask":
        const result = this.agentPool.submitTask(msg.task);
        this.broadcast({
          type: "task_submitted",
          timestamp: new Date().toISOString(),
          data: { taskId: result.taskId, strategy: result.strategy, clientId },
        });
        break;
    }
  }

  /** Start heartbeat pings to detect dead connections */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      for (const [id, client] of this.clients) {
        if (now - client.lastPing > 60000) {
          // Client hasn't responded in 60s — close
          client.ws.terminate();
          this.clients.delete(id);
        } else if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      }
    }, this.config.heartbeatInterval);
  }

  /** Listen to AgentPool event log and broadcast */
  private startPoolListener(): void {
    if (!this.agentPool) return;

    // Poll the event log every second
    let lastEventIndex = 0;
    setInterval(() => {
      if (!this.agentPool) return;
      const events = this.agentPool.getEventLog();
      if (events.length > lastEventIndex) {
        const newEvents = events.slice(lastEventIndex);
        for (const event of newEvents) {
          this.broadcast({
            type: `pool_${event.type}`,
            timestamp: new Date().toISOString(),
            data: event,
          });
        }
        lastEventIndex = events.length;
      }
    }, 1000);
  }

  /** Listen to PI Agent events and broadcast */
  private piAgentUrl = process.env.PI_AGENT_URL || "http://localhost:7706";
  private piLastSignalCount = 0;
  private piInterval: ReturnType<typeof setInterval> | null = null;

  private startPIAgentPoller(): void {
    // Poll PI Agent for new trade signals every 15 seconds
    this.piInterval = setInterval(async () => {
      try {
        const resp = await fetch(`${this.piAgentUrl}/health`, { signal: AbortSignal.timeout(3000) });
        if (!resp.ok) return;
        const health = await resp.json();
        this.broadcast({
          type: "pi_health",
          timestamp: new Date().toISOString(),
          data: health,
        });
      } catch {
        // PI Agent offline — broadcast offline status periodically
        this.broadcast({
          type: "pi_health",
          timestamp: new Date().toISOString(),
          data: { status: "offline" },
        });
      }
    }, 15000);
  }

  /** Get server stats */
  getStats(): { clients: number; port: number; eventsBuffered: number } {
    return {
      clients: this.clients.size,
      port: this.config.port,
      eventsBuffered: this.eventBuffer.length,
    };
  }
}
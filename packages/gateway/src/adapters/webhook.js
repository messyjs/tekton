/**
 * Webhook Adapter — Full implementation. Express-free HTTP server for receiving and sending messages.
 */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { BaseAdapter } from "../base-adapter.js";
export class WebhookAdapter extends BaseAdapter {
    name = "webhook";
    port;
    secret;
    path;
    server = null;
    pendingResponses = new Map();
    constructor(config) {
        super();
        this.port = config?.port ?? 7701;
        this.secret = config?.secret ?? process.env.WEBHOOK_SECRET ?? "";
        this.path = config?.path ?? "/webhook";
    }
    async start() {
        return new Promise((resolve, reject) => {
            this.server = createServer((req, res) => this.handleRequest(req, res));
            this.server.on("error", reject);
            this.server.listen(this.port, () => {
                this.markConnected();
                resolve();
            });
        });
    }
    async stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    this.server = null;
                    this.markDisconnected();
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    }
    async send(target, message, options) {
        // For webhooks, "target" is a URL to POST the response to
        const chunks = this.splitMessage(message);
        for (const chunk of chunks) {
            await fetch(target, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: chunk,
                    parseMode: options?.parseMode,
                    timestamp: Date.now(),
                }),
            });
            this.trackOutbound();
        }
    }
    handleRequest(req, res) {
        if (req.method !== "POST") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "ok", message: "Tekton Gateway Webhook" }));
            return;
        }
        if (!req.url?.startsWith(this.path)) {
            res.writeHead(404);
            res.end("Not found");
            return;
        }
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => {
            try {
                const data = JSON.parse(body);
                // Verify secret if configured
                if (this.secret) {
                    const authHeader = req.headers["authorization"];
                    const bearerToken = typeof authHeader === "string" ? authHeader.replace("Bearer ", "") : "";
                    if (bearerToken !== this.secret) {
                        res.writeHead(401);
                        res.end(JSON.stringify({ error: "Unauthorized" }));
                        return;
                    }
                }
                // Extract message fields
                const userId = data.user_id ?? data.userId ?? "webhook-user";
                const channelId = data.channel_id ?? data.channelId ?? "webhook-default";
                const text = data.text ?? data.message ?? "";
                if (!text) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: "No text field" }));
                    return;
                }
                // Store response for later reply
                const eventId = randomUUID();
                this.pendingResponses.set(eventId, res);
                this.emitMessage({
                    platform: "webhook",
                    userId,
                    channelId,
                    text,
                    userName: data.user_name ?? data.userName,
                    metadata: {
                        eventId,
                        sourceIp: req.socket.remoteAddress,
                        rawData: data,
                    },
                });
                // Respond immediately with acceptance — gateway will deliver response through session
                if (!res.writableEnded) {
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ status: "received", event_id: eventId }));
                }
                this.pendingResponses.delete(eventId);
            }
            catch {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Invalid JSON" }));
            }
        });
    }
    /** Reply to a pending webhook request directly */
    replyToPending(eventId, message) {
        const res = this.pendingResponses.get(eventId);
        if (!res || res.writableEnded)
            return false;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ response: message, event_id: eventId }));
        this.pendingResponses.delete(eventId);
        return true;
    }
    getPort() {
        return this.port;
    }
}
//# sourceMappingURL=webhook.js.map
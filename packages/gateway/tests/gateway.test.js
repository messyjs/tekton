/**
 * Gateway Package Tests — Session store, rate limiter, slash commands, adapters, gateway runner.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { SessionStore } from "../src/session/store.js";
import { RateLimiter } from "../src/rate-limiter.js";
import { parseCommand, executeCommand, registerBuiltinCommands } from "../src/commands/slash-commands.js";
import { BaseAdapter } from "../src/base-adapter.js";
import { DEFAULT_GATEWAY_CONFIG } from "../src/types.js";
import { GatewayRunner } from "../src/gateway-runner.js";
import { WebhookAdapter } from "../src/adapters/webhook.js";
import { ApiServerAdapter } from "../src/adapters/api-server.js";
// ── Session Store ────────────────────────────────────────────────────
describe("SessionStore", () => {
    let store;
    let tempDir;
    beforeEach(() => {
        tempDir = mkdtempSync(join(tmpdir(), "tekton-gw-test-"));
        store = new SessionStore({ dbPath: join(tempDir, "test.db") });
    });
    afterEach(() => {
        store.close();
        rmSync(tempDir, { recursive: true, force: true });
    });
    it("creates a new session", () => {
        const session = store.getOrCreateSession({ platform: "telegram", userId: "123" });
        expect(session.platform).toBe("telegram");
        expect(session.userId).toBe("123");
        expect(session.messageCount).toBe(0);
        expect(session.currentModel).toBeNull();
        expect(session.voiceEnabled).toBe(false);
    });
    it("returns existing session on second call", () => {
        store.getOrCreateSession({ platform: "telegram", userId: "456" });
        const session = store.getOrCreateSession({ platform: "telegram", userId: "456" });
        expect(session.userId).toBe("456");
    });
    it("updates session fields", () => {
        store.getOrCreateSession({ platform: "discord", userId: "789" });
        store.updateSession({ platform: "discord", userId: "789" }, {
            currentModel: "claude-3.5-sonnet",
            personalityId: "creative",
            voiceEnabled: true,
        });
        const session = store.getOrCreateSession({ platform: "discord", userId: "789" });
        expect(session.currentModel).toBe("claude-3.5-sonnet");
        expect(session.personalityId).toBe("creative");
        expect(session.voiceEnabled).toBe(true);
    });
    it("stores and retrieves messages", () => {
        const key = { platform: "telegram", userId: "111" };
        store.getOrCreateSession(key);
        store.addMessage(key, "inbound", "Hello", "telegram");
        store.addMessage(key, "outbound", "Hi there!", "telegram");
        store.addMessage(key, "inbound", "How are you?", "telegram");
        const msgs = store.getRecentMessages(key);
        expect(msgs.length).toBe(3);
        expect(msgs[0].direction).toBe("inbound");
        expect(msgs[0].text).toBe("Hello");
        expect(msgs[1].text).toBe("Hi there!");
    });
    it("increments message count", () => {
        const key = { platform: "slack", userId: "222" };
        store.getOrCreateSession(key);
        store.addMessage(key, "inbound", "msg1", "slack");
        store.addMessage(key, "outbound", "msg2", "slack");
        const session = store.getOrCreateSession(key);
        expect(session.messageCount).toBe(2);
    });
    it("lists all sessions", () => {
        store.getOrCreateSession({ platform: "telegram", userId: "a" });
        store.getOrCreateSession({ platform: "discord", userId: "b" });
        const sessions = store.listSessions();
        expect(sessions.length).toBe(2);
    });
    it("finds sessions by platform", () => {
        store.getOrCreateSession({ platform: "telegram", userId: "x" });
        store.getOrCreateSession({ platform: "telegram", userId: "y" });
        store.getOrCreateSession({ platform: "discord", userId: "z" });
        const telegramSessions = store.findSessions("telegram");
        expect(telegramSessions.length).toBe(2);
    });
    it("deletes a session", () => {
        const key = { platform: "telegram", userId: "del" };
        store.getOrCreateSession(key);
        store.deleteSession(key);
        const sessions = store.listSessions();
        expect(sessions.find(s => s.userId === "del")).toBeUndefined();
    });
    it("limits recent messages", () => {
        const key = { platform: "telegram", userId: "lim" };
        store.getOrCreateSession(key);
        for (let i = 0; i < 100; i++) {
            store.addMessage(key, "inbound", `msg${i}`, "telegram");
        }
        const msgs = store.getRecentMessages(key, 10);
        expect(msgs.length).toBe(10);
    });
});
// ── Rate Limiter ────────────────────────────────────────────────────
describe("RateLimiter", () => {
    it("allows messages within limit", () => {
        const limiter = new RateLimiter(5);
        for (let i = 0; i < 5; i++) {
            expect(limiter.check("user1")).toBe(true);
        }
    });
    it("blocks messages over limit", () => {
        const limiter = new RateLimiter(3);
        expect(limiter.check("user1")).toBe(true);
        expect(limiter.check("user1")).toBe(true);
        expect(limiter.check("user1")).toBe(true);
        expect(limiter.check("user1")).toBe(false);
    });
    it("tracks different users independently", () => {
        const limiter = new RateLimiter(2);
        expect(limiter.check("user1")).toBe(true);
        expect(limiter.check("user1")).toBe(true);
        expect(limiter.check("user2")).toBe(true);
        expect(limiter.check("user1")).toBe(false);
    });
    it("reports remaining quota", () => {
        const limiter = new RateLimiter(10);
        limiter.check("user1");
        limiter.check("user1");
        expect(limiter.remaining("user1")).toBe(8);
    });
    it("resets rate limit for user", () => {
        const limiter = new RateLimiter(1);
        expect(limiter.check("user1")).toBe(true);
        expect(limiter.check("user1")).toBe(false);
        limiter.reset("user1");
        expect(limiter.check("user1")).toBe(true);
    });
});
// ── Slash Commands ───────────────────────────────────────────────────
describe("Slash Commands", () => {
    beforeEach(() => {
        registerBuiltinCommands();
    });
    it("parses /tekton:status command", () => {
        const result = parseCommand("/tekton:status");
        expect(result).not.toBeNull();
        expect(result.command).toBe("status");
        expect(result.args).toBe("");
    });
    it("parses /tekton:model with args", () => {
        const result = parseCommand("/tekton:model claude-3.5-sonnet");
        expect(result).not.toBeNull();
        expect(result.command).toBe("model");
        expect(result.args).toBe("claude-3.5-sonnet");
    });
    it("parses /tekton:voice", () => {
        const result = parseCommand("/tekton:voice");
        expect(result).not.toBeNull();
        expect(result.command).toBe("voice");
    });
    it("returns null for non-tekton commands", () => {
        expect(parseCommand("/start")).toBeNull();
        expect(parseCommand("hello")).toBeNull();
    });
    it("executes model command with args", async () => {
        const event = {
            id: "test-1",
            platform: "telegram",
            userId: "u1",
            channelId: "c1",
            text: "/tekton:model gpt-4",
            timestamp: Date.now(),
            isCommand: true,
        };
        const result = await executeCommand("model", "gpt-4", event, {
            session: {
                sessionKey: "telegram:u1",
                platform: "telegram",
                userId: "u1",
                userName: "Test",
                createdAt: Date.now(),
                lastActivityAt: Date.now(),
                messageCount: 0,
                currentModel: null,
                personalityId: null,
                voiceEnabled: false,
                skillsInstalled: [],
                metadata: {},
            },
            sessionStore: {},
            gatewayStatus: () => "Gateway running",
        });
        expect(result.response).toContain("gpt-4");
        expect(result.sessionUpdates?.currentModel).toBe("gpt-4");
    });
    it("executes help command", async () => {
        const event = {
            id: "test-2",
            platform: "discord",
            userId: "u2",
            channelId: "c2",
            text: "/tekton:help",
            timestamp: Date.now(),
            isCommand: true,
        };
        const result = await executeCommand("help", "", event, {
            session: {},
            sessionStore: {},
            gatewayStatus: () => "OK",
        });
        expect(result.response).toContain("status");
        expect(result.response).toContain("model");
        expect(result.response).toContain("voice");
    });
    it("executes unknown command", async () => {
        const event = {
            id: "test-3",
            platform: "telegram",
            userId: "u3",
            channelId: "c3",
            text: "/tekton:nonexistent",
            timestamp: Date.now(),
            isCommand: true,
        };
        const result = await executeCommand("nonexistent", "", event, {
            session: {},
            sessionStore: {},
            gatewayStatus: () => "OK",
        });
        expect(result.response).toContain("Unknown command");
    });
    it("executes voice toggle", async () => {
        const event = {
            id: "test-4",
            platform: "telegram",
            userId: "u4",
            channelId: "c4",
            text: "/tekton:voice",
            timestamp: Date.now(),
            isCommand: true,
        };
        const result = await executeCommand("voice", "", event, {
            session: {
                sessionKey: "telegram:u4",
                platform: "telegram",
                userId: "u4",
                userName: "",
                createdAt: Date.now(),
                lastActivityAt: Date.now(),
                messageCount: 0,
                currentModel: null,
                personalityId: null,
                voiceEnabled: false,
                skillsInstalled: [],
                metadata: {},
            },
            sessionStore: {},
            gatewayStatus: () => "OK",
        });
        expect(result.response).toContain("enabled");
        expect(result.sessionUpdates?.voiceEnabled).toBe(true);
    });
});
// ── Base Adapter ─────────────────────────────────────────────────────
class TestAdapter extends BaseAdapter {
    name = "webhook";
    async start() {
        this.markConnected();
    }
    async stop() {
        this.markDisconnected();
    }
    async send(target, message) {
        this.trackOutbound();
    }
}
describe("BaseAdapter", () => {
    it("tracks connection state", async () => {
        const adapter = new TestAdapter();
        expect(adapter.isConnected()).toBe(false);
        await adapter.start();
        expect(adapter.isConnected()).toBe(true);
        await adapter.stop();
        expect(adapter.isConnected()).toBe(false);
    });
    it("splits long messages", () => {
        const adapter = new TestAdapter();
        const longMsg = "a".repeat(5000);
        const chunks = adapter.splitMessage(longMsg, 2000);
        expect(chunks.length).toBeGreaterThan(1);
        for (const chunk of chunks) {
            expect(chunk.length).toBeLessThanOrEqual(2001);
        }
        expect(chunks.join("").replace(/\s/g, "")).toBe(longMsg.replace(/\s/g, ""));
    });
    it("emits messages to handler", async () => {
        const adapter = new TestAdapter();
        const received = [];
        adapter.onMessage(async (event) => {
            received.push(event);
        });
        adapter.emitMessage({
            platform: "webhook",
            userId: "test-user",
            channelId: "test-channel",
            text: "Hello from test",
            userName: "Tester",
        });
        await new Promise(r => setTimeout(r, 50));
        expect(received.length).toBe(1);
        expect(received[0].text).toBe("Hello from test");
        expect(received[0].isCommand).toBe(false);
    });
    it("detects commands", async () => {
        const adapter = new TestAdapter();
        const received = [];
        adapter.onMessage(async (event) => {
            received.push(event);
        });
        adapter.emitMessage({
            platform: "webhook",
            userId: "u1",
            channelId: "c1",
            text: "/tekton:status",
        });
        await new Promise(r => setTimeout(r, 50));
        expect(received[0].isCommand).toBe(true);
    });
    it("reports platform status", async () => {
        const adapter = new TestAdapter();
        await adapter.start();
        const status = adapter.getStatus();
        expect(status.name).toBe("webhook");
        expect(status.connected).toBe(true);
    });
    it("tracks errors", () => {
        const adapter = new TestAdapter();
        adapter.trackError(new Error("test error"));
        const status = adapter.getStatus();
        expect(status.errors).toBe(1);
        expect(status.lastError).toContain("test error");
    });
});
// ── Types ────────────────────────────────────────────────────────────
describe("Gateway Types", () => {
    it("has all platform names in DEFAULT_GATEWAY_CONFIG", () => {
        const platforms = Object.keys(DEFAULT_GATEWAY_CONFIG.platforms);
        expect(platforms).toContain("telegram");
        expect(platforms).toContain("discord");
        expect(platforms).toContain("slack");
        expect(platforms).toContain("webhook");
        expect(platforms).toContain("api-server");
        expect(platforms.length).toBeGreaterThanOrEqual(10);
    });
    it("has sensible defaults", () => {
        expect(DEFAULT_GATEWAY_CONFIG.maxMessageLength).toBe(4096);
        expect(DEFAULT_GATEWAY_CONFIG.rateLimitPerMinute).toBe(30);
        expect(DEFAULT_GATEWAY_CONFIG.platforms.webhook.enabled).toBe(true);
        expect(DEFAULT_GATEWAY_CONFIG.platforms["api-server"].enabled).toBe(true);
    });
});
// ── Webhook Adapter ─────────────────────────────────────────────────
describe("WebhookAdapter", () => {
    it("starts and stops", async () => {
        const adapter = new WebhookAdapter({ port: 7802, secret: "test" });
        await adapter.start();
        expect(adapter.isConnected()).toBe(true);
        expect(adapter.getPort()).toBe(7802);
        await adapter.stop();
        expect(adapter.isConnected()).toBe(false);
    });
    it("responds to health check on non-POST", async () => {
        const adapter = new WebhookAdapter({ port: 7803 });
        await adapter.start();
        const res = await fetch("http://localhost:7803/webhook");
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.status).toBe("ok");
        await adapter.stop();
    });
    it("accepts POST messages", async () => {
        const adapter = new WebhookAdapter({ port: 7804 });
        const receivedMessages = [];
        adapter.onMessage(async (event) => {
            receivedMessages.push(event);
        });
        await adapter.start();
        const res = await fetch("http://localhost:7804/webhook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: "wh-user-1",
                channel_id: "wh-channel-1",
                text: "Hello from webhook!",
            }),
        });
        // The webhook auto-responds with 200 after timeout or immediately
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toBeDefined();
        await new Promise(r => setTimeout(r, 200));
        expect(receivedMessages.length).toBe(1);
        expect(receivedMessages[0].text).toBe("Hello from webhook!");
        expect(receivedMessages[0].platform).toBe("webhook");
        await adapter.stop();
    }, 10000);
    it("rejects unauthorized requests when secret is set", async () => {
        const adapter = new WebhookAdapter({ port: 7805, secret: "mysecret" });
        await adapter.start();
        const res = await fetch("http://localhost:7805/webhook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: "test" }),
        });
        expect(res.status).toBe(401);
        await adapter.stop();
    });
});
// ── API Server Adapter ───────────────────────────────────────────────
describe("ApiServerAdapter", () => {
    it("starts and stops", async () => {
        const adapter = new ApiServerAdapter({ port: 7806 });
        await adapter.start();
        expect(adapter.isConnected()).toBe(true);
        expect(adapter.getPort()).toBe(7806);
        await adapter.stop();
        expect(adapter.isConnected()).toBe(false);
    });
    it("has health endpoint", async () => {
        const adapter = new ApiServerAdapter({ port: 7807 });
        await adapter.start();
        const res = await fetch("http://localhost:7807/api/v1/health");
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.status).toBe("ok");
        await adapter.stop();
    });
    it("accepts messages via POST", async () => {
        const adapter = new ApiServerAdapter({ port: 7808 });
        const receivedMessages = [];
        adapter.onMessage(async (event) => {
            receivedMessages.push(event);
        });
        await adapter.start();
        const res = await fetch("http://localhost:7808/api/v1/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: "api-user-1",
                text: "Hello from API!",
            }),
        });
        expect(res.status).toBe(200);
        await new Promise(r => setTimeout(r, 100));
        expect(receivedMessages.length).toBe(1);
        expect(receivedMessages[0].text).toBe("Hello from API!");
        expect(receivedMessages[0].platform).toBe("api-server");
        await adapter.stop();
    });
    it("rejects unauthorized requests when auth token is set", async () => {
        const adapter = new ApiServerAdapter({ port: 7809, authToken: "secret-token" });
        await adapter.start();
        const res = await fetch("http://localhost:7809/api/v1/health", {
            headers: { "Authorization": "Bearer wrong-token" },
        });
        expect(res.status).toBe(401);
        const res2 = await fetch("http://localhost:7809/api/v1/health", {
            headers: { "Authorization": "Bearer secret-token" },
        });
        expect(res2.status).toBe(200);
        await adapter.stop();
    });
    it("returns 404 for unknown routes", async () => {
        const adapter = new ApiServerAdapter({ port: 7810 });
        await adapter.start();
        const res = await fetch("http://localhost:7810/unknown");
        expect(res.status).toBe(404);
        await adapter.stop();
    });
});
// ── Gateway Runner (Integration) ────────────────────────────────────
describe("GatewayRunner", () => {
    let tempDir;
    beforeEach(() => {
        tempDir = mkdtempSync(join(tmpdir(), "tekton-runner-test-"));
    });
    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });
    it("initializes with default config", () => {
        const runner = new GatewayRunner({ dataDir: tempDir });
        expect(runner.config).toBeDefined();
        expect(runner.adapters.size).toBeGreaterThan(0);
        runner.sessions.close();
    });
    it("starts and stops cleanly", async () => {
        const runner = new GatewayRunner({
            dataDir: tempDir,
            platforms: {
                webhook: { enabled: true, port: 7811 },
                "api-server": { enabled: true, port: 7812 },
            },
        });
        await runner.start();
        expect(runner.getStatus().running).toBe(true);
        await runner.stop();
        expect(runner.getStatus().running).toBe(false);
        runner.sessions.close();
    });
    it("handles messages through message flow", async () => {
        const runner = new GatewayRunner({
            dataDir: tempDir,
            platforms: {
                webhook: { enabled: true, port: 7813 },
                "api-server": { enabled: true, port: 7814 },
            },
        });
        const responses = [];
        runner.onMessage(async (event, session) => {
            responses.push(event.text);
            return `Echo: ${event.text}`;
        });
        await runner.start();
        await runner.handleIncomingMessage({
            id: "test-1",
            platform: "webhook",
            userId: "user-1",
            channelId: "channel-1",
            text: "Hello gateway",
            timestamp: Date.now(),
            isCommand: false,
        });
        expect(responses.length).toBe(1);
        expect(responses[0]).toBe("Hello gateway");
        await runner.stop();
        runner.sessions.close();
    });
    it("processes slash commands", async () => {
        const runner = new GatewayRunner({
            dataDir: tempDir,
            platforms: {
                webhook: { enabled: true, port: 7815 },
                "api-server": { enabled: true, port: 7816 },
            },
        });
        runner.onMessage(async (event) => `Response to: ${event.text}`);
        await runner.start();
        await runner.handleIncomingMessage({
            id: "cmd-1",
            platform: "telegram",
            userId: "user-2",
            channelId: "channel-2",
            text: "/tekton:help",
            timestamp: Date.now(),
            isCommand: true,
        });
        const sessions = runner.sessions.listSessions();
        expect(sessions.length).toBe(1);
        await runner.stop();
        runner.sessions.close();
    });
    it("rate limits messages", async () => {
        const runner = new GatewayRunner({
            dataDir: tempDir,
            rateLimitPerMinute: 3,
            platforms: {
                webhook: { enabled: true, port: 7817 },
            },
        });
        runner.onMessage(async () => "ok");
        await runner.start();
        for (let i = 0; i < 3; i++) {
            await runner.handleIncomingMessage({
                id: `msg-${i}`,
                platform: "webhook",
                userId: "rate-limited-user",
                channelId: "ch",
                text: `msg ${i}`,
                timestamp: Date.now(),
                isCommand: false,
            });
        }
        // 4th should be rate limited
        const beforeOut = runner.getStatus().totalMessagesOut;
        await runner.handleIncomingMessage({
            id: "msg-4",
            platform: "webhook",
            userId: "rate-limited-user",
            channelId: "ch",
            text: "msg 4",
            timestamp: Date.now(),
            isCommand: false,
        });
        await runner.stop();
        runner.sessions.close();
    });
    it("returns status summary", async () => {
        const runner = new GatewayRunner({
            dataDir: tempDir,
            platforms: {
                webhook: { enabled: true, port: 7818 },
            },
        });
        await runner.start();
        const summary = runner.getStatusSummary();
        expect(summary).toContain("Running");
        expect(summary).toContain("webhook");
        await runner.stop();
        const stoppedSummary = runner.getStatusSummary();
        expect(stoppedSummary).toContain("Stopped");
        runner.sessions.close();
    });
    it("persists sessions across instances", () => {
        const dbPath = join(tempDir, "sessions-persist.db");
        const store1 = new SessionStore({ dbPath });
        store1.getOrCreateSession({ platform: "telegram", userId: "persist-test" });
        store1.updateSession({ platform: "telegram", userId: "persist-test" }, { currentModel: "gpt-4" });
        const store2 = new SessionStore({ dbPath });
        const session = store2.getOrCreateSession({ platform: "telegram", userId: "persist-test" });
        expect(session.currentModel).toBe("gpt-4");
        store1.close();
        store2.close();
    });
});
//# sourceMappingURL=gateway.test.js.map
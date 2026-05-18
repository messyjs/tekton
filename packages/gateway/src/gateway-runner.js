/**
 * Gateway Runner — Orchestrates all platform adapters, session routing, slash commands, and message flow.
 */
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { TelegramAdapter, DiscordAdapter, SlackAdapter, WhatsAppAdapter, SignalAdapter, MatrixAdapter, EmailAdapter, SMSAdapter, WebhookAdapter, ApiServerAdapter, } from "./adapters/index.js";
import { SessionStore } from "./session/store.js";
import { RateLimiter } from "./rate-limiter.js";
import { parseCommand, executeCommand, registerBuiltinCommands } from "./commands/slash-commands.js";
import { DEFAULT_GATEWAY_CONFIG } from "./types.js";
export class GatewayRunner {
    config;
    adapters = new Map();
    sessions;
    rateLimiter;
    started = false;
    startTime = 0;
    totalMessagesIn = 0;
    totalMessagesOut = 0;
    messageHandler = null;
    cleanupInterval = null;
    constructor(config) {
        this.config = { ...DEFAULT_GATEWAY_CONFIG, ...config };
        // Set up data directory
        const dataDir = this.config.dataDir ?? join(homedir(), ".tekton", "gateway");
        if (!existsSync(dataDir)) {
            mkdirSync(dataDir, { recursive: true });
        }
        // Initialize session store
        this.sessions = new SessionStore({ dbPath: join(dataDir, "sessions.db") });
        // Initialize rate limiter
        this.rateLimiter = new RateLimiter(this.config.rateLimitPerMinute);
        // Register built-in slash commands
        registerBuiltinCommands();
        // Set up adapters based on config
        this.setupAdapters();
    }
    /** Register a message handler — called when any user sends a non-command message */
    onMessage(handler) {
        this.messageHandler = handler;
    }
    /** Start all configured platform adapters */
    async start() {
        if (this.started)
            return;
        const startErrors = [];
        for (const [name, adapter] of this.adapters) {
            try {
                // Register message handler on adapter
                adapter.onMessage((event) => this.handleIncomingMessage(event));
                await adapter.start();
                console.log(`✓ Gateway: ${name} adapter started`);
            }
            catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                startErrors.push({ platform: name, error: errorMsg });
                console.error(`✗ Gateway: ${name} adapter failed: ${errorMsg}`);
            }
        }
        // Start cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.rateLimiter.cleanup();
        }, 60_000);
        this.started = true;
        this.startTime = Date.now();
        if (startErrors.length > 0) {
            console.warn(`⚠ Gateway started with ${startErrors.length} adapter failure(s)`);
        }
    }
    /** Stop all adapters */
    async stop() {
        if (!this.started)
            return;
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        for (const adapter of this.adapters.values()) {
            try {
                await adapter.stop();
            }
            catch {
                // Ignore stop errors
            }
        }
        this.started = false;
    }
    /** Handle incoming message from any platform */
    async handleIncomingMessage(event) {
        this.totalMessagesIn++;
        // Rate limit check
        if (!this.rateLimiter.check(event.userId)) {
            await this.deliverResponse({ platform: event.platform, targetId: event.channelId }, "Rate limit exceeded. Please slow down.");
            return;
        }
        // Get or create session
        const session = this.sessions.getOrCreateSession({
            platform: event.platform,
            userId: event.userId,
        });
        // Update user name if provided
        if (event.userName && event.userName !== session.userName) {
            this.sessions.updateSession({ platform: event.platform, userId: event.userId }, { userName: event.userName });
        }
        // Store inbound message
        this.sessions.addMessage({ platform: event.platform, userId: event.userId }, "inbound", event.text, event.platform);
        // Check for slash commands
        if (event.isCommand) {
            const parsed = parseCommand(event.text);
            if (parsed) {
                const result = await executeCommand(parsed.command, parsed.args, event, {
                    session,
                    sessionStore: this.sessions,
                    gatewayStatus: () => this.getStatusSummary(),
                });
                // Apply session updates
                if (result.sessionUpdates) {
                    this.sessions.updateSession({ platform: event.platform, userId: event.userId }, result.sessionUpdates);
                }
                // Send command response
                await this.deliverResponse({ platform: event.platform, targetId: event.channelId, replyToId: event.id }, result.response);
                return;
            }
        }
        // Forward to registered message handler
        if (this.messageHandler) {
            try {
                const response = await this.messageHandler(event, session);
                // Store outbound message
                this.sessions.addMessage({ platform: event.platform, userId: event.userId }, "outbound", response, event.platform);
                // Deliver response
                await this.deliverResponse({ platform: event.platform, targetId: event.channelId, replyToId: event.id }, response);
            }
            catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                console.error(`Gateway message handler error: ${errorMsg}`);
                await this.deliverResponse({ platform: event.platform, targetId: event.channelId }, `Error processing message: ${errorMsg}`);
            }
        }
    }
    /** Deliver a response to a platform */
    async deliverResponse(target, response) {
        const adapter = this.adapters.get(target.platform);
        if (!adapter) {
            console.error(`No adapter for platform: ${target.platform}`);
            return;
        }
        try {
            await adapter.send(target.targetId, response, {
                split: true,
                replyToId: target.replyToId,
            });
            this.totalMessagesOut++;
        }
        catch (err) {
            console.error(`Failed to deliver to ${target.platform}: ${err}`);
        }
    }
    /** Get gateway status */
    getStatus() {
        const platforms = {};
        for (const [name, adapter] of this.adapters) {
            if ("getStatus" in adapter) {
                platforms[name] = adapter.getStatus();
            }
            else {
                platforms[name] = { name, connected: adapter.isConnected() };
            }
        }
        return {
            running: this.started,
            platforms,
            totalMessagesIn: this.totalMessagesIn,
            totalMessagesOut: this.totalMessagesOut,
            uptimeMs: this.started ? Date.now() - this.startTime : 0,
        };
    }
    /** Get a human-readable status summary */
    getStatusSummary() {
        const status = this.getStatus();
        const lines = [
            `🟢 Gateway ${status.running ? "Running" : "Stopped"}`,
            `   Uptime: ${Math.round(status.uptimeMs / 1000)}s`,
            `   Messages: ${status.totalMessagesIn} in / ${status.totalMessagesOut} out`,
            `   Platforms:`,
        ];
        for (const [name, ps] of Object.entries(status.platforms)) {
            const s = ps;
            const icon = s.connected ? "✓" : "✗";
            lines.push(`     ${icon} ${name}: ${s.connected ? "connected" : "disconnected"} (${s.messagesIn ?? 0} in, ${s.messagesOut ?? 0} out)`);
        }
        return lines.join("\n");
    }
    /** Set up adapters from config */
    setupAdapters() {
        const platformConfigs = this.config.platforms;
        const adapterFactories = {
            telegram: (c) => new TelegramAdapter(c?.botToken ?? process.env.TELEGRAM_BOT_TOKEN),
            discord: (c) => new DiscordAdapter({
                botToken: c?.botToken ?? process.env.DISCORD_BOT_TOKEN,
                allowedUsers: c?.allowedUsers ?? process.env.DISCORD_ALLOWED_USERS?.split(",") ?? [],
                requireMention: c?.requireMention ?? true,
            }),
            slack: (c) => new SlackAdapter({
                botToken: c?.botToken ?? process.env.SLACK_BOT_TOKEN,
                appToken: c?.appToken ?? process.env.SLACK_APP_TOKEN,
                allowedUsers: c?.allowedUsers ?? [],
            }),
            whatsapp: () => new WhatsAppAdapter(),
            signal: () => new SignalAdapter(),
            matrix: () => new MatrixAdapter(),
            email: () => new EmailAdapter(),
            sms: () => new SMSAdapter(),
            webhook: (c) => new WebhookAdapter({
                port: c?.port ?? 7701,
                secret: c?.secret ?? process.env.WEBHOOK_SECRET ?? "",
            }),
            "api-server": (c) => new ApiServerAdapter({
                port: c?.port ?? 7700,
                authToken: c?.authToken ?? process.env.TEKTON_API_TOKEN ?? "",
            }),
        };
        for (const [name, config] of Object.entries(platformConfigs)) {
            if (config?.enabled) {
                const factory = adapterFactories[name];
                if (factory) {
                    this.adapters.set(name, factory(config));
                }
            }
        }
    }
}
//# sourceMappingURL=gateway-runner.js.map
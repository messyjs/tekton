/**
 * Discord Adapter — Full implementation using discord.js-style API.
 * Uses environment variables DISCORD_BOT_TOKEN, DISCORD_ALLOWED_USERS.
 */
import { BaseAdapter } from "../base-adapter.js";
export class DiscordAdapter extends BaseAdapter {
    name = "discord";
    botToken;
    allowedUsers;
    requireMention;
    ws = null;
    heartbeatInterval = null;
    sessionId = null;
    sequenceNumber = null;
    constructor(config) {
        super();
        this.botToken = config?.botToken ?? process.env.DISCORD_BOT_TOKEN ?? "";
        this.allowedUsers = config?.allowedUsers ?? (process.env.DISCORD_ALLOWED_USERS?.split(",") ?? []);
        this.requireMention = config?.requireMention ?? true;
    }
    async start() {
        if (!this.botToken) {
            throw new Error("DISCORD_BOT_TOKEN not set");
        }
        // Get gateway URL
        const gatewayRes = await fetch("https://discord.com/api/v10/gateway/bot", {
            headers: { Authorization: `Bot ${this.botToken}` },
        });
        const gatewayData = await gatewayRes.json();
        const wsUrl = gatewayData.url + "?v=10&encoding=json";
        this.ws = new WebSocket(wsUrl);
        this.ws.onmessage = (event) => {
            const payload = JSON.parse(event.data);
            this.handleDiscordEvent(payload);
        };
        this.ws.onclose = () => {
            this.markDisconnected();
        };
        // Wait for ready
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Discord connection timeout")), 15000);
            const checkReady = setInterval(() => {
                if (this.connected) {
                    clearTimeout(timeout);
                    clearInterval(checkReady);
                    resolve();
                }
            }, 100);
        });
    }
    async stop() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.markDisconnected();
    }
    async send(channelId, message, options) {
        const chunks = this.splitMessage(message, 2000); // Discord has 2000 char limit
        for (const chunk of chunks) {
            const payload = { content: chunk };
            if (options?.replyToId) {
                payload.message_reference = { message_id: options.replyToId };
            }
            await this.discordApi(`channels/${channelId}/messages`, "POST", payload);
            this.trackOutbound();
        }
    }
    handleDiscordEvent(payload) {
        const { op, t, d, s } = payload;
        // Update sequence number
        if (s !== null)
            this.sequenceNumber = s;
        switch (op) {
            case 10: // Hello
                this.startHeartbeat(d.heartbeat_interval);
                this.identify();
                break;
            case 11: // Heartbeat ACK
                break;
            case 0: // Dispatch
                this.handleDispatch(t, d);
                break;
        }
    }
    startHeartbeat(intervalMs) {
        if (this.heartbeatInterval)
            clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => {
            this.ws?.send(JSON.stringify({ op: 1, d: this.sequenceNumber }));
        }, intervalMs);
    }
    identify() {
        this.ws?.send(JSON.stringify({
            op: 2,
            d: {
                token: this.botToken,
                intents: 1536, // GuildMessages + MessageContent
                properties: { os: "linux", browser: "tekton", device: "tekton" },
            },
        }));
    }
    handleDispatch(eventType, data) {
        if (eventType === "READY") {
            this.sessionId = data.session_id;
            this.markConnected();
        }
        if (eventType === "MESSAGE_CREATE" && data.content) {
            // Check user allowlist
            if (this.allowedUsers.length > 0 && !this.allowedUsers.includes(data.author?.id))
                return;
            // Check mention requirement
            if (this.requireMention && !data.mentions?.length)
                return;
            // Strip bot mention from content
            let text = data.content;
            const mentionRegex = /<@\d+>/g;
            text = text.replace(mentionRegex, "").trim();
            if (!text)
                return;
            this.emitMessage({
                platform: "discord",
                userId: data.author?.id ?? "unknown",
                channelId: data.channel_id,
                text,
                userName: data.author?.username,
                replyToId: data.referenced_message?.id,
                metadata: {
                    guildId: data.guild_id,
                    messageId: data.id,
                },
            });
        }
    }
    async discordApi(endpoint, method, body) {
        const res = await fetch(`https://discord.com/api/v10/${endpoint}`, {
            method,
            headers: {
                Authorization: `Bot ${this.botToken}`,
                "Content-Type": "application/json",
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        return res.json();
    }
}
//# sourceMappingURL=discord.js.map
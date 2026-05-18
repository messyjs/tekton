/**
 * Slack Adapter — Full implementation using Slack Web API and Socket Mode.
 * Uses environment variables SLACK_BOT_TOKEN, SLACK_APP_TOKEN.
 */
import { BaseAdapter } from "../base-adapter.js";
export class SlackAdapter extends BaseAdapter {
    name = "slack";
    botToken;
    appToken;
    allowedUsers;
    ws = null;
    constructor(config) {
        super();
        this.botToken = config?.botToken ?? process.env.SLACK_BOT_TOKEN ?? "";
        this.appToken = config?.appToken ?? process.env.SLACK_APP_TOKEN ?? "";
        this.allowedUsers = config?.allowedUsers ?? [];
    }
    async start() {
        if (!this.botToken) {
            throw new Error("SLACK_BOT_TOKEN not set");
        }
        // Verify auth
        const authRes = await this.slackApi("auth.test");
        if (!authRes.ok) {
            throw new Error(`Slack auth failed: ${authRes.error}`);
        }
        // If app token provided, connect via Socket Mode
        if (this.appToken) {
            await this.connectSocketMode();
        }
        this.markConnected();
    }
    async stop() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.markDisconnected();
    }
    async send(channel, message, options) {
        const chunks = this.splitMessage(message, 40000); // Slack allows longer messages
        for (const chunk of chunks) {
            const payload = {
                channel,
                text: chunk,
            };
            if (options?.replyToId) {
                payload.thread_ts = options.replyToId;
            }
            if (options?.parseMode === "markdown") {
                payload.blocks = [{ type: "section", text: { type: "mrkdwn", text: chunk } }];
            }
            const res = await this.slackApi("chat.postMessage", "POST", payload);
            if (res.ok)
                this.trackOutbound();
        }
    }
    async connectSocketMode() {
        // Connect to Slack's Socket Mode WebSocket
        const res = await fetch("https://slack.com/api/apps.connections.open", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.appToken}`,
                "Content-Type": "application/json",
            },
        });
        const data = await res.json();
        if (!data.ok)
            return;
        const wsUrl = data.url;
        this.ws = new WebSocket(wsUrl);
        this.ws.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                if (payload.type === "events_api") {
                    const evt = payload.payload?.event;
                    if (evt?.type === "message" && evt.text && !evt.bot_id) {
                        if (this.allowedUsers.length > 0 && !this.allowedUsers.includes(evt.user))
                            return;
                        this.emitMessage({
                            platform: "slack",
                            userId: evt.user ?? "unknown",
                            channelId: evt.channel,
                            text: evt.text,
                            userName: evt.username,
                            replyToId: evt.thread_ts,
                            metadata: { ts: evt.ts, team: evt.team },
                        });
                    }
                    // ACK the event
                    if (payload.envelope_id) {
                        this.ws?.send(JSON.stringify({ envelope_id: payload.envelope_id }));
                    }
                }
            }
            catch {
                // Ignore malformed messages
            }
        };
    }
    async slackApi(endpoint, method = "POST", body) {
        const res = await fetch(`https://slack.com/api/${endpoint}`, {
            method,
            headers: {
                Authorization: `Bearer ${this.botToken}`,
                "Content-Type": "application/json",
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        return res.json();
    }
}
//# sourceMappingURL=slack.js.map
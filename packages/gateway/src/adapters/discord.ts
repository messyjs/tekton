/**
 * Discord Adapter — Full implementation using discord.js-style API.
 * Uses environment variables DISCORD_BOT_TOKEN, DISCORD_ALLOWED_USERS.
 */
import { BaseAdapter } from "../base-adapter.js";
import type { SendOptions } from "../types.js";

export class DiscordAdapter extends BaseAdapter {
  readonly name = "discord" as const;
  private botToken: string;
  private allowedUsers: string[];
  private requireMention: boolean;
  private ws: WebSocket | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private sessionId: string | null = null;
  private sequenceNumber: number | null = null;

  constructor(config?: { botToken?: string; allowedUsers?: string[]; requireMention?: boolean }) {
    super();
    this.botToken = config?.botToken ?? process.env.DISCORD_BOT_TOKEN ?? "";
    this.allowedUsers = config?.allowedUsers ?? (process.env.DISCORD_ALLOWED_USERS?.split(",") ?? []);
    this.requireMention = config?.requireMention ?? true;
  }

  async start(): Promise<void> {
    if (!this.botToken) {
      throw new Error("DISCORD_BOT_TOKEN not set");
    }

    // Get gateway URL
    const gatewayRes = await fetch("https://discord.com/api/v10/gateway/bot", {
      headers: { Authorization: `Bot ${this.botToken}` },
    });
    const gatewayData = await gatewayRes.json() as any;
    const wsUrl = gatewayData.url + "?v=10&encoding=json";

    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      const payload = JSON.parse(event.data as string);
      this.handleDiscordEvent(payload);
    };

    this.ws.onclose = () => {
      this.markDisconnected();
    };

    // Wait for ready
    await new Promise<void>((resolve, reject) => {
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

  async stop(): Promise<void> {
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

  async send(channelId: string, message: string, options?: SendOptions): Promise<void> {
    const chunks = this.splitMessage(message, 2000); // Discord has 2000 char limit
    for (const chunk of chunks) {
      const payload: Record<string, unknown> = { content: chunk };
      if (options?.replyToId) {
        payload.message_reference = { message_id: options.replyToId };
      }
      await this.discordApi(`channels/${channelId}/messages`, "POST", payload);
      this.trackOutbound();
    }
  }

  private handleDiscordEvent(payload: any): void {
    const { op, t, d, s } = payload;

    // Update sequence number
    if (s !== null) this.sequenceNumber = s;

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

  private startHeartbeat(intervalMs: number): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      this.ws?.send(JSON.stringify({ op: 1, d: this.sequenceNumber }));
    }, intervalMs);
  }

  private identify(): void {
    this.ws?.send(
      JSON.stringify({
        op: 2,
        d: {
          token: this.botToken,
          intents: 1536, // GuildMessages + MessageContent
          properties: { os: "linux", browser: "tekton", device: "tekton" },
        },
      })
    );
  }

  private handleDispatch(eventType: string, data: any): void {
    if (eventType === "READY") {
      this.sessionId = data.session_id;
      this.markConnected();
    }

    if (eventType === "MESSAGE_CREATE" && data.content) {
      // Check user allowlist
      if (this.allowedUsers.length > 0 && !this.allowedUsers.includes(data.author?.id)) return;

      // Check mention requirement
      if (this.requireMention && !data.mentions?.length) return;

      // Strip bot mention from content
      let text = data.content;
      const mentionRegex = /<@\d+>/g;
      text = text.replace(mentionRegex, "").trim();

      if (!text) return;

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

  private async discordApi(endpoint: string, method: string, body?: unknown): Promise<any> {
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
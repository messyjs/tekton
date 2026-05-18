/**
 * Discord Adapter — Full implementation using discord.js-style API.
 * Uses environment variables DISCORD_BOT_TOKEN, DISCORD_ALLOWED_USERS.
 */
import { BaseAdapter } from "../base-adapter.js";
import type { SendOptions } from "../types.js";
export declare class DiscordAdapter extends BaseAdapter {
    readonly name: "discord";
    private botToken;
    private allowedUsers;
    private requireMention;
    private ws;
    private heartbeatInterval;
    private sessionId;
    private sequenceNumber;
    constructor(config?: {
        botToken?: string;
        allowedUsers?: string[];
        requireMention?: boolean;
    });
    start(): Promise<void>;
    stop(): Promise<void>;
    send(channelId: string, message: string, options?: SendOptions): Promise<void>;
    private handleDiscordEvent;
    private startHeartbeat;
    private identify;
    private handleDispatch;
    private discordApi;
}
//# sourceMappingURL=discord.d.ts.map
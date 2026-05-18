/**
 * Slack Adapter — Full implementation using Slack Web API and Socket Mode.
 * Uses environment variables SLACK_BOT_TOKEN, SLACK_APP_TOKEN.
 */
import { BaseAdapter } from "../base-adapter.js";
import type { SendOptions } from "../types.js";
export declare class SlackAdapter extends BaseAdapter {
    readonly name: "slack";
    private botToken;
    private appToken;
    private allowedUsers;
    private ws;
    constructor(config?: {
        botToken?: string;
        appToken?: string;
        allowedUsers?: string[];
    });
    start(): Promise<void>;
    stop(): Promise<void>;
    send(channel: string, message: string, options?: SendOptions): Promise<void>;
    private connectSocketMode;
    private slackApi;
}
//# sourceMappingURL=slack.d.ts.map
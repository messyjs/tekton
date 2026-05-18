import { BaseAdapter } from "../base-adapter.js";
import type { SendOptions } from "../types.js";
export interface WebhookConfig {
    port?: number;
    secret?: string;
    path?: string;
}
export declare class WebhookAdapter extends BaseAdapter {
    readonly name: "webhook";
    private port;
    private secret;
    private path;
    private server;
    private pendingResponses;
    constructor(config?: WebhookConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    send(target: string, message: string, options?: SendOptions): Promise<void>;
    private handleRequest;
    /** Reply to a pending webhook request directly */
    replyToPending(eventId: string, message: string): boolean;
    getPort(): number;
}
//# sourceMappingURL=webhook.d.ts.map
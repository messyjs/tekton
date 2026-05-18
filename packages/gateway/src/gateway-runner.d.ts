import type { PlatformAdapter } from "./adapter.js";
import { SessionStore } from "./session/store.js";
import { RateLimiter } from "./rate-limiter.js";
import type { GatewayConfig, GatewayStatus, GatewaySession, MessageEvent, DeliveryTarget, PlatformName } from "./types.js";
export declare class GatewayRunner {
    readonly config: GatewayConfig;
    readonly adapters: Map<PlatformName, PlatformAdapter>;
    readonly sessions: SessionStore;
    readonly rateLimiter: RateLimiter;
    private started;
    private startTime;
    private totalMessagesIn;
    private totalMessagesOut;
    private messageHandler;
    private cleanupInterval;
    constructor(config?: Partial<GatewayConfig>);
    /** Register a message handler — called when any user sends a non-command message */
    onMessage(handler: (event: MessageEvent, session: GatewaySession) => Promise<string>): void;
    /** Start all configured platform adapters */
    start(): Promise<void>;
    /** Stop all adapters */
    stop(): Promise<void>;
    /** Handle incoming message from any platform */
    handleIncomingMessage(event: MessageEvent): Promise<void>;
    /** Deliver a response to a platform */
    deliverResponse(target: DeliveryTarget, response: string): Promise<void>;
    /** Get gateway status */
    getStatus(): GatewayStatus;
    /** Get a human-readable status summary */
    getStatusSummary(): string;
    /** Set up adapters from config */
    private setupAdapters;
}
//# sourceMappingURL=gateway-runner.d.ts.map
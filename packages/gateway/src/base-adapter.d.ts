import type { PlatformAdapter } from "./adapter.js";
import type { MessageEvent, PlatformName, PlatformStatus, SendOptions } from "./types.js";
export declare abstract class BaseAdapter implements PlatformAdapter {
    abstract readonly name: PlatformName;
    protected connected: boolean;
    protected startTime: number | null;
    protected messagesIn: number;
    protected messagesOut: number;
    protected errors: number;
    protected lastError: string | null;
    protected lastActivity: number | null;
    protected messageHandler: ((event: MessageEvent) => Promise<void>) | null;
    private maxMessageLength;
    abstract start(): Promise<void>;
    abstract stop(): Promise<void>;
    abstract send(target: string, message: string, options?: SendOptions): Promise<void>;
    isConnected(): boolean;
    onMessage(handler: (event: MessageEvent) => Promise<void>): void;
    /** Emit a message event to the registered handler */
    protected emitMessage(event: Omit<MessageEvent, "id" | "timestamp" | "isCommand">): void;
    /** Split a long message into chunks */
    protected splitMessage(message: string, maxLength?: number): string[];
    /** Track an outgoing message */
    protected trackOutbound(): void;
    /** Track an error */
    protected trackError(err: unknown): void;
    /** Get platform status */
    getStatus(): PlatformStatus;
    /** Mark adapter as connected */
    protected markConnected(): void;
    /** Mark adapter as disconnected */
    protected markDisconnected(): void;
}
//# sourceMappingURL=base-adapter.d.ts.map
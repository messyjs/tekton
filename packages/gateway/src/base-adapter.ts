/**
 * Base Adapter — Shared logic for all platform adapters (rate limiting, message splitting, error tracking).
 */
import { randomUUID } from "node:crypto";
import type { PlatformAdapter } from "./adapter.js";
import type {
  MessageEvent,
  PlatformName,
  PlatformStatus,
  SendOptions,
} from "./types.js";

export abstract class BaseAdapter implements PlatformAdapter {
  abstract readonly name: PlatformName;

  protected connected = false;
  protected startTime: number | null = null;
  protected messagesIn = 0;
  protected messagesOut = 0;
  protected errors = 0;
  protected lastError: string | null = null;
  protected lastActivity: number | null = null;
  protected messageHandler: ((event: MessageEvent) => Promise<void>) | null = null;
  private maxMessageLength = 4096;

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract send(target: string, message: string, options?: SendOptions): Promise<void>;

  isConnected(): boolean {
    return this.connected;
  }

  onMessage(handler: (event: MessageEvent) => Promise<void>): void {
    this.messageHandler = handler;
  }

  /** Emit a message event to the registered handler */
  protected emitMessage(event: Omit<MessageEvent, "id" | "timestamp" | "isCommand">): void {
    if (!this.messageHandler) return;
    const fullEvent: MessageEvent = {
      id: randomUUID(),
      timestamp: Date.now(),
      isCommand: event.text.startsWith("/"),
      ...event,
    };
    this.messagesIn++;
    this.lastActivity = Date.now();
    this.messageHandler(fullEvent).catch((err) => {
      this.errors++;
      this.lastError = String(err?.message ?? err);
    });
  }

  /** Split a long message into chunks */
  protected splitMessage(message: string, maxLength?: number): string[] {
    const limit = maxLength ?? this.maxMessageLength;
    if (message.length <= limit) return [message];

    const chunks: string[] = [];
    let remaining = message;
    while (remaining.length > 0) {
      if (remaining.length <= limit) {
        chunks.push(remaining);
        break;
      }
      // Try to split at last newline within limit
      let splitAt = remaining.lastIndexOf("\n", limit);
      if (splitAt === -1 || splitAt < limit * 0.5) {
        // Try to split at last space
        splitAt = remaining.lastIndexOf(" ", limit);
      }
      if (splitAt === -1 || splitAt < limit * 0.5) {
        // Hard split
        splitAt = limit;
      }
      chunks.push(remaining.slice(0, splitAt));
      remaining = remaining.slice(splitAt);
      if (remaining.startsWith("\n") || remaining.startsWith(" ")) {
        remaining = remaining.slice(1);
      }
    }
    return chunks;
  }

  /** Track an outgoing message */
  protected trackOutbound(): void {
    this.messagesOut++;
    this.lastActivity = Date.now();
  }

  /** Track an error */
  protected trackError(err: unknown): void {
    this.errors++;
    this.lastError = String(err instanceof Error ? err.message : err);
  }

  /** Get platform status */
  getStatus(): PlatformStatus {
    return {
      name: this.name,
      connected: this.connected,
      startTime: this.startTime,
      messagesIn: this.messagesIn,
      messagesOut: this.messagesOut,
      errors: this.errors,
      lastError: this.lastError,
      lastActivity: this.lastActivity,
    };
  }

  /** Mark adapter as connected */
  protected markConnected(): void {
    this.connected = true;
    this.startTime = Date.now();
  }

  /** Mark adapter as disconnected */
  protected markDisconnected(): void {
    this.connected = false;
  }
}
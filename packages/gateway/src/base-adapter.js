/**
 * Base Adapter — Shared logic for all platform adapters (rate limiting, message splitting, error tracking).
 */
import { randomUUID } from "node:crypto";
export class BaseAdapter {
    connected = false;
    startTime = null;
    messagesIn = 0;
    messagesOut = 0;
    errors = 0;
    lastError = null;
    lastActivity = null;
    messageHandler = null;
    maxMessageLength = 4096;
    isConnected() {
        return this.connected;
    }
    onMessage(handler) {
        this.messageHandler = handler;
    }
    /** Emit a message event to the registered handler */
    emitMessage(event) {
        if (!this.messageHandler)
            return;
        const fullEvent = {
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
    splitMessage(message, maxLength) {
        const limit = maxLength ?? this.maxMessageLength;
        if (message.length <= limit)
            return [message];
        const chunks = [];
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
    trackOutbound() {
        this.messagesOut++;
        this.lastActivity = Date.now();
    }
    /** Track an error */
    trackError(err) {
        this.errors++;
        this.lastError = String(err instanceof Error ? err.message : err);
    }
    /** Get platform status */
    getStatus() {
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
    markConnected() {
        this.connected = true;
        this.startTime = Date.now();
    }
    /** Mark adapter as disconnected */
    markDisconnected() {
        this.connected = false;
    }
}
//# sourceMappingURL=base-adapter.js.map
/**
 * Telegram Adapter — Full implementation using telegraf-style API.
 * Uses environment variable TELEGRAM_BOT_TOKEN.
 */
import { BaseAdapter } from "../base-adapter.js";
import type { SendOptions } from "../types.js";
export declare class TelegramAdapter extends BaseAdapter {
    readonly name: "telegram";
    private botToken;
    private pollingInterval;
    private offset;
    constructor(botToken?: string);
    start(): Promise<void>;
    stop(): Promise<void>;
    send(chatId: string, message: string, options?: SendOptions): Promise<void>;
    private poll;
    private apiCall;
}
//# sourceMappingURL=telegram.d.ts.map
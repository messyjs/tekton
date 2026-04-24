/**
 * Telegram Adapter — Full implementation using telegraf-style API.
 * Uses environment variable TELEGRAM_BOT_TOKEN.
 */
import { BaseAdapter } from "../base-adapter.js";
import type { SendOptions } from "../types.js";

export class TelegramAdapter extends BaseAdapter {
  readonly name = "telegram" as const;
  private botToken: string;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private offset = 0;

  constructor(botToken?: string) {
    super();
    this.botToken = botToken ?? process.env.TELEGRAM_BOT_TOKEN ?? "";
  }

  async start(): Promise<void> {
    if (!this.botToken) {
      throw new Error("TELEGRAM_BOT_TOKEN not set");
    }
    // Verify bot token by calling getMe
    const me = await this.apiCall("getMe");
    if (!me.ok) {
      throw new Error(`Telegram getMe failed: ${me.description}`);
    }
    this.markConnected();
    // Start polling
    this.poll();
  }

  async stop(): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.markDisconnected();
  }

  async send(chatId: string, message: string, options?: SendOptions): Promise<void> {
    const chunks = options?.split !== false ? this.splitMessage(message) : [message];
    for (const chunk of chunks) {
      const parseMode = options?.parseMode === "html" ? "HTML" : options?.parseMode === "markdown" ? "MarkdownV2" : undefined;
      const payload: Record<string, unknown> = {
        chat_id: chatId,
        text: chunk,
        disable_notification: options?.silent ?? false,
      };
      if (parseMode) payload.parse_mode = parseMode;
      if (options?.replyToId) payload.reply_to_message_id = Number(options.replyToId);

      await this.apiCall("sendMessage", payload);
      this.trackOutbound();
    }
  }

  private poll(): void {
    this.pollingInterval = setInterval(async () => {
      try {
        const updates = await this.apiCall("getUpdates", {
          offset: this.offset,
          timeout: 10,
          limit: 50,
        });
        if (!updates.ok || !Array.isArray(updates.result)) return;
        for (const update of updates.result) {
          this.offset = update.update_id + 1;
          if (update.message?.text) {
            this.emitMessage({
              platform: "telegram",
              userId: String(update.message.from.id),
              channelId: String(update.message.chat.id),
              text: update.message.text,
              userName: update.message.from.username ?? update.message.from.first_name,
              replyToId: update.message.reply_to_message
                ? String(update.message.reply_to_message.message_id)
                : undefined,
              metadata: {
                messageId: update.message.message_id,
                chatType: update.message.chat.type,
              },
            });
          }
        }
      } catch {
        // Polling error — will retry
      }
    }, 3000);
  }

  private async apiCall(method: string, params?: Record<string, unknown>): Promise<any> {
    const url = `https://api.telegram.org/bot${this.botToken}/${method}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: params ? JSON.stringify(params) : undefined,
    });
    return res.json();
  }
}
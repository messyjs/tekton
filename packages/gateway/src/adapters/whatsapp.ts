/**
 * WhatsApp Adapter — Stub. Uses whatsapp-web.js when fully implemented.
 */
import { BaseAdapter } from "../base-adapter.js";
import type { SendOptions } from "../types.js";

export class WhatsAppAdapter extends BaseAdapter {
  readonly name = "whatsapp" as const;

  async start(): Promise<void> {
    // TODO: Initialize whatsapp-web.js client
    this.markConnected();
  }

  async stop(): Promise<void> {
    this.markDisconnected();
  }

  async send(target: string, message: string, options?: SendOptions): Promise<void> {
    // TODO: Implement WhatsApp send
    this.trackOutbound();
  }
}
/**
 * SMS Adapter — Stub. Uses Twilio when fully implemented.
 */
import { BaseAdapter } from "../base-adapter.js";
import type { SendOptions } from "../types.js";

export class SMSAdapter extends BaseAdapter {
  readonly name = "sms" as const;

  async start(): Promise<void> {
    // TODO: Initialize Twilio client
    this.markConnected();
  }

  async stop(): Promise<void> {
    this.markDisconnected();
  }

  async send(target: string, message: string, options?: SendOptions): Promise<void> {
    // TODO: Implement SMS send via Twilio
    this.trackOutbound();
  }
}
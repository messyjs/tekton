/**
 * Email Adapter — Stub. Uses nodemailer + IMAP when fully implemented.
 */
import { BaseAdapter } from "../base-adapter.js";
import type { SendOptions } from "../types.js";

export class EmailAdapter extends BaseAdapter {
  readonly name = "email" as const;

  async start(): Promise<void> {
    // TODO: Initialize nodemailer transport + IMAP watcher
    this.markConnected();
  }

  async stop(): Promise<void> {
    this.markDisconnected();
  }

  async send(target: string, message: string, options?: SendOptions): Promise<void> {
    // TODO: Implement email send via nodemailer
    this.trackOutbound();
  }
}
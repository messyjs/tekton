/**
 * Signal Adapter — Stub. Uses signal-cli when fully implemented.
 */
import { BaseAdapter } from "../base-adapter.js";
import type { SendOptions } from "../types.js";

export class SignalAdapter extends BaseAdapter {
  readonly name = "signal" as const;

  async start(): Promise<void> {
    // TODO: Initialize signal-cli wrapper
    this.markConnected();
  }

  async stop(): Promise<void> {
    this.markDisconnected();
  }

  async send(target: string, message: string, options?: SendOptions): Promise<void> {
    // TODO: Implement Signal send
    this.trackOutbound();
  }
}
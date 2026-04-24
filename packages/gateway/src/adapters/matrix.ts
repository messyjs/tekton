/**
 * Matrix Adapter — Stub. Uses matrix-js-sdk when fully implemented.
 */
import { BaseAdapter } from "../base-adapter.js";
import type { SendOptions } from "../types.js";

export class MatrixAdapter extends BaseAdapter {
  readonly name = "matrix" as const;

  async start(): Promise<void> {
    // TODO: Initialize matrix-js-sdk client
    this.markConnected();
  }

  async stop(): Promise<void> {
    this.markDisconnected();
  }

  async send(target: string, message: string, options?: SendOptions): Promise<void> {
    // TODO: Implement Matrix send
    this.trackOutbound();
  }
}
/**
 * Platform Adapter Interface — Every messaging platform adapter must implement this.
 */
import type { MessageEvent, DeliveryTarget, SendOptions, PlatformName } from "./types.js";

export interface PlatformAdapter {
  /** Adapter name (must match PlatformName) */
  readonly name: PlatformName;

  /** Start the adapter — connect to platform, begin listening */
  start(): Promise<void>;

  /** Stop the adapter — disconnect, cleanup */
  stop(): Promise<void>;

  /** Register a handler for incoming messages */
  onMessage(handler: (event: MessageEvent) => Promise<void>): void;

  /** Send a message to a target */
  send(target: string, message: string, options?: SendOptions): Promise<void>;

  /** Check if adapter is connected */
  isConnected(): boolean;
}
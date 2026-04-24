// Gateway Package — Main Entry
export { GatewayRunner } from "./gateway-runner.js";
export { SessionStore } from "./session/store.js";
export { RateLimiter } from "./rate-limiter.js";
export { BaseAdapter } from "./base-adapter.js";
export type { PlatformAdapter } from "./adapter.js";
export { parseCommand, executeCommand, registerBuiltinCommands, registerCommand, getCommandNames } from "./commands/slash-commands.js";
export type { CommandContext, CommandResult } from "./commands/slash-commands.js";

export {
  TelegramAdapter,
  DiscordAdapter,
  SlackAdapter,
  WhatsAppAdapter,
  SignalAdapter,
  MatrixAdapter,
  EmailAdapter,
  SMSAdapter,
  WebhookAdapter,
  ApiServerAdapter,
} from "./adapters/index.js";

export type {
  GatewayConfig,
  GatewayStatus,
  GatewaySession,
  MessageEvent,
  DeliveryTarget,
  SendOptions,
  PlatformName,
  PlatformConfig,
  SlashCommand,
  Attachment,
  ReplyButton,
  PlatformStatus,
  SessionKey,
} from "./types.js";

export { DEFAULT_GATEWAY_CONFIG } from "./types.js";
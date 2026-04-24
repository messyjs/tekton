/**
 * Gateway Types — Platform adapters, message events, delivery targets, session routing.
 */

export type PlatformName =
  | "telegram"
  | "discord"
  | "slack"
  | "whatsapp"
  | "signal"
  | "matrix"
  | "email"
  | "sms"
  | "webhook"
  | "api-server";

export interface PlatformConfig {
  enabled: boolean;
  /** Empty array = allow all users */
  allowedUsers?: string[];
  requireMention?: boolean;
  /** Adapter-specific config */
  [key: string]: unknown;
}

export interface GatewayConfig {
  platforms: Partial<Record<PlatformName, PlatformConfig>>;
  /** Gateway data directory (defaults to ~/.tekton/gateway) */
  dataDir?: string;
  /** Default platform for outgoing messages */
  defaultPlatform?: PlatformName;
  /** Max message length before splitting */
  maxMessageLength?: number;
  /** Rate limit: messages per user per minute */
  rateLimitPerMinute?: number;
}

export interface MessageEvent {
  /** Unique event ID */
  id: string;
  /** Source platform */
  platform: PlatformName;
  /** Platform-specific user ID */
  userId: string;
  /** Platform-specific channel/group ID */
  channelId: string;
  /** Raw text from user */
  text: string;
  /** Display name of the sender */
  userName?: string;
  /** Timestamp */
  timestamp: number;
  /** Is this a command (starts with /) */
  isCommand: boolean;
  /** Reply-to message ID if replying */
  replyToId?: string;
  /** Platform-specific metadata */
  metadata?: Record<string, unknown>;
}

export interface DeliveryTarget {
  platform: PlatformName;
  /** User or channel ID on the target platform */
  targetId: string;
  /** Reply-to message ID */
  replyToId?: string;
  /** Thread/channel override */
  threadId?: string;
}

export interface SendOptions {
  /** Parse mode (markdown, html, plain) */
  parseMode?: "markdown" | "html" | "plain";
  /** Split long messages automatically */
  split?: boolean;
  /** Silent notification */
  silent?: boolean;
  /** Reply-to message ID on the platform */
  replyToId?: string;
  /** Attachments */
  attachments?: Attachment[];
  /** Reply keyboard or buttons */
  buttons?: ReplyButton[][];
}

export interface Attachment {
  type: "image" | "file" | "audio" | "video";
  url?: string;
  data?: Buffer;
  filename?: string;
  mimeType?: string;
}

export interface ReplyButton {
  text: string;
  callbackData?: string;
  url?: string;
}

export interface GatewayStatus {
  running: boolean;
  platforms: Record<string, PlatformStatus>;
  totalMessagesIn: number;
  totalMessagesOut: number;
  uptimeMs: number;
}

export interface PlatformStatus {
  name: PlatformName;
  connected: boolean;
  startTime: number | null;
  messagesIn: number;
  messagesOut: number;
  errors: number;
  lastError: string | null;
  lastActivity: number | null;
}

export interface SessionKey {
  platform: PlatformName;
  userId: string;
}

export interface GatewaySession {
  sessionKey: string;
  platform: PlatformName;
  userId: string;
  userName: string;
  createdAt: number;
  lastActivityAt: number;
  messageCount: number;
  currentModel: string | null;
  personalityId: string | null;
  voiceEnabled: boolean;
  skillsInstalled: string[];
  metadata: Record<string, unknown>;
}

export interface SlashCommand {
  name: string;
  description: string;
  handler: (args: string, event: MessageEvent) => Promise<string>;
}

export const DEFAULT_GATEWAY_CONFIG: GatewayConfig = {
  platforms: {
    telegram: { enabled: false },
    discord: { enabled: false },
    slack: { enabled: false },
    whatsapp: { enabled: false },
    signal: { enabled: false },
    matrix: { enabled: false },
    email: { enabled: false },
    sms: { enabled: false },
    webhook: { enabled: true, port: 7701 },
    "api-server": { enabled: true, port: 7700 },
  },
  dataDir: undefined,
  maxMessageLength: 4096,
  rateLimitPerMinute: 30,
};
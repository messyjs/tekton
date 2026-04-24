/**
 * Voice Types — STT, TTS, recording, and gateway voice configurations.
 */

// ── STT (Speech-to-Text) ────────────────────────────────────────────

export type STTProvider = "local" | "groq" | "openai";

export interface STTConfig {
  /** Provider: local (faster-whisper), groq, openai */
  provider: STTProvider;
  /** Local whisper model size: tiny, base, small, medium, large */
  local?: {
    model: "tiny" | "base" | "small" | "medium" | "large";
    device?: "cpu" | "cuda";
    language?: string;
  };
  /** Groq config */
  groq?: {
    apiKey?: string;
    model?: string;
    language?: string;
  };
  /** OpenAI config */
  openai?: {
    apiKey?: string;
    model?: string;
    language?: string;
  };
}

export interface STTResult {
  text: string;
  language: string | null;
  confidence: number;
  durationMs: number;
  segments?: STTSegment[];
  provider: STTProvider;
}

export interface STTSegment {
  start: number;
  end: number;
  text: string;
  confidence: number;
}

// ── TTS (Text-to-Speech) ────────────────────────────────────────────

export type TTSProvider = "edge" | "elevenlabs" | "openai" | "neutts";

export interface TTSConfig {
  /** Provider: edge (free), elevenlabs, openai, neutts */
  provider: TTSProvider;
  edge?: {
    voice: string;
    rate?: string;
    pitch?: string;
  };
  elevenlabs?: {
    apiKey?: string;
    voiceId?: string;
    modelId?: string;
  };
  openai?: {
    apiKey?: string;
    voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
    model?: string;
    speed?: number;
  };
  neutts?: {
    voice?: string;
    speed?: number;
  };
}

export interface TTSResult {
  audioPath: string;
  durationMs: number;
  provider: TTSProvider;
  voice: string;
  sizeBytes: number;
}

// ── Voice Mode ───────────────────────────────────────────────────────

export interface VoiceModeConfig {
  /** Whether voice input is enabled */
  enabled: boolean;
  /** Whether TTS auto-play is on */
  autoTTS: boolean;
  /** Key binding to start/stop recording */
  recordKey: string;
  /** Max recording duration in seconds */
  maxRecordingSeconds: number;
  /** Silence threshold (0-32767) */
  silenceThreshold: number;
  /** Silence duration in seconds before auto-stop */
  silenceDuration: number;
  /** STT fallback chain */
  sttFallbackChain: STTProvider[];
  /** Gateway voice: send voice bubbles on platforms */
  gatewayVoice: boolean;
  /** Discord: auto-join voice channel */
  discordAutoJoin: boolean;
}

export const DEFAULT_VOICE_CONFIG: VoiceModeConfig = {
  enabled: false,
  autoTTS: false,
  recordKey: "ctrl+b",
  maxRecordingSeconds: 120,
  silenceThreshold: 200,
  silenceDuration: 3.0,
  sttFallbackChain: ["local", "groq", "openai"],
  gatewayVoice: false,
  discordAutoJoin: false,
};

// ── Recording ────────────────────────────────────────────────────────

export type RecordingState = "idle" | "confirming" | "recording" | "processing";

export interface RecordingEvent {
  type: "start" | "silence-detected" | "speech-confirmed" | "stop" | "error" | "level";
  timestamp: number;
  /** Audio level (0-1) for level events */
  level?: number;
  /** Error message for error events */
  error?: string;
  /** Duration in ms for stop events */
  durationMs?: number;
}

// ── Gateway Voice ────────────────────────────────────────────────────

export interface VoiceMessage {
  platform: string;
  userId: string;
  channelId: string;
  audioData: Buffer;
  durationSeconds: number;
  format: "ogg" | "mp3" | "wav" | "webm";
}

// ── Whisper Hallucination Filter ─────────────────────────────────────

/** Known phantom phrases produced by Whisper hallucinations */
export const WHISPER_HALLUCINATIONS: string[] = [
  "Thank you for watching.",
  "Thank you for watching this video.",
  "Subscribe to my channel.",
  "Please subscribe.",
  "Like and subscribe.",
  "Thank you.",
  "Thanks for watching.",
  " Bye.",
  " By.",
  "Hello.",
  "Hello, welcome to the channel.",
  "Welcome to the channel.",
  "Welcome to the video.",
  "Okay.",
  "OK.",
  "Mm-hmm.",
  "Mm hmm.",
  "Uh-huh.",
  "Uh huh.",
  "Hmm.",
  "Huh.",
  "Yeah.",
  "You know.",
  "I'm sorry.",
  "I'm sorry, I'm sorry.",
  "So.",
  "",
  " ",
  "  ",
  "The.",
  "And.",
  "You.",
  "It.",
  "Is.",
  "This is a test.",
  "This is a recording.",
  "Testing, testing.",
  "Testing 1, 2, 3.",
  "Can you hear me?",
  "One, two, three.",
  " 1, 2, 3.",
  "Am I on?",
  "Is this on?",
  "Hello? Hello?",
  "Okay, okay.",
  "Right.",
  "Sure.",
  "Yeah, yeah.",
  "Mhm.",
];
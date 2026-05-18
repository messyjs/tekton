/**
 * Voice Types — STT, TTS, recording, and gateway voice configurations.
 */
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
export declare const DEFAULT_VOICE_CONFIG: VoiceModeConfig;
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
export interface VoiceMessage {
    platform: string;
    userId: string;
    channelId: string;
    audioData: Buffer;
    durationSeconds: number;
    format: "ogg" | "mp3" | "wav" | "webm";
}
/** Known phantom phrases produced by Whisper hallucinations */
export declare const WHISPER_HALLUCINATIONS: string[];
//# sourceMappingURL=types.d.ts.map
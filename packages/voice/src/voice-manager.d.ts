/**
 * Voice Manager — Top-level orchestrator for voice I/O.
 * Manages STT, TTS, recording state, and configuration.
 */
import type { VoiceModeConfig, STTConfig, TTSConfig, RecordingState, STTResult, TTSResult } from "./types.js";
import { STTManager } from "./stt/stt-manager.js";
import { TTSManager } from "./tts/tts-manager.js";
import { AudioRecorder } from "./audio/recorder.js";
import { GatewayVoiceHandler } from "./gateway-voice/handler.js";
export interface VoiceManagerConfig {
    voice?: Partial<VoiceModeConfig>;
    stt?: Partial<STTConfig>;
    tts?: Partial<TTSConfig>;
    outputDir?: string;
}
export declare class VoiceManager {
    readonly voiceConfig: VoiceModeConfig;
    readonly stt: STTManager;
    readonly tts: TTSManager;
    readonly recorder: AudioRecorder;
    readonly gatewayVoice: GatewayVoiceHandler;
    private state;
    constructor(config?: VoiceManagerConfig);
    /** Get current recording state */
    getState(): RecordingState;
    /** Enable voice mode */
    enable(): VoiceModeConfig;
    /** Disable voice mode */
    disable(): VoiceModeConfig;
    /** Toggle voice mode */
    toggle(): boolean;
    /** Toggle auto-TTS */
    toggleTTS(): boolean;
    /** Check if voice mode is enabled */
    isEnabled(): boolean;
    /** Check if auto-TTS is on */
    isAutoTTS(): boolean;
    /** Start recording */
    startRecording(): Promise<string>;
    /** Stop recording and transcribe */
    stopRecordingAndTranscribe(): Promise<STTResult>;
    /** Cancel recording */
    cancelRecording(): void;
    /** Transcribe an audio file */
    transcribe(audioPath: string, language?: string): Promise<STTResult>;
    /** Synthesize speech */
    speak(text: string, outputPath?: string, voice?: string): Promise<TTSResult>;
    /** Get status summary */
    getStatus(): string;
    /** Get config as JSON */
    getConfigJson(): Record<string, unknown>;
}
//# sourceMappingURL=voice-manager.d.ts.map
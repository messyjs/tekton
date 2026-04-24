/**
 * Voice Manager — Top-level orchestrator for voice I/O.
 * Manages STT, TTS, recording state, and configuration.
 */
import type { VoiceModeConfig, STTConfig, TTSConfig, RecordingState, STTResult, TTSResult } from "./types.js";
import { DEFAULT_VOICE_CONFIG } from "./types.js";
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

export class VoiceManager {
  readonly voiceConfig: VoiceModeConfig;
  readonly stt: STTManager;
  readonly tts: TTSManager;
  readonly recorder: AudioRecorder;
  readonly gatewayVoice: GatewayVoiceHandler;

  private state: RecordingState = "idle";

  constructor(config?: VoiceManagerConfig) {
    this.voiceConfig = { ...DEFAULT_VOICE_CONFIG, ...config?.voice };
    this.stt = new STTManager(config?.stt);
    this.tts = new TTSManager(config?.tts, config?.outputDir);
    this.recorder = new AudioRecorder({
      outputDir: config?.outputDir,
      silenceThreshold: this.voiceConfig.silenceThreshold,
      silenceDuration: this.voiceConfig.silenceDuration,
      maxDuration: this.voiceConfig.maxRecordingSeconds,
    });
    this.gatewayVoice = new GatewayVoiceHandler(this.stt, this.tts, {
      telegramVoice: this.voiceConfig.gatewayVoice,
      discordVoice: this.voiceConfig.gatewayVoice,
      discordAutoJoin: this.voiceConfig.discordAutoJoin,
    });

    // Forward recorder events
    this.recorder.onEvent((event) => {
      if (event.type === "start") {
        this.state = "confirming";
      } else if (event.type === "speech-confirmed") {
        this.state = "recording";
      } else if (event.type === "stop") {
        this.state = "idle";
      } else if (event.type === "error") {
        this.state = "idle";
      }
    });
  }

  /** Get current recording state */
  getState(): RecordingState {
    return this.state;
  }

  /** Enable voice mode */
  enable(): VoiceModeConfig {
    this.voiceConfig.enabled = true;
    return { ...this.voiceConfig };
  }

  /** Disable voice mode */
  disable(): VoiceModeConfig {
    this.voiceConfig.enabled = false;
    return { ...this.voiceConfig };
  }

  /** Toggle voice mode */
  toggle(): boolean {
    this.voiceConfig.enabled = !this.voiceConfig.enabled;
    return this.voiceConfig.enabled;
  }

  /** Toggle auto-TTS */
  toggleTTS(): boolean {
    this.voiceConfig.autoTTS = !this.voiceConfig.autoTTS;
    return this.voiceConfig.autoTTS;
  }

  /** Check if voice mode is enabled */
  isEnabled(): boolean {
    return this.voiceConfig.enabled;
  }

  /** Check if auto-TTS is on */
  isAutoTTS(): boolean {
    return this.voiceConfig.autoTTS;
  }

  /** Start recording */
  async startRecording(): Promise<string> {
    if (!this.voiceConfig.enabled) {
      throw new Error("Voice mode is not enabled. Use /tekton:voice on first.");
    }
    if (this.state !== "idle") {
      throw new Error(`Already recording in state: ${this.state}`);
    }
    this.state = "confirming";
    return this.recorder.start();
  }

  /** Stop recording and transcribe */
  async stopRecordingAndTranscribe(): Promise<STTResult> {
    const audioPath = await this.recorder.stop();
    this.state = "processing";
    try {
      const result = await this.stt.transcribe(audioPath);
      this.state = "idle";
      return result;
    } catch (err) {
      this.state = "idle";
      throw err;
    }
  }

  /** Cancel recording */
  cancelRecording(): void {
    this.recorder.cancel();
    this.state = "idle";
  }

  /** Transcribe an audio file */
  async transcribe(audioPath: string, language?: string): Promise<STTResult> {
    return this.stt.transcribe(audioPath, language);
  }

  /** Synthesize speech */
  async speak(text: string, outputPath?: string, voice?: string): Promise<TTSResult> {
    return this.tts.synthesize(text, outputPath, voice);
  }

  /** Get status summary */
  getStatus(): string {
    const enabled = this.voiceConfig.enabled ? "✓ enabled" : "✗ disabled";
    const autoTTS = this.voiceConfig.autoTTS ? "✓ on" : "✗ off";
    const state = this.state;
    const sttProvider = this.stt.config.provider;
    const ttsProvider = this.tts.config.provider;

    return [
      `🎙️ Voice Status`,
      `  Mode: ${enabled}`,
      `  Auto-TTS: ${autoTTS}`,
      `  State: ${state}`,
      `  STT: ${sttProvider}`,
      `  TTS: ${ttsProvider}`,
      `  Gateway voice: ${this.voiceConfig.gatewayVoice ? "✓" : "✗"}`,
      `  Record key: ${this.voiceConfig.recordKey}`,
    ].join("\n");
  }

  /** Get config as JSON */
  getConfigJson(): Record<string, unknown> {
    return {
      enabled: this.voiceConfig.enabled,
      autoTTS: this.voiceConfig.autoTTS,
      state: this.state,
      stt: this.stt.config,
      tts: this.tts.config,
      recordKey: this.voiceConfig.recordKey,
      maxRecordingSeconds: this.voiceConfig.maxRecordingSeconds,
      silenceThreshold: this.voiceConfig.silenceThreshold,
      silenceDuration: this.voiceConfig.silenceDuration,
      gatewayVoice: this.voiceConfig.gatewayVoice,
    };
  }
}
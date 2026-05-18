import { DEFAULT_VOICE_CONFIG } from "./types.js";
import { STTManager } from "./stt/stt-manager.js";
import { TTSManager } from "./tts/tts-manager.js";
import { AudioRecorder } from "./audio/recorder.js";
import { GatewayVoiceHandler } from "./gateway-voice/handler.js";
export class VoiceManager {
    voiceConfig;
    stt;
    tts;
    recorder;
    gatewayVoice;
    state = "idle";
    constructor(config) {
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
            }
            else if (event.type === "speech-confirmed") {
                this.state = "recording";
            }
            else if (event.type === "stop") {
                this.state = "idle";
            }
            else if (event.type === "error") {
                this.state = "idle";
            }
        });
    }
    /** Get current recording state */
    getState() {
        return this.state;
    }
    /** Enable voice mode */
    enable() {
        this.voiceConfig.enabled = true;
        return { ...this.voiceConfig };
    }
    /** Disable voice mode */
    disable() {
        this.voiceConfig.enabled = false;
        return { ...this.voiceConfig };
    }
    /** Toggle voice mode */
    toggle() {
        this.voiceConfig.enabled = !this.voiceConfig.enabled;
        return this.voiceConfig.enabled;
    }
    /** Toggle auto-TTS */
    toggleTTS() {
        this.voiceConfig.autoTTS = !this.voiceConfig.autoTTS;
        return this.voiceConfig.autoTTS;
    }
    /** Check if voice mode is enabled */
    isEnabled() {
        return this.voiceConfig.enabled;
    }
    /** Check if auto-TTS is on */
    isAutoTTS() {
        return this.voiceConfig.autoTTS;
    }
    /** Start recording */
    async startRecording() {
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
    async stopRecordingAndTranscribe() {
        const audioPath = await this.recorder.stop();
        this.state = "processing";
        try {
            const result = await this.stt.transcribe(audioPath);
            this.state = "idle";
            return result;
        }
        catch (err) {
            this.state = "idle";
            throw err;
        }
    }
    /** Cancel recording */
    cancelRecording() {
        this.recorder.cancel();
        this.state = "idle";
    }
    /** Transcribe an audio file */
    async transcribe(audioPath, language) {
        return this.stt.transcribe(audioPath, language);
    }
    /** Synthesize speech */
    async speak(text, outputPath, voice) {
        return this.tts.synthesize(text, outputPath, voice);
    }
    /** Get status summary */
    getStatus() {
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
    getConfigJson() {
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
//# sourceMappingURL=voice-manager.js.map
import type { TTSManager } from "../tts/tts-manager.js";
import type { STTManager } from "../stt/stt-manager.js";
import type { VoiceMessage } from "../types.js";
export interface GatewayVoiceConfig {
    /** Send voice bubbles on Telegram (OGG/Opus) */
    telegramVoice: boolean;
    /** Send voice messages on Discord */
    discordVoice: boolean;
    /** Auto-join Discord voice channels */
    discordAutoJoin: boolean;
    /** TTS voice name per platform */
    platformVoices?: Record<string, string>;
}
export declare class GatewayVoiceHandler {
    readonly config: GatewayVoiceConfig;
    private sttManager;
    private ttsManager;
    constructor(sttManager: STTManager, ttsManager?: TTSManager, config?: Partial<GatewayVoiceConfig>);
    /** Process an incoming voice message from a platform */
    handleVoiceMessage(message: VoiceMessage): Promise<string>;
    /** Generate a voice reply for a platform */
    generateVoiceReply(text: string, platform: string, channelId: string): Promise<{
        audioData: Buffer;
        format: string;
        durationSeconds: number;
    } | null>;
    /** Convert audio to WAV format for STT processing */
    private convertToWav;
    /** Convert TTS output to Telegram OGG/Opus format */
    private convertForTelegram;
}
//# sourceMappingURL=handler.d.ts.map
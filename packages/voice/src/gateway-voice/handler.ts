/**
 * Gateway Voice — Platform-specific voice message handling.
 * Converts between agent text/audio and platform voice formats.
 */
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
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

const DEFAULT_GATEWAY_VOICE_CONFIG: GatewayVoiceConfig = {
  telegramVoice: false,
  discordVoice: false,
  discordAutoJoin: false,
};

export class GatewayVoiceHandler {
  readonly config: GatewayVoiceConfig;
  private sttManager: STTManager;
  private ttsManager: TTSManager | null;

  constructor(sttManager: STTManager, ttsManager?: TTSManager, config?: Partial<GatewayVoiceConfig>) {
    this.config = { ...DEFAULT_GATEWAY_VOICE_CONFIG, ...config };
    this.sttManager = sttManager;
    this.ttsManager = ttsManager ?? null;
  }

  /** Process an incoming voice message from a platform */
  async handleVoiceMessage(message: VoiceMessage): Promise<string> {
    // Convert audio to WAV if needed (for STT)
    let audioPath: string;
    if (message.format === "wav") {
      // Save to temp file
      audioPath = join(tmpdir(), `voice-in-${randomUUID()}.wav`);
      writeFileSync(audioPath, message.audioData);
    } else {
      // Convert to WAV using ffmpeg
      audioPath = await this.convertToWav(message.audioData, message.format);
    }

    try {
      const result = await this.sttManager.transcribe(audioPath);
      return result.text;
    } finally {
      // Clean up
      if (existsSync(audioPath)) {
        try { unlinkSync(audioPath); } catch {}
      }
    }
  }

  /** Generate a voice reply for a platform */
  async generateVoiceReply(
    text: string,
    platform: string,
    channelId: string
  ): Promise<{ audioData: Buffer; format: string; durationSeconds: number } | null> {
    if (!this.ttsManager) return null;

    // Check if voice is enabled for this platform
    if (platform === "telegram" && !this.config.telegramVoice) return null;
    if (platform === "discord" && !this.config.discordVoice) return null;

    try {
      const voice = this.config.platformVoices?.[platform];
      const result = await this.ttsManager.synthesize(text, undefined, voice);

      // Convert to platform-specific format
      if (platform === "telegram") {
        // Telegram needs OGG/Opus
        return await this.convertForTelegram(result.audioPath);
      } else if (platform === "discord") {
        // Discord supports MP3
        const audioData = readFileSync(result.audioPath);
        return {
          audioData,
          format: "mp3",
          durationSeconds: result.durationMs / 1000,
        };
      }

      // Default: send as-is
      const audioData = readFileSync(result.audioPath);
      return {
        audioData,
        format: result.audioPath.endsWith(".mp3") ? "mp3" : "wav",
        durationSeconds: result.durationMs / 1000,
      };
    } catch (err) {
      console.error(`Voice reply generation failed: ${err}`);
      return null;
    }
  }

  /** Convert audio to WAV format for STT processing */
  private async convertToWav(audioData: Buffer, fromFormat: string): Promise<string> {
    const inputPath = join(tmpdir(), `voice-convert-${randomUUID()}.${fromFormat}`);
    const outputPath = join(tmpdir(), `voice-convert-${randomUUID()}.wav`);

    writeFileSync(inputPath, audioData);

    try {
      const { execFile } = await import("node:child_process");
      await new Promise<void>((resolve, reject) => {
        const args = ["-i", inputPath, "-ar", "16000", "-ac", "1", "-f", "s16le", outputPath];
        execFile("ffmpeg", args, { timeout: 10000 }, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      if (!existsSync(outputPath)) {
        // If ffmpeg not available, just use the original
        return inputPath;
      }

      // Clean up input
      try { unlinkSync(inputPath); } catch {}

      return outputPath;
    } catch {
      // ffmpeg not available, use original format
      writeFileSync(outputPath, audioData);
      try { unlinkSync(inputPath); } catch {}
      return outputPath;
    }
  }

  /** Convert TTS output to Telegram OGG/Opus format */
  private async convertForTelegram(audioPath: string): Promise<{ audioData: Buffer; format: string; durationSeconds: number }> {
    const outputPath = join(tmpdir(), `voice-telegram-${randomUUID()}.ogg`);

    try {
      const { execFile } = await import("node:child_process");
      await new Promise<void>((resolve, reject) => {
        const args = ["-i", audioPath, "-c:a", "libopus", "-b:a", "64k", outputPath];
        execFile("ffmpeg", args, { timeout: 10000 }, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      if (existsSync(outputPath)) {
        const audioData = readFileSync(outputPath);
        try { unlinkSync(outputPath); } catch {}
        return { audioData, format: "ogg", durationSeconds: audioData.length / 8000 }; // rough estimate
      }
    } catch {
      // ffmpeg not available, send as MP3
    }

    const audioData = readFileSync(audioPath);
    return { audioData, format: "mp3", durationSeconds: audioData.length / 16000 };
  }
}
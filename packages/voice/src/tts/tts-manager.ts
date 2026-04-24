/**
 * TTS Manager — Text-to-Speech with provider fallback.
 * Priority: edge (free) → elevenlabs → openai → neutts
 */
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import type { TTSConfig, TTSProvider, TTSResult } from "./../types.js";

export class TTSManager {
  readonly config: TTSConfig;
  private outputDir: string;
  private fallbackChain: TTSProvider[];

  constructor(config?: Partial<TTSConfig>, outputDir?: string) {
    this.config = {
      provider: config?.provider ?? "edge",
      edge: config?.edge ?? { voice: "en-US-AriaNeural" },
      elevenlabs: config?.elevenlabs ?? {},
      openai: config?.openai ?? {},
      neutts: config?.neutts ?? {},
    };
    this.outputDir = outputDir ?? join(tmpdir(), "tekton-tts");
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }

    // Build fallback chain
    const providers: TTSProvider[] = ["edge", "elevenlabs", "openai", "neutts"];
    const primary = this.config.provider;
    const remaining = providers.filter(p => p !== primary);
    this.fallbackChain = [primary, ...remaining];
  }

  /** Synthesize speech from text, trying providers in fallback order */
  async synthesize(text: string, outputPath?: string, voice?: string): Promise<TTSResult> {
    const errors: string[] = [];

    for (const provider of this.fallbackChain) {
      try {
        const result = await this.synthesizeWithProvider(provider, text, outputPath, voice);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${provider}: ${msg}`);
        continue;
      }
    }

    throw new Error(`All TTS providers failed: ${errors.join("; ")}`);
  }

  /** Synthesize with a specific provider */
  private async synthesizeWithProvider(provider: TTSProvider, text: string, outputPath?: string, voice?: string): Promise<TTSResult> {
    switch (provider) {
      case "edge": return this.synthesizeEdge(text, outputPath, voice);
      case "elevenlabs": return this.synthesizeElevenLabs(text, outputPath, voice);
      case "openai": return this.synthesizeOpenAI(text, outputPath, voice);
      case "neutts": return this.synthesizeNeuTTS(text, outputPath, voice);
    }
  }

  // ── Edge TTS ──────────────────────────────────────────────────────
  // Uses edge-tts Python package (free, 322 voices, 74 languages)

  private async synthesizeEdge(text: string, outputPath?: string, voice?: string): Promise<TTSResult> {
    const outPath = outputPath ?? join(this.outputDir, `tts-edge-${randomUUID()}.mp3`);
    const voiceName = voice ?? this.config.edge?.voice ?? "en-US-AriaNeural";
    const rate = this.config.edge?.rate ?? "";
    const pitch = this.config.edge?.pitch ?? "";

    const args: string[] = [
      "--voice", voiceName,
      "--text", text,
      "--write-media", outPath,
    ];
    if (rate) args.push("--rate", rate);
    if (pitch) args.push("--pitch", pitch);

    const startTime = Date.now();
    await this.execCommand("edge-tts", args);

    if (!existsSync(outPath)) {
      throw new Error("Edge TTS produced no output file");
    }

    const stats = await this.getFileStats(outPath);
    return {
      audioPath: outPath,
      durationMs: stats.size > 0 ? Math.round(stats.size / 16) : 0, // Rough estimate
      provider: "edge",
      voice: voiceName,
      sizeBytes: stats.size,
    };
  }

  // ── ElevenLabs ────────────────────────────────────────────────────

  private async synthesizeElevenLabs(text: string, outputPath?: string, voice?: string): Promise<TTSResult> {
    const apiKey = this.config.elevenlabs?.apiKey ?? process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");

    const outPath = outputPath ?? join(this.outputDir, `tts-11labs-${randomUUID()}.mp3`);
    const voiceId = voice ?? this.config.elevenlabs?.voiceId ?? "21m00Tcm4TlvDq8ikWAM"; // Rachel
    const modelId = this.config.elevenlabs?.modelId ?? "eleven_multilingual_v2";

    const startTime = Date.now();
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`ElevenLabs TTS error: ${res.status} ${error}`);
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(outPath, audioBuffer);

    return {
      audioPath: outPath,
      durationMs: Date.now() - startTime,
      provider: "elevenlabs",
      voice: voiceId,
      sizeBytes: audioBuffer.length,
    };
  }

  // ── OpenAI TTS ────────────────────────────────────────────────────

  private async synthesizeOpenAI(text: string, outputPath?: string, voice?: string): Promise<TTSResult> {
    const apiKey = this.config.openai?.apiKey ?? process.env.VOICE_TOOLS_OPENAI_KEY ?? process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");

    const outPath = outputPath ?? join(this.outputDir, `tts-openai-${randomUUID()}.mp3`);
    const voiceName = voice ?? this.config.openai?.voice ?? "alloy";
    const model = this.config.openai?.model ?? "tts-1";
    const speed = this.config.openai?.speed ?? 1.0;

    const startTime = Date.now();
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: text,
        voice: voiceName,
        speed,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`OpenAI TTS error: ${res.status} ${error}`);
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(outPath, audioBuffer);

    return {
      audioPath: outPath,
      durationMs: Date.now() - startTime,
      provider: "openai",
      voice: voiceName,
      sizeBytes: audioBuffer.length,
    };
  }

  // ── NeuTTS (espeak-ng) ────────────────────────────────────────────

  private async synthesizeNeuTTS(text: string, outputPath?: string, voice?: string): Promise<TTSResult> {
    const outPath = outputPath ?? join(this.outputDir, `tts-neutts-${randomUUID()}.wav`);
    const voiceName = voice ?? this.config.neutts?.voice ?? "default";

    const startTime = Date.now();
    // Use espeak-ng as fallback
    const args = ["-v", voiceName, "-w", outPath, text];

    try {
      await this.execCommand("espeak-ng", args);
    } catch {
      throw new Error("NeuTTS (espeak-ng) not available. Install with: apt install espeak-ng");
    }

    if (!existsSync(outPath)) {
      throw new Error("NeuTTS produced no output file");
    }

    const stats = await this.getFileStats(outPath);
    return {
      audioPath: outPath,
      durationMs: Date.now() - startTime,
      provider: "neutts",
      voice: voiceName,
      sizeBytes: stats.size,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private execCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(command, args, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command ${command} failed: ${error.message}`));
          return;
        }
        resolve(stdout + stderr);
      });
    });
  }

  private async getFileStats(filePath: string): Promise<{ size: number }> {
    const { statSync } = await import("node:fs");
    const stats = statSync(filePath);
    return { size: stats.size };
  }

  /** Get available voices for a provider */
  async getVoices(provider?: TTSProvider): Promise<string[]> {
    const p = provider ?? this.config.provider;

    switch (p) {
      case "edge": {
        try {
          const output = await this.execCommand("edge-tts", ["--list-voices"]);
          // Parse voice list
          const voices: string[] = [];
          for (const line of output.split("\n")) {
            const match = line.match(/\s+([a-zA-Z]{2}-[a-zA-Z]{2}-\w+Neural)\s+/);
            if (match) voices.push(match[1]);
          }
          return voices.length > 0 ? voices : ["en-US-AriaNeural"];
        } catch {
          return ["en-US-AriaNeural", "en-US-DavisNeural", "en-US-JennyNeural"];
        }
      }
      case "elevenlabs":
        return ["Rachel", "Drew", "Clyde", "Adam", "Bella", "Antoni", "Emily", "Josh"];
      case "openai":
        return ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
      case "neutts":
        return ["default", "male", "female"];
    }
  }
}
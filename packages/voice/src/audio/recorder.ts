/**
 * Audio Recorder — Records audio from microphone with silence detection.
 * Two-stage: (1) speech confirmation, (2) recording until silence.
 */
import { randomUUID } from "node:crypto";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile, spawn } from "node:child_process";
import type { RecordingState, RecordingEvent, VoiceModeConfig } from "../types.js";
import { DEFAULT_VOICE_CONFIG } from "../types.js";

export interface AudioRecorderConfig {
  outputDir?: string;
  sampleRate?: number;
  channels?: number;
  /** Silence threshold (0-32767) */
  silenceThreshold?: number;
  /** Silence duration in seconds before auto-stop */
  silenceDuration?: number;
  /** Max recording duration in seconds */
  maxDuration?: number;
}

type RecordingCallback = (event: RecordingEvent) => void;

export class AudioRecorder {
  readonly config: AudioRecorderConfig;
  private state: RecordingState = "idle";
  private process: any = null;
  private outputPath: string = "";
  private startTime: number = 0;
  private callback: RecordingCallback | null = null;
  private silenceStart: number = 0;
  private speechConfirmed = false;
  private outputDir: string;

  constructor(config?: AudioRecorderConfig) {
    this.config = {
      outputDir: config?.outputDir,
      sampleRate: config?.sampleRate ?? 16000,
      channels: config?.channels ?? 1,
      silenceThreshold: config?.silenceThreshold ?? 200,
      silenceDuration: config?.silenceDuration ?? 3.0,
      maxDuration: config?.maxDuration ?? 120,
    };
    this.outputDir = config?.outputDir ?? join(tmpdir(), "tekton-recordings");
    if (!existsSync(this.outputDir)) {
      // mkdirSync will be called lazily
    }
  }

  /** Get current recording state */
  getState(): RecordingState {
    return this.state;
  }

  /** Register event callback */
  onEvent(callback: RecordingCallback): void {
    this.callback = callback;
  }

  /** Start recording — enters "confirming" state, then "recording" on speech */
  async start(): Promise<string> {
    if (this.state !== "idle") {
      throw new Error(`Cannot start recording in state: ${this.state}`);
    }

    // Ensure output directory
    const { mkdirSync } = await import("node:fs");
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }

    this.outputPath = join(this.outputDir, `recording-${randomUUID()}.wav`);
    this.state = "confirming";
    this.speechConfirmed = false;
    this.silenceStart = 0;
    this.startTime = Date.now();

    this.emit({ type: "start", timestamp: Date.now() });

    // Try ffmpeg first, then sox, then arecord
    await this.startRecordingProcess();

    return this.outputPath;
  }

  /** Stop recording and return the file path */
  async stop(): Promise<string> {
    if (this.state === "idle") {
      throw new Error("Not recording");
    }

    const path = this.outputPath;
    const durationMs = Date.now() - this.startTime;

    this.state = "processing";
    this.emit({ type: "stop", timestamp: Date.now(), durationMs });

    // Kill the recording process
    if (this.process) {
      this.process.kill("SIGTERM");
      this.process = null;
    }

    this.state = "idle";
    return path;
  }

  /** Cancel recording without saving */
  cancel(): void {
    if (this.process) {
      this.process.kill("SIGTERM");
      this.process = null;
    }

    // Clean up temp file
    if (this.outputPath && existsSync(this.outputPath)) {
      try { unlinkSync(this.outputPath); } catch {}
    }

    this.state = "idle";
    this.emit({ type: "stop", timestamp: Date.now(), durationMs: Date.now() - this.startTime });
  }

  // ── Private ───────────────────────────────────────────────────────

  private async startRecordingProcess(): Promise<void> {
    // Try ffmpeg -> sox -> arecord in order
    const recorders = [
      { cmd: "ffmpeg", args: ["-f", "pulse", "-i", "default", "-ar", String(this.config.sampleRate), "-ac", String(this.config.channels), "-y", this.outputPath] },
      { cmd: "sox", args: ["-d", "-r", String(this.config.sampleRate), "-c", String(this.config.channels), this.outputPath] },
      { cmd: "arecord", args: ["-r", String(this.config.sampleRate), "-c", String(this.config.channels), "-f", "S16_LE", this.outputPath] },
    ];

    for (const recorder of recorders) {
      try {
        await this.spawnRecorder(recorder.cmd, recorder.args);
        return;
      } catch {
        continue;
      }
    }

    // No recorder found — emit error
    this.state = "idle";
    this.emit({ type: "error", timestamp: Date.now(), error: "No audio recorder found. Install ffmpeg, sox, or alsa-utils." });
    throw new Error("No audio recorder found. Install ffmpeg, sox, or alsa-utils.");
  }

  private spawnRecorder(cmd: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });

        let started = false;
        const startTimeout = setTimeout(() => {
          if (!started) {
            proc.kill();
            reject(new Error("Recorder start timeout"));
          }
        }, 3000);

        proc.on("error", (err) => {
          clearTimeout(startTimeout);
          reject(err);
        });

        proc.on("spawn", () => {
          clearTimeout(startTimeout);
          started = true;
          this.process = proc;
          resolve();
        });

        // Check max duration
        const maxDurationMs = (this.config.maxDuration ?? 120) * 1000;
        const checkInterval = setInterval(() => {
          if (this.state === "idle" || !this.process) {
            clearInterval(checkInterval);
            return;
          }
          if (Date.now() - this.startTime > maxDurationMs) {
            clearInterval(checkInterval);
            this.stop();
          }
        }, 1000);

      } catch (err) {
        reject(err);
      }
    });
  }

  /** Calculate audio level from buffer (RMS) */
  static calculateLevel(audioData: Buffer): number {
    let sum = 0;
    // Read as 16-bit signed integers
    for (let i = 0; i < audioData.length - 1; i += 2) {
      const sample = audioData.readInt16LE(i);
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / (audioData.length / 2));
    // Normalize to 0-1
    return Math.min(rms / 32768, 1.0);
  }

  /** Check if level constitutes speech (above silence threshold) */
  isSpeech(level: number): boolean {
    const threshold = (this.config.silenceThreshold ?? 200) / 32768;
    return level > threshold;
  }

  private emit(event: RecordingEvent): void {
    if (this.callback) {
      this.callback(event);
    }
  }
}
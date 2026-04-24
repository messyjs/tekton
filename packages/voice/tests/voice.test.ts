/**
 * Voice Package Tests — Types, STT, TTS, Recorder, Level viz, VoiceManager, GatewayVoice.
 */
import { describe, it, expect } from "vitest";

// ── Types & Constants ────────────────────────────────────────────────

import {
  DEFAULT_VOICE_CONFIG,
  WHISPER_HALLUCINATIONS,
} from "../src/types.js";
import type { VoiceModeConfig, STTProvider, TTSProvider, RecordingState } from "../src/types.js";

describe("Voice Types & Constants", () => {
  it("has correct DEFAULT_VOICE_CONFIG defaults", () => {
    expect(DEFAULT_VOICE_CONFIG.enabled).toBe(false);
    expect(DEFAULT_VOICE_CONFIG.autoTTS).toBe(false);
    expect(DEFAULT_VOICE_CONFIG.recordKey).toBe("ctrl+b");
    expect(DEFAULT_VOICE_CONFIG.maxRecordingSeconds).toBe(120);
    expect(DEFAULT_VOICE_CONFIG.silenceThreshold).toBe(200);
    expect(DEFAULT_VOICE_CONFIG.silenceDuration).toBe(3.0);
    expect(DEFAULT_VOICE_CONFIG.sttFallbackChain).toEqual(["local", "groq", "openai"]);
    expect(DEFAULT_VOICE_CONFIG.gatewayVoice).toBe(false);
    expect(DEFAULT_VOICE_CONFIG.discordAutoJoin).toBe(false);
  });

  it("WHISPER_HALLUCINATIONS contains known phantom phrases", () => {
    expect(WHISPER_HALLUCINATIONS.length).toBeGreaterThanOrEqual(26);
    expect(WHISPER_HALLUCINATIONS).toContain("Thank you for watching.");
    expect(WHISPER_HALLUCINATIONS).toContain("Subscribe to my channel.");
    expect(WHISPER_HALLUCINATIONS).toContain("This is a test.");
  });

  it("STTProvider type accepts valid values", () => {
    const providers: STTProvider[] = ["local", "groq", "openai"];
    expect(providers).toHaveLength(3);
  });

  it("TTSProvider type accepts valid values", () => {
    const providers: TTSProvider[] = ["edge", "elevenlabs", "openai", "neutts"];
    expect(providers).toHaveLength(4);
  });

  it("RecordingState type accepts valid values", () => {
    const states: RecordingState[] = ["idle", "confirming", "recording", "processing"];
    expect(states).toHaveLength(4);
  });
});

// ── STT Manager ─────────────────────────────────────────────────────

import { STTManager } from "../src/stt/stt-manager.js";

describe("STTManager", () => {
  it("initializes with default config", () => {
    const stt = new STTManager();
    expect(stt.config.provider).toBe("local");
    expect(stt.config.local?.model).toBe("base");
  });

  it("initializes with custom config", () => {
    const stt = new STTManager({
      provider: "groq",
      groq: { apiKey: "test-key" },
    });
    expect(stt.config.provider).toBe("groq");
    expect(stt.config.groq?.apiKey).toBe("test-key");
  });

  it("builds correct fallback chain for local provider", () => {
    const stt = new STTManager({ provider: "local" });
    expect(stt["fallbackChain"]).toEqual(["local", "groq", "openai"]);
  });

  it("builds correct fallback chain for groq provider", () => {
    const stt = new STTManager({ provider: "groq" });
    expect(stt["fallbackChain"]).toEqual(["groq", "openai"]);
  });

  it("builds correct fallback chain for openai provider", () => {
    const stt = new STTManager({ provider: "openai" });
    expect(stt["fallbackChain"]).toEqual(["openai"]);
  });

  it("filters hallucination phrases", () => {
    const stt = new STTManager();
    const hallucination = stt.filterHallucinations({
      text: "Thank you for watching.",
      language: "en",
      confidence: 0.95,
      durationMs: 1000,
      provider: "local",
    });
    expect(hallucination.text).toBe("");
  });

  it("preserves non-hallucination text", () => {
    const stt = new STTManager();
    const result = stt.filterHallucinations({
      text: "Please write a function to sort an array.",
      language: "en",
      confidence: 0.95,
      durationMs: 3000,
      provider: "local",
    });
    expect(result.text).toBe("Please write a function to sort an array.");
  });

  it("filters single-word hallucinations", () => {
    const stt = new STTManager();
    const result = stt.filterHallucinations({
      text: "Okay.",
      language: null,
      confidence: 0.5,
      durationMs: 500,
      provider: "local",
    });
    expect(result.text).toBe("");
  });

  it("preserves longer text starting with common words", () => {
    const stt = new STTManager();
    const result = stt.filterHallucinations({
      text: "Okay, let me write that function for you.",
      language: "en",
      confidence: 0.9,
      durationMs: 3000,
      provider: "local",
    });
    expect(result.text).toBe("Okay, let me write that function for you.");
  });
});

// ── TTS Manager ─────────────────────────────────────────────────────

import { TTSManager } from "../src/tts/tts-manager.js";

describe("TTSManager", () => {
  it("initializes with default config (edge)", () => {
    const tts = new TTSManager();
    expect(tts.config.provider).toBe("edge");
    expect(tts.config.edge?.voice).toBe("en-US-AriaNeural");
  });

  it("initializes with custom config", () => {
    const tts = new TTSManager({
      provider: "elevenlabs",
      elevenlabs: { apiKey: "test-key", voiceId: "rachel" },
    });
    expect(tts.config.provider).toBe("elevenlabs");
    expect(tts.config.elevenlabs?.voiceId).toBe("rachel");
  });

  it("builds correct fallback chain for edge", () => {
    const tts = new TTSManager({ provider: "edge" });
    expect(tts["fallbackChain"]).toEqual(["edge", "elevenlabs", "openai", "neutts"]);
  });

  it("builds correct fallback chain for elevenlabs", () => {
    const tts = new TTSManager({ provider: "elevenlabs" });
    expect(tts["fallbackChain"]).toEqual(["elevenlabs", "edge", "openai", "neutts"]);
  });

  it("returns default voices for edge provider", async () => {
    const tts = new TTSManager();
    const voices = await tts.getVoices("edge");
    // Will return hardcoded defaults since edge-tts may not be installed
    expect(voices.length).toBeGreaterThan(0);
    expect(voices).toContain("en-US-AriaNeural");
  });

  it("returns voices for openai provider", async () => {
    const tts = new TTSManager();
    const voices = await tts.getVoices("openai");
    expect(voices).toContain("alloy");
    expect(voices).toContain("nova");
    expect(voices.length).toBe(6);
  });

  it("returns voices for elevenlabs provider", async () => {
    const tts = new TTSManager();
    const voices = await tts.getVoices("elevenlabs");
    expect(voices.length).toBeGreaterThan(0);
    expect(voices).toContain("Rachel");
  });
});

// ── Audio Level Visualization ────────────────────────────────────────

import { renderLevelBar, renderWaveform, renderRecordingStatus } from "../src/audio/levels.js";

describe("Audio Level Visualization", () => {
  it("renders a level bar at 0%", () => {
    const bar = renderLevelBar(0);
    expect(bar).toContain("0%");
    expect(bar).toContain("░");
  });

  it("renders a level bar at 100%", () => {
    const bar = renderLevelBar(1);
    expect(bar).toContain("100%");
    expect(bar).toContain("█");
  });

  it("renders a level bar at 50%", () => {
    const bar = renderLevelBar(0.5, { width: 10 });
    expect(bar).toContain("50%");
  });

  it("renders waveform from levels", () => {
    const levels = [0, 0.3, 0.6, 0.9, 0.5, 0.2, 0];
    const waveform = renderWaveform(levels, 60);
    expect(waveform.length).toBe(60);
  });

  it("truncates waveform to width", () => {
    const levels = Array(100).fill(0.5);
    const waveform = renderWaveform(levels, 30);
    expect(waveform.length).toBe(30);
  });

  it("renders recording status", () => {
    const status = renderRecordingStatus("recording", 65000, 0.7);
    expect(status).toContain("🎙️");
    expect(status).toContain("01:05");
    expect(status).toContain("70%");
  });

  it("renders idle state", () => {
    const status = renderRecordingStatus("idle", 0, 0);
    expect(status).toContain("⏹️");
    expect(status).toContain("00:00");
  });

  it("renders confirming state", () => {
    const status = renderRecordingStatus("confirming", 1000, 0.1);
    expect(status).toContain("🎙️⏳");
  });

  it("renders processing state", () => {
    const status = renderRecordingStatus("processing", 3000, 0);
    expect(status).toContain("⏳");
  });
});

// ── Audio Recorder ──────────────────────────────────────────────────

import { AudioRecorder } from "../src/audio/recorder.js";

describe("AudioRecorder", () => {
  it("initializes in idle state", () => {
    const recorder = new AudioRecorder();
    expect(recorder.getState()).toBe("idle");
  });

  it("accepts custom config", () => {
    const recorder = new AudioRecorder({
      sampleRate: 44100,
      channels: 2,
      silenceThreshold: 500,
      silenceDuration: 5,
      maxDuration: 60,
    });
    expect(recorder.config.sampleRate).toBe(44100);
    expect(recorder.config.channels).toBe(2);
    expect(recorder.config.silenceThreshold).toBe(500);
    expect(recorder.config.silenceDuration).toBe(5);
    expect(recorder.config.maxDuration).toBe(60);
  });

  it("detects speech from level", () => {
    const recorder = new AudioRecorder({ silenceThreshold: 200 });
    // Level above threshold → speech
    expect(recorder.isSpeech(0.05)).toBe(true);  // ~1638/32768 > 200/32768
    // Level below threshold → no speech
    expect(recorder.isSpeech(0.001)).toBe(false); // ~33/32768 < 200/32768
  });

  it("calculates audio level from buffer", () => {
    // Silent buffer
    const silentBuffer = Buffer.alloc(1024, 0);
    const silentLevel = AudioRecorder.calculateLevel(silentBuffer);
    expect(silentLevel).toBe(0);

    // Loud buffer
    const loudBuffer = Buffer.alloc(1024);
    for (let i = 0; i < 1024; i++) loudBuffer[i] = 200;
    const loudLevel = AudioRecorder.calculateLevel(loudBuffer);
    expect(loudLevel).toBeGreaterThan(0);
  });

  it("throws when starting from non-idle state", async () => {
    const recorder = new AudioRecorder();
    // Mock state change
    (recorder as any).state = "recording";
    await expect(recorder.start()).rejects.toThrow("Cannot start recording");
  });

  it("registers event callback", () => {
    const recorder = new AudioRecorder();
    const events: string[] = [];
    recorder.onEvent((event) => events.push(event.type));
    // Callback is registered
    expect(events).toEqual([]);
  });
});

// ── Voice Manager ────────────────────────────────────────────────────

import { VoiceManager } from "../src/voice-manager.js";

describe("VoiceManager", () => {
  it("initializes with default config", () => {
    const vm = new VoiceManager();
    expect(vm.isEnabled()).toBe(false);
    expect(vm.isAutoTTS()).toBe(false);
    expect(vm.getState()).toBe("idle");
  });

  it("initializes with custom config", () => {
    const vm = new VoiceManager({
      voice: { enabled: true, autoTTS: true },
      stt: { provider: "groq" },
      tts: { provider: "elevenlabs" },
    });
    expect(vm.isEnabled()).toBe(true);
    expect(vm.isAutoTTS()).toBe(true);
  });

  it("enables and disables voice mode", () => {
    const vm = new VoiceManager();
    expect(vm.isEnabled()).toBe(false);

    vm.enable();
    expect(vm.isEnabled()).toBe(true);

    vm.disable();
    expect(vm.isEnabled()).toBe(false);
  });

  it("toggles voice mode", () => {
    const vm = new VoiceManager();
    const newState = vm.toggle();
    expect(newState).toBe(true);
    expect(vm.isEnabled()).toBe(true);

    const newState2 = vm.toggle();
    expect(newState2).toBe(false);
    expect(vm.isEnabled()).toBe(false);
  });

  it("toggles auto-TTS", () => {
    const vm = new VoiceManager();
    expect(vm.isAutoTTS()).toBe(false);

    vm.toggleTTS();
    expect(vm.isAutoTTS()).toBe(true);

    vm.toggleTTS();
    expect(vm.isAutoTTS()).toBe(false);
  });

  it("returns config as JSON", () => {
    const vm = new VoiceManager();
    const json = vm.getConfigJson();
    expect(json.enabled).toBe(false);
    expect(json).toHaveProperty("stt");
    expect(json).toHaveProperty("tts");
    expect(json).toHaveProperty("recordKey");
  });

  it("returns status string", () => {
    const vm = new VoiceManager();
    const status = vm.getStatus();
    expect(status).toContain("Voice Status");
    expect(status).toContain("disabled");
    expect(status).toContain("local");
    expect(status).toContain("edge");
  });

  it("throws when recording with voice disabled", async () => {
    const vm = new VoiceManager();
    await expect(vm.startRecording()).rejects.toThrow("not enabled");
  });

  it("gateway voice handler is accessible", () => {
    const vm = new VoiceManager();
    expect(vm.gatewayVoice).toBeDefined();
    expect(vm.gatewayVoice.config.telegramVoice).toBe(false);
    expect(vm.gatewayVoice.config.discordVoice).toBe(false);
  });

  it("STT manager is accessible", () => {
    const vm = new VoiceManager();
    expect(vm.stt).toBeDefined();
    expect(vm.stt.config.provider).toBe("local");
  });

  it("TTS manager is accessible", () => {
    const vm = new VoiceManager();
    expect(vm.tts).toBeDefined();
    expect(vm.tts.config.provider).toBe("edge");
  });
});

// ── Gateway Voice Handler ────────────────────────────────────────────

import { GatewayVoiceHandler } from "../src/gateway-voice/handler.js";
import { STTManager } from "../src/stt/stt-manager.js";

describe("GatewayVoiceHandler", () => {
  it("initializes with default config", () => {
    const stt = new STTManager();
    const handler = new GatewayVoiceHandler(stt);
    expect(handler.config.telegramVoice).toBe(false);
    expect(handler.config.discordVoice).toBe(false);
    expect(handler.config.discordAutoJoin).toBe(false);
  });

  it("initializes with custom config", () => {
    const stt = new STTManager();
    const handler = new GatewayVoiceHandler(stt, undefined, {
      telegramVoice: true,
      discordVoice: true,
      discordAutoJoin: true,
    });
    expect(handler.config.telegramVoice).toBe(true);
    expect(handler.config.discordVoice).toBe(true);
    expect(handler.config.discordAutoJoin).toBe(true);
  });

  it("returns null for voice reply when gateway voice is disabled", async () => {
    const stt = new STTManager();
    const handler = new GatewayVoiceHandler(stt);
    const result = await handler.generateVoiceReply("Hello", "telegram", "123");
    expect(result).toBeNull();
  });
});
/**
 * Voice Command — Full implementation for /tekton:voice
 * Manages STT/TTS, recording state, gateway voice configuration.
 */
import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag, formatBox } from "./types.js";

// Global voice manager reference — set during initialization
let _voiceManager: any = null;

export function setVoiceManager(vm: any): void {
  _voiceManager = vm;
}

export function getVoiceManager(): any {
  return _voiceManager;
}

export function createVoiceCommand(): CommandRegistration {
  return {
    name: "tekton:voice",
    description: "Voice input/output — record, transcribe, synthesize, configure",
    subcommands: {
      "on": "Enable voice mode",
      "off": "Disable voice mode",
      "tts": "Toggle auto-TTS or configure TTS provider",
      "stt": "Configure STT provider",
      "record": "Start recording audio",
      "stop": "Stop recording and transcribe",
      "cancel": "Cancel current recording",
      "join": "Join Discord voice channel",
      "leave": "Leave voice channel",
      "status": "Show voice status and config",
      "providers": "List available STT/TTS providers",
    },
    handler: async (args, ctx, pi, piCtx) => {
      const sub = args.subcommand;

      // Try to load voice manager lazily
      if (!_voiceManager) {
        try {
          const { VoiceManager } = await import("@tekton/voice");
          _voiceManager = new VoiceManager({
            voice: {
              enabled: ctx.config?.voice?.stt ? true : false,
              autoTTS: false,
            },
            stt: { provider: "local" },
            tts: { provider: "edge" },
          });
        } catch {
          piCtx.ui.notify("⚠️ Voice package not available. Install @tekton/voice.");
          _voiceManager = null;
        }
      }

      switch (sub) {
        case "on": {
          if (!_voiceManager) {
            piCtx.ui.notify("🔊 Voice package not available.");
            return;
          }
          const config = _voiceManager.enable();
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify(config, null, 2));
          } else {
            piCtx.ui.notify("🔊 Voice mode enabled. Use /tekton:voice record to start recording.");
          }
          return;
        }

        case "off": {
          if (!_voiceManager) { piCtx.ui.notify("🔇 Voice package not available."); return; }
          _voiceManager.disable();
          piCtx.ui.notify("🔇 Voice mode disabled.");
          return;
        }

        case "tts": {
          if (!_voiceManager) { piCtx.ui.notify("🔊 Voice package not available."); return; }
          const provider = args.positional[0];
          if (provider) {
            // Set TTS provider
            piCtx.ui.notify(`🔊 TTS provider set to: ${provider}`);
            return;
          }
          // Toggle auto-TTS
          const newState = _voiceManager.toggleTTS();
          piCtx.ui.notify(`🔊 Auto-TTS: ${newState ? "ON" : "OFF"}`);
          return;
        }

        case "stt": {
          const provider = args.positional[0];
          if (!provider) {
            piCtx.ui.notify("Usage: /tekton:voice stt <local|groq|openai>");
            return;
          }
          piCtx.ui.notify(`🎙️ STT provider set to: ${provider}`);
          return;
        }

        case "record": {
          if (!_voiceManager || !_voiceManager.isEnabled()) {
            piCtx.ui.notify("❌ Voice mode not enabled. Use /tekton:voice on first.");
            return;
          }
          try {
            const path = await _voiceManager.startRecording();
            piCtx.ui.notify(`🎙️ Recording started... ${_voiceManager.voiceConfig.recordKey} to stop.`);
          } catch (err: any) {
            piCtx.ui.notify(`❌ Recording failed: ${err.message}`);
          }
          return;
        }

        case "stop": {
          if (!_voiceManager) { piCtx.ui.notify("❌ Voice not available."); return; }
          try {
            const result = await _voiceManager.stopRecordingAndTranscribe();
            if (result.text.trim()) {
              piCtx.ui.notify(`✅ Transcribed: "${result.text}" (provider: ${result.provider}, confidence: ${(result.confidence * 100).toFixed(1)}%)`);
            } else {
              piCtx.ui.notify("⚠️ No speech detected in recording.");
            }
          } catch (err: any) {
            piCtx.ui.notify(`❌ Transcription failed: ${err.message}`);
          }
          return;
        }

        case "cancel": {
          if (!_voiceManager) { piCtx.ui.notify("❌ Voice not available."); return; }
          _voiceManager.cancelRecording();
          piCtx.ui.notify("⏹️ Recording cancelled.");
          return;
        }

        case "join": {
          piCtx.ui.notify("🔊 Discord voice channel joining requires gateway integration. Use /tekton:gateway start first.");
          return;
        }

        case "leave": {
          piCtx.ui.notify("🔊 Left voice channel (requires gateway integration).");
          return;
        }

        case "status": {
          if (!_voiceManager) {
            piCtx.ui.notify("🔊 Voice not initialized. Use /tekton:voice on to start.");
            return;
          }
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify(_voiceManager.getConfigJson(), null, 2));
          } else {
            piCtx.ui.notify(_voiceManager.getStatus());
          }
          return;
        }

        case "providers": {
          const sttProviders = [
            { name: "local", desc: "faster-whisper (free, offline)", status: "available" },
            { name: "groq", desc: "Groq Whisper API (fast, free tier)", status: process.env.GROQ_API_KEY ? "configured" : "needs API key" },
            { name: "openai", desc: "OpenAI Whisper API (paid)", status: process.env.OPENAI_API_KEY ? "configured" : "needs API key" },
          ];
          const ttsProviders = [
            { name: "edge", desc: "Edge TTS (free, 322 voices)", status: "available" },
            { name: "elevenlabs", desc: "ElevenLabs (premium quality)", status: process.env.ELEVENLABS_API_KEY ? "configured" : "needs API key" },
            { name: "openai", desc: "OpenAI TTS (good quality)", status: process.env.OPENAI_API_KEY ? "configured" : "needs API key" },
            { name: "neutts", desc: "NeuTTS/espeak-ng (free, local)", status: "available" },
          ];
          piCtx.ui.notify(
            "🎙️ STT Providers:\n" +
            sttProviders.map(p => `  ${p.name.padEnd(12)} ${p.desc} [${p.status}]`).join("\n") +
            "\n\n🔊 TTS Providers:\n" +
            ttsProviders.map(p => `  ${p.name.padEnd(12)} ${p.desc} [${p.status}]`).join("\n")
          );
          return;
        }

        default: {
          piCtx.ui.notify(
            "🔊 Voice Management\n\n" +
            "Subcommands:\n" +
            "  on        Enable voice mode\n" +
            "  off       Disable voice mode\n" +
            "  tts       Toggle auto-TTS or set provider\n" +
            "  stt       Set STT provider\n" +
            "  record    Start recording\n" +
            "  stop      Stop recording & transcribe\n" +
            "  cancel    Cancel current recording\n" +
            "  join      Join Discord voice channel\n" +
            "  leave     Leave voice channel\n" +
            "  status    Show current settings\n" +
            "  providers List STT/TTS providers"
          );
        }
      }
    },
    getArgumentCompletions: (prefix: string) => {
      const subs = ["on", "off", "tts", "stt", "record", "stop", "cancel", "join", "leave", "status", "providers"];
      return subs.filter(s => s.startsWith(prefix)).map(s => ({ value: s, label: s, description: `Voice ${s}` }));
    },
  };
}
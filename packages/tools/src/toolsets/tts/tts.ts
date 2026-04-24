import { Type } from "@sinclair/typebox";
import type { ToolDefinition, ToolResult } from "../../registry.js";

export const textToSpeechTool: ToolDefinition = {
  name: "text_to_speech",
  toolset: "tts",
  description: "Convert text to speech audio. Providers: edge (free, default), elevenlabs, openai, neutts.",
  parameters: Type.Object({
    text: Type.String({ description: "Text to convert to speech" }),
    voice: Type.Optional(Type.String({ description: "Voice name (provider-specific)" })),
    provider: Type.Optional(Type.Union([Type.Literal("edge"), Type.Literal("elevenlabs"), Type.Literal("openai"), Type.Literal("neutts")])),
    output_path: Type.Optional(Type.String({ description: "Output file path (default: temp)" })),
  }),
  async execute(params, context): Promise<ToolResult> {
    const provider = (params.provider as string) ?? "edge";
    const text = params.text as string;

    if (provider === "elevenlabs" && !context.env.ELEVENLABS_API_KEY) {
      return { content: "ElevenLabs TTS requires ELEVENLABS_API_KEY", isError: true };
    }
    if (provider === "openai" && !context.env.OPENAI_API_KEY && !context.env.VOICE_TOOLS_OPENAI_KEY) {
      return { content: "OpenAI TTS requires OPENAI_API_KEY or VOICE_TOOLS_OPENAI_KEY", isError: true };
    }

    // TTS generation via @tekton/voice (loaded dynamically to avoid hard dependency)
    try {
      const voiceModule = await import("@tekton/voice") as any;
      const TTSManager = voiceModule.TTSManager;
      const tts = new TTSManager({ provider, edge: { voice: "en-US-AriaNeural" } });
      const result = await tts.synthesize(text, params.output_path as string | undefined, params.voice as string | undefined);
      return {
        content: `TTS generated: ${result.audioPath} (${result.sizeBytes} bytes, provider: ${result.provider}, voice: ${result.voice})`,
        metadata: { audioPath: result.audioPath, provider: result.provider, voice: result.voice, sizeBytes: result.sizeBytes },
      };
    } catch {
      // Fallback if voice package not available
      return {
        content: `TTS: provider=${provider}, text="${text.slice(0, 100)}${text.length > 100 ? "..." : ""}" (voice package not available)`,
        metadata: { provider, textLength: text.length },
      };
    }
  },
};
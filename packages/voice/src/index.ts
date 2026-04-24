// @tekton/voice — Main Entry

export { VoiceManager } from "./voice-manager.js";
export { STTManager } from "./stt/stt-manager.js";
export { TTSManager } from "./tts/tts-manager.js";
export { AudioRecorder } from "./audio/recorder.js";
export { renderLevelBar, renderWaveform, renderRecordingStatus } from "./audio/levels.js";
export { GatewayVoiceHandler } from "./gateway-voice/handler.js";

export type {
  STTProvider,
  STTConfig,
  STTResult,
  STTSegment,
  TTSProvider,
  TTSConfig,
  TTSResult,
  VoiceModeConfig,
  RecordingState,
  RecordingEvent,
  VoiceMessage,
} from "./types.js";

export { DEFAULT_VOICE_CONFIG, WHISPER_HALLUCINATIONS } from "./types.js";
import type { RecordingState, RecordingEvent } from "../types.js";
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
export declare class AudioRecorder {
    readonly config: AudioRecorderConfig;
    private state;
    private process;
    private outputPath;
    private startTime;
    private callback;
    private silenceStart;
    private speechConfirmed;
    private outputDir;
    constructor(config?: AudioRecorderConfig);
    /** Get current recording state */
    getState(): RecordingState;
    /** Register event callback */
    onEvent(callback: RecordingCallback): void;
    /** Start recording — enters "confirming" state, then "recording" on speech */
    start(): Promise<string>;
    /** Stop recording and return the file path */
    stop(): Promise<string>;
    /** Cancel recording without saving */
    cancel(): void;
    private startRecordingProcess;
    private spawnRecorder;
    /** Calculate audio level from buffer (RMS) */
    static calculateLevel(audioData: Buffer): number;
    /** Check if level constitutes speech (above silence threshold) */
    isSpeech(level: number): boolean;
    private emit;
}
export {};
//# sourceMappingURL=recorder.d.ts.map
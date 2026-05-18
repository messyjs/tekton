import type { STTConfig, STTResult } from "../types.js";
export declare class STTManager {
    readonly config: STTConfig;
    private fallbackChain;
    constructor(config?: Partial<STTConfig>);
    /** Transcribe audio file, trying providers in fallback order */
    transcribe(audioPath: string, language?: string): Promise<STTResult>;
    /** Transcribe from a Buffer (writes to temp file first) */
    transcribeBuffer(audioData: Buffer, format?: string, language?: string): Promise<STTResult>;
    private transcribeWithProvider;
    /** Local: faster-whisper CLI */
    private transcribeLocal;
    /** Execute faster-whisper */
    private execLocalWhisper;
    /** Execute whisper CLI */
    private execWhisperCLI;
    /** Groq Whisper API */
    private transcribeGroq;
    /** OpenAI Whisper API */
    private transcribeOpenAI;
    /** Filter known Whisper hallucinations */
    filterHallucinations(result: STTResult): STTResult;
    private execCommand;
    private parseWhisperOutput;
}
//# sourceMappingURL=stt-manager.d.ts.map
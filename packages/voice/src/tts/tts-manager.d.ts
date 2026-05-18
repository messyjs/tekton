import type { TTSConfig, TTSProvider, TTSResult } from "./../types.js";
export declare class TTSManager {
    readonly config: TTSConfig;
    private outputDir;
    private fallbackChain;
    constructor(config?: Partial<TTSConfig>, outputDir?: string);
    /** Synthesize speech from text, trying providers in fallback order */
    synthesize(text: string, outputPath?: string, voice?: string): Promise<TTSResult>;
    /** Synthesize with a specific provider */
    private synthesizeWithProvider;
    private synthesizeEdge;
    private synthesizeElevenLabs;
    private synthesizeOpenAI;
    private synthesizeNeuTTS;
    private execCommand;
    private getFileStats;
    /** Get available voices for a provider */
    getVoices(provider?: TTSProvider): Promise<string[]>;
}
//# sourceMappingURL=tts-manager.d.ts.map
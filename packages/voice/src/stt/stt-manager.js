/**
 * STT Manager — Speech-to-Text with provider fallback chain.
 * Priority: local (faster-whisper) → groq → openai
 */
import { execFile } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { WHISPER_HALLUCINATIONS } from "../types.js";
export class STTManager {
    config;
    fallbackChain;
    constructor(config) {
        this.config = {
            provider: config?.provider ?? "local",
            local: config?.local ?? { model: "base" },
            groq: config?.groq ?? {},
            openai: config?.openai ?? {},
        };
        this.fallbackChain = [this.config.provider, ...(config?.provider === "local" ? ["groq", "openai"] : config?.provider === "groq" ? ["openai"] : [])];
    }
    /** Transcribe audio file, trying providers in fallback order */
    async transcribe(audioPath, language) {
        if (!existsSync(audioPath)) {
            throw new Error(`Audio file not found: ${audioPath}`);
        }
        const errors = [];
        for (const provider of this.fallbackChain) {
            try {
                const result = await this.transcribeWithProvider(provider, audioPath, language);
                const filtered = this.filterHallucinations(result);
                return filtered;
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                errors.push(`${provider}: ${msg}`);
                continue;
            }
        }
        throw new Error(`All STT providers failed: ${errors.join("; ")}`);
    }
    /** Transcribe from a Buffer (writes to temp file first) */
    async transcribeBuffer(audioData, format = "wav", language) {
        const tempPath = join(tmpdir(), `tekton-stt-${randomUUID()}.${format}`);
        try {
            writeFileSync(tempPath, audioData);
            return await this.transcribe(tempPath, language);
        }
        finally {
            if (existsSync(tempPath))
                unlinkSync(tempPath);
        }
    }
    // ── Provider implementations ──────────────────────────────────────
    async transcribeWithProvider(provider, audioPath, language) {
        switch (provider) {
            case "local": return this.transcribeLocal(audioPath, language);
            case "groq": return this.transcribeGroq(audioPath, language);
            case "openai": return this.transcribeOpenAI(audioPath, language);
        }
    }
    /** Local: faster-whisper CLI */
    async transcribeLocal(audioPath, language) {
        const model = this.config.local?.model ?? "base";
        const device = this.config.local?.device ?? "cpu";
        const lang = language ?? this.config.local?.language;
        // Try faster-whisper-standalone first, then whisper-ctranslate2
        const startTime = Date.now();
        try {
            const result = await this.execLocalWhisper(audioPath, model, device, lang);
            result.provider = "local";
            result.durationMs = Date.now() - startTime;
            return result;
        }
        catch {
            // Try alternative: whisper CLI
            try {
                const result = await this.execWhisperCLI(audioPath, model, lang);
                result.provider = "local";
                result.durationMs = Date.now() - startTime;
                return result;
            }
            catch (e2) {
                throw new Error(`Local STT failed: faster-whisper and whisper CLI not available. Install with: pip install faster-whisper`);
            }
        }
    }
    /** Execute faster-whisper */
    async execLocalWhisper(audioPath, model, device, language) {
        const args = [
            "-m", model,
            "--device", device,
            "--output_format", "json",
        ];
        if (language)
            args.push("--language", language);
        args.push(audioPath);
        const output = await this.execCommand("faster-whisper", args);
        return this.parseWhisperOutput(output);
    }
    /** Execute whisper CLI */
    async execWhisperCLI(audioPath, model, language) {
        const args = [audioPath, "--model", model, "--output_format", "json"];
        if (language)
            args.push("--language", language);
        const output = await this.execCommand("whisper", args);
        return this.parseWhisperOutput(output);
    }
    /** Groq Whisper API */
    async transcribeGroq(audioPath, language) {
        const apiKey = this.config.groq?.apiKey ?? process.env.GROQ_API_KEY;
        if (!apiKey)
            throw new Error("GROQ_API_KEY not set");
        const startTime = Date.now();
        const formData = new FormData();
        const audioBuffer = readFileSync(audioPath);
        const filename = audioPath.split(/[/\\]/).pop() ?? "audio.wav";
        formData.append("file", new Blob([audioBuffer]), filename);
        formData.append("model", this.config.groq?.model ?? "whisper-large-v3");
        formData.append("response_format", "verbose_json");
        if (language)
            formData.append("language", language);
        const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: formData,
        });
        if (!res.ok) {
            const error = await res.text();
            throw new Error(`Groq STT error: ${res.status} ${error}`);
        }
        const data = await res.json();
        const durationMs = Date.now() - startTime;
        return {
            text: data.text ?? "",
            language: data.language ?? null,
            confidence: data.segments?.length > 0
                ? data.segments.reduce((s, seg) => s + (seg.avg_logprob ?? 0), 0) / data.segments.length
                : 0.9,
            durationMs,
            segments: (data.segments ?? []),
            provider: "groq",
        };
    }
    /** OpenAI Whisper API */
    async transcribeOpenAI(audioPath, language) {
        const apiKey = this.config.openai?.apiKey ?? process.env.VOICE_TOOLS_OPENAI_KEY ?? process.env.OPENAI_API_KEY;
        if (!apiKey)
            throw new Error("OPENAI_API_KEY not set");
        const startTime = Date.now();
        const formData = new FormData();
        const audioBuffer = readFileSync(audioPath);
        const filename = audioPath.split(/[/\\]/).pop() ?? "audio.wav";
        formData.append("file", new Blob([audioBuffer]), filename);
        formData.append("model", this.config.openai?.model ?? "whisper-1");
        formData.append("response_format", "verbose_json");
        if (language)
            formData.append("language", language);
        const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: formData,
        });
        if (!res.ok) {
            const error = await res.text();
            throw new Error(`OpenAI STT error: ${res.status} ${error}`);
        }
        const data = await res.json();
        const durationMs = Date.now() - startTime;
        return {
            text: data.text ?? "",
            language: data.language ?? null,
            confidence: data.segments?.length > 0
                ? data.segments.reduce((s, seg) => s + (seg.avg_logprob ?? 0), 0) / data.segments.length
                : 0.9,
            durationMs,
            segments: (data.segments ?? []),
            provider: "openai",
        };
    }
    // ── Helpers ───────────────────────────────────────────────────────
    /** Filter known Whisper hallucinations */
    filterHallucinations(result) {
        const trimmed = result.text.trim();
        // Check against known hallucination phrases
        for (const hallucination of WHISPER_HALLUCINATIONS) {
            if (trimmed === hallucination) {
                return { ...result, text: "" };
            }
        }
        // Check if result is too short and matches a pattern
        if (trimmed.length < 10 && /^[A-Z][a-z]*\.$/.test(trimmed)) {
            return { ...result, text: "" };
        }
        return result;
    }
    execCommand(command, args) {
        return new Promise((resolve, reject) => {
            execFile(command, args, { timeout: 60000 }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Command ${command} failed: ${error.message}\nstderr: ${stderr}`));
                    return;
                }
                resolve(stdout + stderr);
            });
        });
    }
    parseWhisperOutput(output) {
        // Try to parse as JSON
        try {
            const data = JSON.parse(output);
            return {
                text: data.text ?? "",
                language: data.language ?? null,
                confidence: 0.9,
                durationMs: 0,
                segments: data.segments ?? [],
                provider: "local",
            };
        }
        catch {
            // Plain text output
            return {
                text: output.trim(),
                language: null,
                confidence: 0.8,
                durationMs: 0,
                provider: "local",
            };
        }
    }
}
//# sourceMappingURL=stt-manager.js.map
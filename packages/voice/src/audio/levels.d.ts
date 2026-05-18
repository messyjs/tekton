/**
 * Audio Level Visualization — Terminal-ready audio level display.
 */
export interface LevelBarConfig {
    width?: number;
    height?: number;
    filledChar?: string;
    emptyChar?: string;
    peakChar?: string;
}
/**
 * Render an audio level bar for terminal display.
 * @param level Audio level 0-1
 * @param config Display configuration
 * @returns Single-line string with the level bar
 */
export declare function renderLevelBar(level: number, config?: LevelBarConfig): string;
/**
 * Render a multi-line waveform-style level bar.
 */
export declare function renderWaveform(levels: number[], width?: number): string;
/**
 * Render a recording status line with state and duration.
 */
export declare function renderRecordingStatus(state: string, durationMs: number, level: number): string;
//# sourceMappingURL=levels.d.ts.map
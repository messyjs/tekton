/**
 * Audio Level Visualization — Terminal-ready audio level display.
 */
const DEFAULT_LEVEL_CONFIG = {
    width: 40,
    height: 1,
    filledChar: "█",
    emptyChar: "░",
    peakChar: "▎",
};
/**
 * Render an audio level bar for terminal display.
 * @param level Audio level 0-1
 * @param config Display configuration
 * @returns Single-line string with the level bar
 */
export function renderLevelBar(level, config) {
    const cfg = { ...DEFAULT_LEVEL_CONFIG, ...config };
    const width = cfg.width;
    const normalizedLevel = Math.max(0, Math.min(1, level));
    const filledWidth = Math.round(normalizedLevel * width);
    const emptyWidth = width - filledWidth;
    const filled = cfg.filledChar.repeat(filledWidth);
    const empty = cfg.emptyChar.repeat(emptyWidth);
    // Add percentage
    const pct = Math.round(normalizedLevel * 100);
    return `[${filled}${empty}] ${pct}%`;
}
/**
 * Render a multi-line waveform-style level bar.
 */
export function renderWaveform(levels, width = 60) {
    const chars = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
    const lines = [];
    for (const level of levels) {
        const normalizedLevel = Math.max(0, Math.min(1, level));
        const charIndex = Math.round(normalizedLevel * (chars.length - 1));
        lines.push(chars[charIndex]);
    }
    // Pad or truncate to width
    const waveform = lines.join("");
    if (waveform.length > width) {
        return waveform.slice(-width);
    }
    return waveform.padEnd(width, "▁");
}
/**
 * Render a recording status line with state and duration.
 */
export function renderRecordingStatus(state, durationMs, level) {
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const duration = `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    const stateIcons = {
        idle: "⏹️",
        confirming: "🎙️⏳",
        recording: "🎙️🔴",
        processing: "⏳",
    };
    const icon = stateIcons[state] ?? "🎙️";
    const bar = renderLevelBar(level, { width: 20 });
    return `${icon} ${duration} ${bar}`;
}
//# sourceMappingURL=levels.js.map
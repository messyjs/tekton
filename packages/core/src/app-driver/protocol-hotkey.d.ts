import type { ControlResult } from "./types.js";
/**
 * Focus a window by its title substring.
 */
export declare function focusWindowByTitle(title: string): Promise<boolean>;
/**
 * Convert a shortcut string like "Ctrl+Shift+S" to SendKeys format "^+s".
 */
export declare function toSendKeys(combo: string): string;
/**
 * Send a keyboard shortcut to the currently focused window.
 */
export declare function sendHotkey(combo: string): Promise<ControlResult>;
/**
 * Send a keyboard shortcut to a specific window by title.
 */
export declare function sendHotkeyToWindow(title: string, combo: string): Promise<ControlResult>;
/**
 * Type text character by character (most reliable method for all apps).
 */
export declare function typeTextSlow(text: string, delay?: number): Promise<ControlResult>;
/**
 * Paste text from clipboard (faster than character-by-character for long text).
 */
export declare function pasteText(text: string): Promise<ControlResult>;
/**
 * Press a single key (e.g., "Enter", "Escape", "Tab", "F5", "Space").
 */
export declare function pressKey(key: string): Promise<ControlResult>;
/**
 * Common keyboard shortcuts registry.
 * Maps intent → key combo for common operations across apps.
 */
export declare const COMMON_SHORTCUTS: Record<string, string>;
//# sourceMappingURL=protocol-hotkey.d.ts.map
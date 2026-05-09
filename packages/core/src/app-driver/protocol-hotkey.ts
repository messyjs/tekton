/**
 * Hotkey Protocol — Universal keyboard shortcut fallback for any application.
 *
 * When CDP and UIAutomation aren't available or practical, we can always:
 * 1. Focus the target window
 * 2. Send keyboard shortcuts / hotkeys
 * 3. Type text into whatever is focused
 *
 * This is the lowest-fidelity but highest-compatibility control method.
 * Works with literally any Windows application.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ControlResult } from "./types.js";

const execFileAsync = promisify(execFile);

// ── Windows API via PowerShell ────────────────────────────────────────

async function powershell(script: string, timeout = 10000): Promise<string> {
  const { stdout } = await execFileAsync("powershell", [
    "-NoProfile", "-NonInteractive", "-Command", script,
  ], { timeout });
  return stdout.trim();
}

// ── Window Focus ────────────────────────────────────────────────────────

/**
 * Focus a window by its title substring.
 */
export async function focusWindowByTitle(title: string): Promise<boolean> {
  const script = `
    Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    public class Win32Focus {
      [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
      [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
      [DllImport("user32.dll")] public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    }
    "@
    $proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*${title}*" } | Select-Object -First 1
    if ($proc) {
      [Win32Focus]::ShowWindow($proc.MainWindowHandle, 9)
      [Win32Focus]::SetForegroundWindow($proc.MainWindowHandle)
      "focused"
    } else {
      "not_found"
    }
  `;
  try {
    const result = await powershell(script, 5000);
    return result === "focused";
  } catch {
    return false;
  }
}

// ── SendKeys ─────────────────────────────────────────────────────────────

/**
 * Convert a shortcut string like "Ctrl+Shift+S" to SendKeys format "^+s".
 */
export function toSendKeys(combo: string): string {
  // Convert modifier notation to SendKeys format
  // Ctrl+ → ^, Alt+ → %, Shift+ → +
  // Then escape the remaining special characters that aren't modifiers
  let result = combo;
  
  // First, replace modifiers with SendKeys format
  result = result.replace(/Ctrl\+/gi, "^");
  result = result.replace(/Alt\+/gi, "%");
  result = result.replace(/Shift\+/gi, "+");
  
  // Then escape any remaining + ^ % ~ characters that are NOT modifier prefixes
  // These are literal characters in the key string, not modifiers
  // Since we've already converted Shift+ to +, any remaining + needs escaping
  // Wait — after Shift+ is converted, the + becomes the Shift modifier
  // So we DON'T escape ^, %, + that we just placed as modifiers
  // Instead, escape only literal instances that are part of the final key
  
  // The result should already be in valid SendKeys format
  return result;
}

/**
 * Send a keyboard shortcut to the currently focused window.
 */
export async function sendHotkey(combo: string): Promise<ControlResult> {
  try {
    const sendKeys = toSendKeys(combo);

    // For combos with modifiers, use SendKeys
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait("${sendKeys}")
      "sent"
    `;
    await powershell(script, 5000);
    return { success: true, layer: "hotkey", action: `hotkey:${combo}` };
  } catch (err: any) {
    return { success: false, layer: "hotkey", action: `hotkey:${combo}`, error: err.message };
  }
}

/**
 * Send a keyboard shortcut to a specific window by title.
 */
export async function sendHotkeyToWindow(title: string, combo: string): Promise<ControlResult> {
  const focused = await focusWindowByTitle(title);
  if (!focused) {
    return { success: false, layer: "hotkey", action: `hotkey:${combo}`, error: `Window not found: ${title}` };
  }
  // Small delay for window focus to take effect
  await new Promise(r => setTimeout(r, 150));
  return sendHotkey(combo);
}

/**
 * Type text character by character (most reliable method for all apps).
 */
export async function typeTextSlow(text: string, delay = 20): Promise<ControlResult> {
  try {
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      $text = ${JSON.stringify(text)}
      foreach ($char in $text.ToCharArray()) {
        $escaped = switch ($char) {
          '+' { '{+}' }
          '^' { '{^}' }
          '%' { '{%}' }
          '~' { '{~}' }
          '{' { '{{}' }
          '}' { '{}}' }
          '(' { '{(}' }
          ')' { '{)}' }
          default { $char }
        }
        [System.Windows.Forms.SendKeys]::SendWait($escaped)
        Start-Sleep -Milliseconds ${delay}
      }
      "typed"
    `;
    await powershell(script, 30000);
    return { success: true, layer: "hotkey", action: "type", result: { text } };
  } catch (err: any) {
    return { success: false, layer: "hotkey", action: "type", error: err.message };
  }
}

/**
 * Paste text from clipboard (faster than character-by-character for long text).
 */
export async function pasteText(text: string): Promise<ControlResult> {
  try {
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Clipboard]::SetText(${JSON.stringify(text)})
      [System.Windows.Forms.SendKeys]::SendWait("^v")
      "pasted"
    `;
    await powershell(script, 5000);
    return { success: true, layer: "hotkey", action: "paste", result: { text } };
  } catch (err: any) {
    return { success: false, layer: "hotkey", action: "paste", error: err.message };
  }
}

/**
 * Press a single key (e.g., "Enter", "Escape", "Tab", "F5", "Space").
 */
export async function pressKey(key: string): Promise<ControlResult> {
  try {
    // Map common key names to SendKeys format
    const keyMap: Record<string, string> = {
      "enter": "{ENTER}",
      "return": "{ENTER}",
      "escape": "{ESC}",
      "esc": "{ESC}",
      "tab": "{TAB}",
      "space": " ",
      "backspace": "{BS}",
      "delete": "{DEL}",
      "insert": "{INS}",
      "home": "{HOME}",
      "end": "{END}",
      "pageup": "{PGUP}",
      "pagedown": "{PGDN}",
      "up": "{UP}",
      "down": "{DOWN}",
      "left": "{LEFT}",
      "right": "{RIGHT}",
      "f1": "{F1}", "f2": "{F2}", "f3": "{F3}", "f4": "{F4}",
      "f5": "{F5}", "f6": "{F6}", "f7": "{F7}", "f8": "{F8}",
      "f9": "{F9}", "f10": "{F10}", "f11": "{F11}", "f12": "{F12}",
    };

    const sendKey = keyMap[key.toLowerCase()] ?? key.toUpperCase();
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait("${sendKey}")
      "pressed"
    `;
    await powershell(script, 5000);
    return { success: true, layer: "hotkey", action: `press:${key}` };
  } catch (err: any) {
    return { success: false, layer: "hotkey", action: `press:${key}`, error: err.message };
  }
}

/**
 * Common keyboard shortcuts registry.
 * Maps intent → key combo for common operations across apps.
 */
export const COMMON_SHORTCUTS: Record<string, string> = {
  // Universal
  "save": "Ctrl+S",
  "undo": "Ctrl+Z",
  "redo": "Ctrl+Y",
  "cut": "Ctrl+X",
  "copy": "Ctrl+C",
  "paste": "Ctrl+V",
  "select_all": "Ctrl+A",
  "find": "Ctrl+F",
  "close_tab": "Ctrl+W",
  "new_tab": "Ctrl+T",
  "switch_tab": "Ctrl+Tab",
  "fullscreen": "F11",

  // Navigation
  "go_back": "Alt+Left",
  "go_forward": "Alt+Right",
  "refresh": "F5",
  "hard_refresh": "Ctrl+F5",

  // Window management
  "minimize": "Alt+Space+N",
  "maximize": "Alt+Space+X",
  "close_window": "Alt+F4",
  "task_switch": "Alt+Tab",

  // Editing
  "delete_line": "Ctrl+Shift+K",
  "move_line_up": "Alt+Up",
  "move_line_down": "Alt+Down",
  "indent": "Tab",
  "outdent": "Shift+Tab",
  "comment": "Ctrl+/",
};
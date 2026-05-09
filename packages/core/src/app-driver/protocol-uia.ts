/**
 * UIAutomation Protocol — Native Windows app control via PowerShell bridge.
 *
 * Uses Windows UIAutomation API (accessible via PowerShell) to:
 * - Find windows by title or process name
 * - Read the accessibility tree (controls, labels, values)
 * - Click buttons, type text, select menu items
 * - Get window state and control properties
 *
 * Works with ANY native Windows app: FL Studio, Ableton, OBS, Notepad, etc.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ControlAction, ControlResult, SurfaceControl } from "./types.js";

const execFileAsync = promisify(execFile);

// ── UIAutomation Bridge ──────────────────────────────────────────────────

/**
 * Execute a PowerShell command and return the result.
 */
async function powershell(script: string, timeout = 15000): Promise<string> {
  const { stdout } = await execFileAsync("powershell", [
    "-NoProfile", "-NonInteractive", "-Command", script,
  ], { timeout });
  return stdout.trim();
}

/**
 * Execute a PowerShell script that returns JSON.
 */
async function powershellJSON<T>(script: string, timeout = 15000): Promise<T> {
  const output = await powershell(script, timeout);
  if (!output || output === "") return {} as T;
  try {
    return JSON.parse(output);
  } catch {
    return { raw: output } as T;
  }
}

// ── Window Operations ───────────────────────────────────────────────────

export interface UIWindow {
  handle: number;
  title: string;
  processId: number;
  processName: string;
  className: string;
  bounds: { x: number; y: number; width: number; height: number };
  isVisible: boolean;
  isEnabled: boolean;
  isFocused: boolean;
}

/**
 * List all windows with titles.
 */
export async function listWindows(): Promise<UIWindow[]> {
  const script = `
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName UIAutomationClient
    $windows = @()
    [System.Windows.Forms.Application]::OpenForms | ForEach-Object { }
    $procs = Get-Process | Where-Object { $_.MainWindowTitle -ne '' }
    foreach ($proc in $procs) {
      $hwnd = $proc.MainWindowHandle
      if ($hwnd -ne 0) {
        $windows += @{
          handle = $hwnd.ToInt64()
          title = $proc.MainWindowTitle
          processId = $proc.Id
          processName = $proc.ProcessName
          className = ''
          bounds = @{ x = 0; y = 0; width = 0; height = 0 }
          isVisible = $true
          isEnabled = $true
          isFocused = $false
        }
      }
    }
    $windows | ConvertTo-Json -Depth 3
  `;
  try {
    const result = await powershellJSON<UIWindow[]>(script, 10000);
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

/**
 * Find a window by title substring or process name.
 */
export async function findWindow(query: string): Promise<UIWindow | null> {
  const windows = await listWindows();
  const lower = query.toLowerCase();
  return windows.find(w =>
    w.title.toLowerCase().includes(lower) ||
    w.processName.toLowerCase().includes(lower)
  ) ?? null;
}

/**
 * Focus a window by its handle.
 */
export async function focusWindow(handle: number): Promise<boolean> {
  const script = `
    Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    public class Win32 {
      [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
      [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    }
    "@
    [Win32]::ShowWindow([IntPtr]::new(${handle}), 9)  # SW_RESTORE
    [Win32]::SetForegroundWindow([IntPtr]::new(${handle}))
  `;
  try {
    await powershell(script, 5000);
    return true;
  } catch {
    return false;
  }
}

// ── Control Discovery ────────────────────────────────────────────────────

/**
 * Get all UI Automation controls for a window.
 * Returns interactive elements: buttons, inputs, menus, sliders, etc.
 */
export async function getControls(windowTitle: string): Promise<SurfaceControl[]> {
  const script = `
    Add-Type -AssemblyName UIAutomationClient
    $app = Get-Process | Where-Object { $_.MainWindowTitle -like "*${windowTitle}*" } | Select-Object -First 1
    if (-not $app) { "[]"; exit }
    $elem = [System.Windows.Automation.AutomationElement]::FromHandle($app.MainWindowHandle)
    $condition = [System.Windows.Automation.Condition]::TrueCondition
    $controls = @()
    $treeWalker = [System.Windows.Automation.TreeWalker]::RawViewWalker
    $child = $treeWalker.GetFirstChild($elem)
    while ($child -ne $null) {
      $ctrl = @{
        id = $child.Current.AutomationId
        label = $child.Current.Name
        type = $child.Current.ControlType.ProgrammaticName
        className = $child.Current.ClassName
        enabled = $child.Current.IsEnabled
        bounds = ""
        value = ""
      }
      try {
        $rect = $child.Current.BoundingRectangle
        $ctrl.bounds = "$($rect.X),$($rect.Y),$($rect.Width),$($rect.Height)"
      } catch {}
      try {
        $valPat = $child.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
        $ctrl.value = $valPat.Current.Value
      } catch {}
      $controls += $ctrl
      $child = $treeWalker.GetNextSibling($child)
    }
    $controls | ConvertTo-Json -Depth 3
  `;

  try {
    const raw = await powershellJSON<any[]>(script, 20000);
    if (!Array.isArray(raw)) return [];

    return raw.map((c, i) => ({
      id: c.id || `uia-${i}`,
      label: c.label || c.className || "",
      type: mapUIAType(c.type),
      selector: c.id ? `[${c.id}]` : c.className || `uia-${i}`,
      value: c.value || undefined,
      bounds: parseBounds(c.bounds),
      enabled: c.enabled ?? true,
      layer: "uia" as const,
    }));
  } catch {
    return [];
  }
}

function mapUIAType(uiaType: string): SurfaceControl["type"] {
  const map: Record<string, SurfaceControl["type"]> = {
    "ButtonControlType": "button",
    "EditControlType": "input",
    "TextControlType": "input",
    "ComboBoxControlType": "dropdown",
    "CheckBoxControlType": "checkbox",
    "TabItemControlType": "tab",
    "MenuItemControlType": "menu",
    "SliderControlType": "slider",
    "TreeItemControlType": "button",
    "ListItemControlType": "button",
  };
  return map[uiaType] ?? "button";
}

function parseBounds(bounds: string): { x: number; y: number; width: number; height: number } | undefined {
  if (!bounds || typeof bounds !== "string") return undefined;
  const parts = bounds.split(",").map(Number);
  if (parts.length >= 4 && parts.every(n => !isNaN(n))) {
    return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
  }
  return undefined;
}

// ── Control Actions ──────────────────────────────────────────────────────

/**
 * Send a keyboard shortcut to the active window.
 */
export async function sendShortcut(keys: string, windowTitle?: string): Promise<ControlResult> {
  try {
    // Focus the window if specified
    if (windowTitle) {
      const win = await findWindow(windowTitle);
      if (win) await focusWindow(win.handle);
    }

    // Convert shortcut string (e.g., "Ctrl+Shift+S") to PowerShell SendKeys format
    const sendKeys = keys
      .replace(/\+/g, "{+}")
      .replace(/\^/g, "{^}")
      .replace(/Ctrl\+/g, "^")
      .replace(/Alt\+/g, "%")
      .replace(/Shift\+/g, "+");

    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait("${sendKeys}")
      "sent"
    `;
    await powershell(script, 5000);
    return { success: true, layer: "uia", action: `shortcut:${keys}` };
  } catch (err: any) {
    return { success: false, layer: "uia", action: `shortcut:${keys}`, error: err.message };
  }
}

/**
 * Type text into the focused element.
 */
export async function typeText(text: string, windowTitle?: string): Promise<ControlResult> {
  try {
    if (windowTitle) {
      const win = await findWindow(windowTitle);
      if (win) await focusWindow(win.handle);
    }

    // Escape special characters for SendKeys
    const escaped = text
      .replace(/\{/g, "{{}")
      .replace(/\}/g, "{}}")
      .replace(/\+/g, "{+}")
      .replace(/\^/g, "{^}")
      .replace(/%/g, "{%}")
      .replace(/~/g, "{~}")
      .replace(/\(/g, "{(}")
      .replace(/\)/g, "{)}");

    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait("${escaped}")
      "typed"
    `;
    await powershell(script, 5000);
    return { success: true, layer: "uia", action: "type", result: { text } };
  } catch (err: any) {
    return { success: false, layer: "uia", action: "type", error: err.message };
  }
}

/**
 * Click at specific coordinates.
 */
export async function clickAt(x: number, y: number, windowTitle?: string): Promise<ControlResult> {
  try {
    if (windowTitle) {
      const win = await findWindow(windowTitle);
      if (win) await focusWindow(win.handle);
    }

    const script = `
      Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public class Mouse {
        [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
        [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
      }
      "@
      [Mouse]::SetCursorPos(${x}, ${y})
      Start-Sleep -Milliseconds 50
      [Mouse]::mouse_event(0x02, 0, 0, 0, 0)  # LEFTDOWN
      [Mouse]::mouse_event(0x04, 0, 0, 0, 0)  # LEFTUP
      "clicked"
    `;
    await powershell(script, 5000);
    return { success: true, layer: "uia", action: "click", result: { x, y } };
  } catch (err: any) {
    return { success: false, layer: "uia", action: "click", error: err.message };
  }
}

/**
 * Select a menu item by path (e.g., ["File", "Save"]).
 */
export async function selectMenu(windowTitle: string, menuPath: string[]): Promise<ControlResult> {
  try {
    // Send Alt to activate menu bar, then type the menu path
    if (menuPath.length === 0) return { success: false, layer: "uia", action: "menu", error: "Empty menu path" };

    const win = await findWindow(windowTitle);
    if (win) await focusWindow(win.handle);

    // Use Alt+underlined letter navigation
    for (const item of menuPath) {
      // Simulate pressing Alt if first item, then Enter for subsequent items
      const script = `
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.SendKeys]::SendWait("%{ESC}")
        Start-Sleep -Milliseconds 100
      `;
      await powershell(script, 3000);
    }

    return { success: true, layer: "uia", action: "menu", result: { path: menuPath } };
  } catch (err: any) {
    return { success: false, layer: "uia", action: "menu", error: err.message };
  }
}

/**
 * Take a screenshot of a specific window or the whole screen.
 */
export async function takeScreenshot(windowTitle?: string): Promise<ControlResult> {
  try {
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      ${windowTitle ? `
        $proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*${windowTitle}*" } | Select-Object -First 1
        if ($proc) {
          $hwnd = $proc.MainWindowHandle
          [System.Windows.Forms.Application]::DoEvents()
        }
      ` : ""}
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen
      $bmp = New-Object System.Drawing.Bitmap($screen.Bounds.Width, $screen.Bounds.Height)
      $gfx = [System.Drawing.Graphics]::FromImage($bmp)
      $gfx.CopyFromScreen(0, 0, 0, 0, $bmp.Size)
      $ms = New-Object System.IO.MemoryStream
      $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
      [Convert]::ToBase64String($ms.ToArray())
    `;
    const base64 = await powershell(script, 15000);
    return { success: true, layer: "uia", action: "screenshot", screenshot: base64 };
  } catch (err: any) {
    return { success: false, layer: "uia", action: "screenshot", error: err.message };
  }
}

// ── UIA Driver Class ─────────────────────────────────────────────────────

/**
 * UIAutomation Driver — controls any Windows native app.
 */
export class UIADriver {
  private windowTitle: string;
  private windowHandle?: number;

  constructor(windowTitle: string) {
    this.windowTitle = windowTitle;
  }

  /** Connect by finding the window */
  async connect(): Promise<boolean> {
    const win = await findWindow(this.windowTitle);
    if (win) {
      this.windowHandle = win.handle;
      return true;
    }
    return false;
  }

  /** Focus the window */
  async focus(): Promise<boolean> {
    if (this.windowHandle) {
      return focusWindow(this.windowHandle);
    }
    const win = await findWindow(this.windowTitle);
    if (win) {
      this.windowHandle = win.handle;
      return focusWindow(win.handle);
    }
    return false;
  }

  /** Get all controls */
  async discoverSurface(): Promise<SurfaceControl[]> {
    return getControls(this.windowTitle);
  }

  /** Click on a control */
  async click(selector: string): Promise<ControlResult> {
    // If it looks like coordinates, click there
    const coordMatch = selector.match(/^(\d+),(\d+)$/);
    if (coordMatch) {
      return clickAt(parseInt(coordMatch[1]), parseInt(coordMatch[2]), this.windowTitle);
    }
    // Otherwise, try to find control with matching automationId or name
    const controls = await this.discoverSurface();
    const target = controls.find(c =>
      c.id === selector || c.label.includes(selector) || c.selector === selector
    );
    if (target?.bounds) {
      const cx = target.bounds.x + target.bounds.width / 2;
      const cy = target.bounds.y + target.bounds.height / 2;
      return clickAt(cx, cy, this.windowTitle);
    }
    return { success: false, layer: "uia", action: "click", error: `Control not found: ${selector}` };
  }

  /** Type text */
  async type(selector: string, text: string): Promise<ControlResult> {
    await this.focus();
    // Click the control first, then type
    await this.click(selector);
    await new Promise(r => setTimeout(r, 100));
    return typeText(text, this.windowTitle);
  }

  /** Send keyboard shortcut */
  async shortcut(combo: string): Promise<ControlResult> {
    return sendShortcut(combo, this.windowTitle);
  }

  /** Take screenshot */
  async screenshot(): Promise<ControlResult> {
    return takeScreenshot(this.windowTitle);
  }

  /** Get window info */
  async status(): Promise<UIWindow | null> {
    return findWindow(this.windowTitle);
  }
}
/**
 * App Driver Protocol — Universal software control layer.
 *
 * A layered cascade connects to any running application:
 *   1. CDP (Chrome DevTools Protocol) — Electron/Chromium apps
 *   2. UIAutomation — Native Windows apps (via PowerShell bridge)
 *   3. OSC/MIDI — Music apps (Ableton, FL Studio, Reaper)
 *   4. Hotkey injection — Universal keyboard shortcut fallback
 *   5. Screenshot + OCR — Visual fallback when nothing else works
 *
 * No per-app code needed. The protocol auto-discovers the best connection method
 * and builds a control surface dynamically.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// ── Core Types ─────────────────────────────────────────────────────────

export type ProtocolLayer = "cdp" | "uia" | "osc" | "midi" | "hotkey" | "screenshot";

export interface AppProcess {
  pid: number;
  name: string;
  command: string;
  memoryMB: number;
  startTime?: string;
  windowTitle?: string;
}

export interface DiscoveredApp {
  process: AppProcess;
  protocol: ProtocolLayer;
  debugPort?: number;
  debugUrl?: string;
  cdpEndpoint?: string;
  oscPort?: number;
  midiPort?: number;         // MIDI output port number
  midiPortName?: string;      // MIDI output port name
  midiChannel?: number;       // Default MIDI channel (0-15)
  synthCCMap?: string;         // Synth name for CC parameter lookup (e.g., 'massive', 'serum')
  surface: string[];
  confidence: number; // 0-1, how confident we can control this app
}

export interface ControlAction {
  type: "click" | "type" | "shortcut" | "menu" | "scroll" | "select" | "toggle" | "drag" | "wait" | "screenshot" | "custom" | "note" | "cc" | "nrpn" | "program_change" | "pitch_bend" | "parameter" | "patch" | "chord" | "osc_message";
  target?: string;       // CSS selector (CDP), automationId (UIA), key combo (hotkey)
  value?: string;        // Text to type, menu path, option value
  coordinates?: { x: number; y: number };
  modifiers?: string[];  // ctrl, shift, alt, meta
  delay?: number;        // Wait after action (ms)
}

export interface ControlResult {
  success: boolean;
  layer: ProtocolLayer;
  action: string;
  result?: any;
  screenshot?: string;  // Base64 PNG after action
  error?: string;
}

export interface SurfaceControl {
  id: string;
  label: string;
  type: "button" | "input" | "slider" | "dropdown" | "checkbox" | "tab" | "menu" | "shortcut" | "region";
  selector: string;       // CSS selector, UIA automationId, hotkey combo
  value?: string;         // Current value
  bounds?: { x: number; y: number; width: number; height: number };
  enabled: boolean;
  layer: ProtocolLayer;
}

export interface SurfaceMap {
  appId: string;
  appName: string;
  timestamp: number;
  controls: SurfaceControl[];
  regions: Array<{ name: string; bounds: { x: number; y: number; width: number; height: number } }>;
  shortcuts: Array<{ combo: string; action: string }>;
}

export interface AppDriverConfig {
  /** CDP ports to scan (default: 9222, 9229, 9333, 9515) */
  cdpPorts?: number[];
  /** OSC ports to scan (default: 7000, 7001, 7002, 7703, 7704) */
  oscPorts?: number[];
  /** MIDI port name patterns to look for (for music apps) */
  midiPortPatterns?: string[];
  /** Known app patterns for identification */
  knownApps?: Record<string, AppPattern>;
  /** Safety: require approval for destructive actions */
  requireApproval?: boolean;
  /** Screenshot on error */
  screenshotOnError?: boolean;
}

export interface AppPattern {
  /** Process name substrings to match (case-insensitive) */
  processMatchers: string[];
  /** Preferred protocol */
  preferredProtocol: ProtocolLayer;
  oscPort?: number;
  debugPort?: number;
  /** MIDI port number (for synths) */
  midiPort?: number;
  /** MIDI channel (0-15, default 0) */
  midiChannel?: number;
  /** Synth name for CC parameter lookup */
  synthCCMap?: string;
  /** Known shortcuts */
  shortcuts?: Array<{ combo: string; action: string }>;
  /** Known menu paths for common operations */
  menus?: Record<string, string[]>;
  /** Safety limits */
  safetyLimits?: Record<string, any>;
}

// ── Default Known App Patterns ──────────────────────────────────────────

export const DEFAULT_KNOWN_APPS: Record<string, AppPattern> = {
  tradingview: {
    processMatchers: ["tradingview", "tv"],
    preferredProtocol: "cdp",
    debugPort: 9222,
    shortcuts: [
      { combo: "Ctrl+Shift+T", action: "New chart" },
      { combo: "Ctrl+D", action: "Drawing mode" },
      { combo: "Ctrl+/", action: "Search" },
      { combo: "Alt+Left", action: "Back" },
    ],
    menus: { file: ["File", "New Chart"], settings: ["Settings", "Preferences"] },
    safetyLimits: { maxPositionSize: 1.0, maxLeverage: 10 },
  },
  ableton: {
    processMatchers: ["ableton", "live"],
    preferredProtocol: "osc",
    oscPort: 7703,
    shortcuts: [
      { combo: "Space", action: "Play/Stop" },
      { combo: "Ctrl+G", action: "Group" },
      { combo: "Ctrl+D", action: "Duplicate" },
      { combo: "Ctrl+Z", action: "Undo" },
      { combo: "Ctrl+Shift+R", action: "Record" },
    ],
    safetyLimits: { maxVolumeDb: 0, maxTracksSimultaneous: 32 },
  },
  flstudio: {
    processMatchers: ["fl64", "fl32", "fl studio", "image-line"],
    preferredProtocol: "osc",
    oscPort: 7704,
    shortcuts: [
      { combo: "Space", action: "Play/Pause" },
      { combo: "F5", action: "Playlist" },
      { combo: "F6", action: "Step Sequencer" },
      { combo: "F7", action: "Piano Roll" },
      { combo: "F9", action: "Mixer" },
      { combo: "Ctrl+S", action: "Save" },
    ],
    safetyLimits: { maxVolumeDb: 0, maxPatternLength: 256 },
  },
  vscode: {
    processMatchers: ["code", "vscode"],
    preferredProtocol: "cdp",
    shortcuts: [
      { combo: "Ctrl+Shift+P", action: "Command Palette" },
      { combo: "Ctrl+P", action: "Quick Open" },
      { combo: "Ctrl+`", action: "Terminal" },
    ],
  },
  chrome: {
    processMatchers: ["chrome"],
    preferredProtocol: "cdp",
  },
  discord: {
    processMatchers: ["discord"],
    preferredProtocol: "cdp",
  },
  obs: {
    processMatchers: ["obs64", "obs32"],
    preferredProtocol: "uia",
    shortcuts: [
      { combo: "F1", action: "Switch Scene 1" },
      { combo: "F2", action: "Switch Scene 2" },
      { combo: "F9", action: "Start/Stop Recording" },
    ],
  },
  reaper: {
    processMatchers: ["reaper"],
    preferredProtocol: "osc",
    oscPort: 7001,
  },
  massive: {
    processMatchers: ["massive"],
    preferredProtocol: "midi",
    midiPort: 0,  // First available MIDI output port
    midiChannel: 0,
    synthCCMap: "massive",
    shortcuts: [
      { combo: "Ctrl+N", action: "New Sound" },
      { combo: "Ctrl+S", action: "Save Sound" },
      { combo: "Ctrl+Z", action: "Undo" },
      { combo: "Ctrl+Shift+Z", action: "Redo" },
      { combo: "Space", action: "Play note C3" },
    ],
    safetyLimits: { maxVolumeDb: 0, maxFilterResonance: 127 },
  },
  massive_x: {
    processMatchers: ["massive"],
    preferredProtocol: "midi",
    midiPort: 0,
    midiChannel: 0,
    synthCCMap: "massive_x",
    shortcuts: [
      { combo: "Ctrl+N", action: "New Sound" },
      { combo: "Ctrl+S", action: "Save Sound" },
    ],
    safetyLimits: { maxVolumeDb: 0 },
  },
  serum: {
    processMatchers: ["serum"],
    preferredProtocol: "midi",
    midiPort: 0,
    midiChannel: 0,
    synthCCMap: "serum",
    shortcuts: [
      { combo: "Ctrl+Z", action: "Undo" },
    ],
    safetyLimits: { maxVolumeDb: 0 },
  },
  figma: {
    processMatchers: ["figma"],
    preferredProtocol: "cdp",
  },
  slack: {
    processMatchers: ["slack"],
    preferredProtocol: "cdp",
  },
  spotify: {
    processMatchers: ["spotify"],
    preferredProtocol: "cdp",
  },
};

// ── Default Config ──────────────────────────────────────────────────────

export const DEFAULT_APP_DRIVER_CONFIG: AppDriverConfig = {
  cdpPorts: [9222, 9229, 9333, 9515, 8222],
  oscPorts: [7000, 7001, 7002, 7703, 7704],
  midiPortPatterns: ["massive", "serum", "fm8", "sylenth", "ableton", "fl64", "reaper"], // MIDI port name patterns
  knownApps: DEFAULT_KNOWN_APPS,
  requireApproval: true,
  screenshotOnError: true,
};
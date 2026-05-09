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
    midiPort?: number;
    midiPortName?: string;
    midiChannel?: number;
    synthCCMap?: string;
    surface: string[];
    confidence: number;
}
export interface ControlAction {
    type: "click" | "type" | "shortcut" | "menu" | "scroll" | "select" | "toggle" | "drag" | "wait" | "screenshot" | "custom" | "note" | "cc" | "nrpn" | "program_change" | "pitch_bend" | "parameter" | "patch" | "chord" | "osc_message";
    target?: string;
    value?: string;
    coordinates?: {
        x: number;
        y: number;
    };
    modifiers?: string[];
    delay?: number;
}
export interface ControlResult {
    success: boolean;
    layer: ProtocolLayer;
    action: string;
    result?: any;
    screenshot?: string;
    error?: string;
}
export interface SurfaceControl {
    id: string;
    label: string;
    type: "button" | "input" | "slider" | "dropdown" | "checkbox" | "tab" | "menu" | "shortcut" | "region";
    selector: string;
    value?: string;
    bounds?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    enabled: boolean;
    layer: ProtocolLayer;
}
export interface SurfaceMap {
    appId: string;
    appName: string;
    timestamp: number;
    controls: SurfaceControl[];
    regions: Array<{
        name: string;
        bounds: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    }>;
    shortcuts: Array<{
        combo: string;
        action: string;
    }>;
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
    shortcuts?: Array<{
        combo: string;
        action: string;
    }>;
    /** Known menu paths for common operations */
    menus?: Record<string, string[]>;
    /** Safety limits */
    safetyLimits?: Record<string, any>;
}
export declare const DEFAULT_KNOWN_APPS: Record<string, AppPattern>;
export declare const DEFAULT_APP_DRIVER_CONFIG: AppDriverConfig;
//# sourceMappingURL=types.d.ts.map
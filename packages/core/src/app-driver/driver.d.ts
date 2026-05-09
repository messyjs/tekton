/**
 * App Driver — Universal software control layer.
 *
 * Ties together all protocol layers in a smart cascade:
 *   Synths/Plugins: MIDI → Hotkeys → Screenshot
 *   DAWs: OSC → MIDI → UIAutomation → Hotkeys → Screenshot
 *   Web/Electron: CDP → UIAutomation → Hotkeys → Screenshot
 *   Native apps: UIAutomation → Hotkeys → Screenshot
 *
 * Usage:
 *   const driver = new AppDriver();
 *   const apps = await driver.discover();
 *   const massive = await driver.connect('massive');
 *   await massive.execute({ type: 'cc', target: 'filter1Cutoff', value: '64' });
 *   await massive.execute({ type: 'note', target: 'C4', value: '100' });
 */
import type { AppDriverConfig, DiscoveredApp, ControlAction, ControlResult, SurfaceControl, SurfaceMap, ProtocolLayer } from "./types.js";
export declare class ConnectedApp {
    readonly info: DiscoveredApp;
    readonly config: AppDriverConfig;
    private cdpDriver;
    private uiaDriver;
    private midiDriver;
    private oscDriver;
    private _connected;
    private _surface;
    constructor(info: DiscoveredApp, config: AppDriverConfig);
    get appName(): string;
    get pid(): number;
    get protocol(): ProtocolLayer;
    get connected(): boolean;
    get surface(): SurfaceControl[];
    /** Connect to the app using its best available protocol */
    connect(): Promise<boolean>;
    /** Disconnect from the app */
    disconnect(): void;
    /** Execute a control action through the best available protocol */
    execute(action: ControlAction): Promise<ControlResult>;
    /** Try a single protocol for an action */
    private tryProtocol;
    /** Execute via MIDI — the precision control layer for synthesizers */
    private executeMIDI;
    /** Execute via real OSC (UDP datagrams) */
    private executeRealOSC;
    /** Get the OSC address map for this app */
    private getAppOSCMap;
    /** Execute via CDP */
    private executeCDP;
    /** Execute via UIAutomation */
    private executeUIA;
    /** Execute via Hotkey */
    private executeHotkey;
    /** Screenshot fallback */
    private executeScreenshot;
    /** Learn the app's control surface */
    learnSurface(): Promise<SurfaceMap>;
}
export declare class AppDriver {
    readonly config: AppDriverConfig;
    private apps;
    private lastDiscovery;
    constructor(config?: Partial<AppDriverConfig>);
    /** Discover all running apps and their control surfaces */
    discover(): Promise<DiscoveredApp[]>;
    /** Connect to a specific app by name */
    connect(appQuery: string): Promise<ConnectedApp | null>;
    disconnect(appQuery: string): void;
    disconnectAll(): void;
    get(appQuery: string): ConnectedApp | null;
    listConnected(): Array<{
        name: string;
        protocol: string;
        connected: boolean;
    }>;
    quickControl(appName: string, action: ControlAction): Promise<ControlResult>;
    screenshot(appName?: string): Promise<ControlResult>;
}
export declare function getAppDriver(config?: Partial<AppDriverConfig>): AppDriver;
//# sourceMappingURL=driver.d.ts.map
import type { AppProcess, DiscoveredApp, ProtocolLayer, AppPattern, AppDriverConfig } from "./types.js";
/**
 * Get all running processes with their names, PIDs, and memory usage.
 */
export declare function scanProcesses(): Promise<AppProcess[]>;
/**
 * Scan CDP debug ports to find Electron/Chromium apps with debug protocol enabled.
 */
export declare function scanCDPPorts(ports?: number[]): Promise<Array<{
    port: number;
    url: string;
    info: any;
}>>;
/**
 * Get CDP targets (tabs/windows) for a specific debug port.
 */
export declare function getCDPTargets(port: number): Promise<Array<{
    id: string;
    title: string;
    url: string;
    type: string;
}>>;
/**
 * Probe OSC endpoints to find music apps accepting OSC messages.
 * Uses a simple UDP ping — if we can connect, the port is active.
 */
export declare function scanOSCPorts(ports?: number[]): Promise<Array<{
    port: number;
    active: boolean;
}>>;
/**
 * Identify an app from its process info using known patterns.
 */
export declare function identifyApp(process: AppProcess, knownApps?: Record<string, AppPattern>): {
    appId: string;
    pattern: AppPattern;
} | null;
export declare function scanMIDIPorts(): Promise<Array<{
    port: number;
    name: string;
}>>;
/**
 * Determine best protocol layer for an app based on its process and known patterns.
 */
export declare function determineProtocol(process: AppProcess, cdpEndpoints: Array<{
    port: number;
    url: string;
    info: any;
}>, oscEndpoints: Array<{
    port: number;
    active: boolean;
}>, midiEndpoints?: Array<{
    port: number;
    name: string;
}>, knownApps?: Record<string, AppPattern>): {
    layer: ProtocolLayer;
    debugPort?: number;
    oscPort?: number;
    midiPort?: number;
    midiPortName?: string;
    cdpEndpoint?: string;
};
/**
 * Run the full discovery pipeline:
 * 1. Scan processes
 * 2. Scan CDP ports
 * 3. Scan OSC ports
 * 4. Identify apps
 * 5. Determine best protocol for each
 * 6. Return discovered apps with their control surfaces
 */
export declare function discoverApps(config?: AppDriverConfig): Promise<DiscoveredApp[]>;
//# sourceMappingURL=process-scanner.d.ts.map
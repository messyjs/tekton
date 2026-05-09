/**
 * CDP Protocol — Chrome DevTools Protocol driver for any Electron/Chromium app.
 *
 * Connects via WebSocket to CDP endpoints and provides universal control:
 * navigate, click, type, select, screenshot, evaluate JS, and more.
 * Works with TradingView, VS Code, Chrome, Discord, Slack, Figma, any Electron app.
 */
import type { ControlResult, SurfaceControl } from "./types.js";
export declare class CDPDriver {
    private port;
    private targetId?;
    private connection;
    constructor(port: number, targetId?: string);
    /** Connect to the CDP endpoint */
    connect(): Promise<boolean>;
    /** Disconnect from CDP */
    disconnect(): void;
    /**
     * Send a CDP command via HTTP/JSON protocol.
     * For full WebSocket-based CDP, we'd need 'ws' package —
     * this uses the HTTP targets endpoint for simpler operations.
     */
    private sendCommand;
    /** Navigate to a URL */
    navigate(url: string): Promise<ControlResult>;
    /** Click on an element (by CSS selector or coordinates) */
    click(selector: string): Promise<ControlResult>;
    /** Type text into a focused element */
    type(selector: string, text: string, clear?: boolean): Promise<ControlResult>;
    /** Select an option in a <select> element */
    select(selector: string, value: string): Promise<ControlResult>;
    /** Take a screenshot */
    screenshot(): Promise<ControlResult>;
    /** Evaluate JavaScript in the page */
    evaluate(expression: string): Promise<any>;
    /** Get the page's DOM structure (simplified) */
    getDOM(): Promise<ControlResult>;
    /** Discover all interactive controls in the page */
    discoverSurface(): Promise<SurfaceControl[]>;
    /** Get available CDP targets (tabs/pages) */
    getTargets(): Promise<Array<{
        id: string;
        title: string;
        url: string;
        type: string;
    }>>;
    /** Get all interactive elements matching a query */
    queryElements(selector: string): Promise<ControlResult>;
}
//# sourceMappingURL=protocol-cdp.d.ts.map
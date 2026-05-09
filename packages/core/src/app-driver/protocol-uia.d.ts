import type { ControlResult, SurfaceControl } from "./types.js";
export interface UIWindow {
    handle: number;
    title: string;
    processId: number;
    processName: string;
    className: string;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    isVisible: boolean;
    isEnabled: boolean;
    isFocused: boolean;
}
/**
 * List all windows with titles.
 */
export declare function listWindows(): Promise<UIWindow[]>;
/**
 * Find a window by title substring or process name.
 */
export declare function findWindow(query: string): Promise<UIWindow | null>;
/**
 * Focus a window by its handle.
 */
export declare function focusWindow(handle: number): Promise<boolean>;
/**
 * Get all UI Automation controls for a window.
 * Returns interactive elements: buttons, inputs, menus, sliders, etc.
 */
export declare function getControls(windowTitle: string): Promise<SurfaceControl[]>;
/**
 * Send a keyboard shortcut to the active window.
 */
export declare function sendShortcut(keys: string, windowTitle?: string): Promise<ControlResult>;
/**
 * Type text into the focused element.
 */
export declare function typeText(text: string, windowTitle?: string): Promise<ControlResult>;
/**
 * Click at specific coordinates.
 */
export declare function clickAt(x: number, y: number, windowTitle?: string): Promise<ControlResult>;
/**
 * Select a menu item by path (e.g., ["File", "Save"]).
 */
export declare function selectMenu(windowTitle: string, menuPath: string[]): Promise<ControlResult>;
/**
 * Take a screenshot of a specific window or the whole screen.
 */
export declare function takeScreenshot(windowTitle?: string): Promise<ControlResult>;
/**
 * UIAutomation Driver — controls any Windows native app.
 */
export declare class UIADriver {
    private windowTitle;
    private windowHandle?;
    constructor(windowTitle: string);
    /** Connect by finding the window */
    connect(): Promise<boolean>;
    /** Focus the window */
    focus(): Promise<boolean>;
    /** Get all controls */
    discoverSurface(): Promise<SurfaceControl[]>;
    /** Click on a control */
    click(selector: string): Promise<ControlResult>;
    /** Type text */
    type(selector: string, text: string): Promise<ControlResult>;
    /** Send keyboard shortcut */
    shortcut(combo: string): Promise<ControlResult>;
    /** Take screenshot */
    screenshot(): Promise<ControlResult>;
    /** Get window info */
    status(): Promise<UIWindow | null>;
}
//# sourceMappingURL=protocol-uia.d.ts.map
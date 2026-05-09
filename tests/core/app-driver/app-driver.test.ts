/**
 * Unit tests for App Driver — Process Scanner, Protocol Cascade, Surface Learning.
 *
 * These tests use mocks for PowerShell/exec calls since we can't run real
 * Windows automation in CI.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Types ──────────────────────────────────────────────────────────────

import type {
  AppProcess,
  DiscoveredApp,
  ProtocolLayer,
  AppPattern,
  ControlAction,
  ControlResult,
  SurfaceControl,
} from "@tekton/core";

import {
  identifyApp,
  determineProtocol,
  DEFAULT_KNOWN_APPS,
  DEFAULT_APP_DRIVER_CONFIG,
  COMMON_SHORTCUTS,
  toSendKeys,
} from "@tekton/core";

// ── App Identification ────────────────────────────────────────────────

describe("App Identification", () => {
  it("identifies TradingView by process name", () => {
    const proc: AppProcess = { pid: 1234, name: "tradingview", command: "C:\\TradingView\\tv.exe", memoryMB: 256 };
    const result = identifyApp(proc);
    expect(result).not.toBeNull();
    expect(result!.appId).toBe("tradingview");
    expect(result!.pattern.preferredProtocol).toBe("cdp");
  });

  it("identifies Ableton by process name", () => {
    const proc: AppProcess = { pid: 5678, name: "ableton live 12 suite", command: "C:\\Ableton\\Live.exe", memoryMB: 1024 };
    const result = identifyApp(proc);
    expect(result).not.toBeNull();
    expect(result!.appId).toBe("ableton");
    expect(result!.pattern.preferredProtocol).toBe("osc");
  });

  it("identifies FL Studio by process name", () => {
    const proc: AppProcess = { pid: 9012, name: "fl64", command: "C:\\Image-Line\\FL64.exe", memoryMB: 512 };
    const result = identifyApp(proc);
    expect(result).not.toBeNull();
    expect(result!.appId).toBe("flstudio");
    expect(result!.pattern.preferredProtocol).toBe("osc");
  });

  it("identifies VS Code by process name", () => {
    const proc: AppProcess = { pid: 3456, name: "code", command: "C:\\VSCode\\Code.exe", memoryMB: 380 };
    const result = identifyApp(proc);
    expect(result).not.toBeNull();
    expect(result!.appId).toBe("vscode");
    expect(result!.pattern.preferredProtocol).toBe("cdp");
  });

  it("identifies apps by command line", () => {
    const proc: AppProcess = { pid: 9999, name: "electron", command: "C:\\MyApp\\app.exe --remote-debugging-port=9222", memoryMB: 200 };
    const result = identifyApp(proc);
    // Should match "electron-app" or a known pattern
    expect(result).not.toBeNull();
  });

  it("returns null for unknown apps", () => {
    const proc: AppProcess = { pid: 7777, name: "unknownapp", command: "/usr/local/bin/unknownapp", memoryMB: 50 };
    const result = identifyApp(proc);
    expect(result).toBeNull();
  });

  it("identifies by window title", () => {
    const proc: AppProcess = { pid: 1234, name: "app", command: "", memoryMB: 100, windowTitle: "TradingView — BTCUSD Chart" };
    const result = identifyApp(proc);
    expect(result).not.toBeNull();
    expect(result!.appId).toBe("tradingview");
  });
});

// ── Protocol Determination ──────────────────────────────────────────────

describe("Protocol Determination", () => {
  it("prefers CDP for TradingView when CDP endpoint available", () => {
    const proc: AppProcess = { pid: 1234, name: "tradingview", command: "", memoryMB: 256 };
    const cdpEndpoints = [{ port: 9222, url: "ws://localhost:9222", info: { Browser: "TradingView" } }];
    const oscEndpoints = [{ port: 7000, active: true }];

    const result = determineProtocol(proc, cdpEndpoints, oscEndpoints);
    expect(result.layer).toBe("cdp");
    expect(result.debugPort).toBe(9222);
  });

  it("falls back to UIA when CDP is unavailable", () => {
    const proc: AppProcess = { pid: 1234, name: "obs64", command: "", memoryMB: 200, windowTitle: "OBS Studio" };
    const cdpEndpoints: any[] = [];
    const oscEndpoints: any[] = [];

    const result = determineProtocol(proc, cdpEndpoints, oscEndpoints);
    expect(result.layer).toBe("uia");
  });

  it("uses hotkey as last resort for apps without windows", () => {
    const proc: AppProcess = { pid: 1234, name: "background-service", command: "", memoryMB: 50 };
    const cdpEndpoints: any[] = [];
    const oscEndpoints: any[] = [];

    const result = determineProtocol(proc, cdpEndpoints, oscEndpoints);
    expect(result.layer).toBe("hotkey");
  });

  it("prefers OSC for Ableton when OSC is active", () => {
    const proc: AppProcess = { pid: 5678, name: "ableton live 12 suite", command: "", memoryMB: 1024 };
    const cdpEndpoints: any[] = [];
    const oscEndpoints = [{ port: 7703, active: true }];

    const result = determineProtocol(proc, cdpEndpoints, oscEndpoints);
    expect(result.layer).toBe("osc");
    expect(result.oscPort).toBe(7703);
  });
});

// ── Default Config ────────────────────────────────────────────────────

describe("Default App Driver Config", () => {
  it("has CDP ports configured", () => {
    expect(DEFAULT_APP_DRIVER_CONFIG.cdpPorts).toBeDefined();
    expect(DEFAULT_APP_DRIVER_CONFIG.cdpPorts!.length).toBeGreaterThan(0);
    expect(DEFAULT_APP_DRIVER_CONFIG.cdpPorts).toContain(9222);
  });

  it("has OSC ports configured", () => {
    expect(DEFAULT_APP_DRIVER_CONFIG.oscPorts).toBeDefined();
    expect(DEFAULT_APP_DRIVER_CONFIG.oscPorts!.length).toBeGreaterThan(0);
  });

  it("has safety approval enabled by default", () => {
    expect(DEFAULT_APP_DRIVER_CONFIG.requireApproval).toBe(true);
  });

  it("has known app patterns", () => {
    expect(Object.keys(DEFAULT_KNOWN_APPS).length).toBeGreaterThanOrEqual(5);
    expect(DEFAULT_KNOWN_APPS.tradingview).toBeDefined();
    expect(DEFAULT_KNOWN_APPS.ableton).toBeDefined();
    expect(DEFAULT_KNOWN_APPS.flstudio).toBeDefined();
  });
});

// ── Known App Patterns ────────────────────────────────────────────────

describe("Known App Patterns", () => {
  it("TradingView has CDP protocol and shortcuts", () => {
    const tv = DEFAULT_KNOWN_APPS.tradingview;
    expect(tv.preferredProtocol).toBe("cdp");
    expect(tv.debugPort).toBe(9222);
    expect(tv.shortcuts!.length).toBeGreaterThan(0);
    expect(tv.safetyLimits).toBeDefined();
    expect(tv.safetyLimits!.maxPositionSize).toBeDefined();
  });

  it("Ableton has OSC protocol", () => {
    const ableton = DEFAULT_KNOWN_APPS.ableton;
    expect(ableton.preferredProtocol).toBe("osc");
    expect(ableton.oscPort).toBe(7703);
    expect(ableton.safetyLimits!.maxVolumeDb).toBeDefined();
  });

  it("FL Studio has OSC protocol", () => {
    const fl = DEFAULT_KNOWN_APPS.flstudio;
    expect(fl.preferredProtocol).toBe("osc");
    expect(fl.shortcuts).toBeDefined();
    expect(fl.shortcuts!.length).toBeGreaterThan(0);
  });

  it("VS Code has CDP protocol", () => {
    const vsc = DEFAULT_KNOWN_APPS.vscode;
    expect(vsc.preferredProtocol).toBe("cdp");
  });

  it("Discord has CDP protocol", () => {
    const discord = DEFAULT_KNOWN_APPS.discord;
    expect(discord.preferredProtocol).toBe("cdp");
  });
});

// ── Hotkey Functions ──────────────────────────────────────────────────

describe("Hotkey Conversion", () => {
  it("converts Ctrl+S to ^S", () => {
    expect(toSendKeys("Ctrl+S")).toBe("^S");
  });

  it("converts Alt+F4 to %F4", () => {
    expect(toSendKeys("Alt+F4")).toBe("%F4");
  });

  it("converts Ctrl+Shift+N to ^+N", () => {
    expect(toSendKeys("Ctrl+Shift+N")).toContain("^");
    expect(toSendKeys("Ctrl+Shift+N")).toContain("+");
  });

  it("handles standalone keys", () => {
    // F5 should remain as-is for special keys
    expect(COMMON_SHORTCUTS.save).toBe("Ctrl+S");
    expect(COMMON_SHORTCUTS.undo).toBe("Ctrl+Z");
    expect(COMMON_SHORTCUTS.refresh).toBe("F5");
  });
});

// ── Control Actions ────────────────────────────────────────────────────

describe("Control Action Types", () => {
  it("supports all action types", () => {
    const actions: ControlAction["type"][] = [
      "click", "type", "shortcut", "menu", "scroll",
      "select", "toggle", "drag", "wait", "screenshot", "custom"
    ];
    expect(actions.length).toBe(11);
  });

  it("creates click action with coordinates", () => {
    const action: ControlAction = {
      type: "click",
      coordinates: { x: 100, y: 200 },
    };
    expect(action.type).toBe("click");
    expect(action.coordinates!.x).toBe(100);
    expect(action.coordinates!.y).toBe(200);
  });

  it("creates type action with target and value", () => {
    const action: ControlAction = {
      type: "type",
      target: "#search-input",
      value: "BTCUSD",
    };
    expect(action.type).toBe("type");
    expect(action.target).toBe("#search-input");
    expect(action.value).toBe("BTCUSD");
  });

  it("creates shortcut action with value", () => {
    const action: ControlAction = {
      type: "shortcut",
      value: "Ctrl+Shift+N",
    };
    expect(action.type).toBe("shortcut");
    expect(action.value).toBe("Ctrl+Shift+N");
  });

  it("creates screenshot action", () => {
    const action: ControlAction = {
      type: "screenshot",
    };
    expect(action.type).toBe("screenshot");
  });
});

// ── Surface Controls ────────────────────────────────────────────────────

describe("Surface Controls", () => {
  it("defines control types correctly", () => {
    const control: SurfaceControl = {
      id: "btn-submit",
      label: "Submit Order",
      type: "button",
      selector: "#submit-btn",
      enabled: true,
      layer: "cdp",
    };
    expect(control.type).toBe("button");
    expect(control.layer).toBe("cdp");
    expect(control.enabled).toBe(true);
  });

  it("defines input controls with value", () => {
    const control: SurfaceControl = {
      id: "input-symbol",
      label: "Symbol",
      type: "input",
      selector: "#symbol-input",
      value: "BTCUSD",
      enabled: true,
      layer: "cdp",
    };
    expect(control.value).toBe("BTCUSD");
  });

  it("defines controls with bounds", () => {
    const control: SurfaceControl = {
      id: "btn-buy",
      label: "Buy",
      type: "button",
      selector: ".buy-btn",
      bounds: { x: 100, y: 200, width: 80, height: 40 },
      enabled: true,
      layer: "uia",
    };
    expect(control.bounds!.x).toBe(100);
    expect(control.bounds!.width).toBe(80);
  });
});
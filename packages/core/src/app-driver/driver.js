import { DEFAULT_APP_DRIVER_CONFIG } from "./types.js";
import { discoverApps, identifyApp, } from "./process-scanner.js";
import { CDPDriver } from "./protocol-cdp.js";
import { UIADriver, getControls, takeScreenshot as uiaScreenshot, } from "./protocol-uia.js";
import { focusWindowByTitle, sendHotkey, sendHotkeyToWindow, pasteText, pressKey, } from "./protocol-hotkey.js";
import { MIDIDriver, CC_NUMBERS, SYNTH_CC_MAPS, noteToMidi, percentToMidi } from "./protocol-midi.js";
import { OSCDriver, getOSCAddressMap } from "./protocol-osc.js";
// ── Connected App ────────────────────────────────────────────────────────
export class ConnectedApp {
    info;
    config;
    cdpDriver = null;
    uiaDriver = null;
    midiDriver = null;
    oscDriver = null;
    _connected = false;
    _surface = [];
    constructor(info, config) {
        this.info = info;
        this.config = config;
    }
    get appName() { return this.info.process.name; }
    get pid() { return this.info.process.pid; }
    get protocol() { return this.info.protocol; }
    get connected() { return this._connected; }
    get surface() { return this._surface; }
    /** Connect to the app using its best available protocol */
    async connect() {
        switch (this.info.protocol) {
            case "midi": {
                // MIDI — preferred for synthesizers and plugins
                this.midiDriver = new MIDIDriver();
                const synthName = this.info.synthCCMap ?? this.info.process.name;
                const midiPortName = this.info.midiPortName;
                const midiPort = this.info.midiPort;
                const midiChannel = this.info.midiChannel ?? 0;
                const connected = await this.midiDriver.connect(midiPort ?? midiPortName ?? synthName, midiChannel);
                if (connected) {
                    this._connected = true;
                    this.info.surface = ["note", "cc", "nrpn", "program_change", "pitch_bend", "parameter", "patch", "chord", "scale"];
                    return true;
                }
                // Fall through to hotkey if MIDI fails
                this.midiDriver = null;
                this.info.protocol = "hotkey";
                // falls through
            }
            case "cdp":
                if (this.info.debugPort) {
                    this.cdpDriver = new CDPDriver(this.info.debugPort, this.info.process.windowTitle);
                    this._connected = await this.cdpDriver.connect();
                    if (this._connected)
                        return true;
                }
                this.info.protocol = "uia";
            // falls through
            case "uia":
                if (this.info.process.windowTitle) {
                    this.uiaDriver = new UIADriver(this.info.process.windowTitle);
                    this._connected = await this.uiaDriver.connect();
                    if (this._connected)
                        return true;
                }
                this.info.protocol = "hotkey";
            // falls through
            case "osc": {
                this.oscDriver = new OSCDriver({
                    remoteHost: "127.0.0.1",
                    remotePort: this.info.oscPort ?? 7703,
                });
                try {
                    await this.oscDriver.init();
                    this._connected = true;
                    this.info.surface = Object.keys(getOSCAddressMap(this.appName));
                    return true;
                }
                catch {
                    this.oscDriver = null;
                }
                this.info.protocol = "hotkey";
                // falls through
            }
            case "hotkey":
                if (this.info.process.windowTitle) {
                    this._connected = await focusWindowByTitle(this.info.process.windowTitle);
                    return this._connected;
                }
                return false;
            case "screenshot":
                this._connected = true;
                return true;
            default:
                return false;
        }
    }
    /** Disconnect from the app */
    disconnect() {
        if (this.cdpDriver) {
            this.cdpDriver.disconnect();
            this.cdpDriver = null;
        }
        if (this.midiDriver) {
            this.midiDriver.disconnect();
            this.midiDriver = null;
        }
        if (this.oscDriver) {
            this.oscDriver.close();
            this.oscDriver = null;
        }
        this.uiaDriver = null;
        this._connected = false;
    }
    /** Execute a control action through the best available protocol */
    async execute(action) {
        if (!this._connected) {
            return { success: false, layer: this.info.protocol, action: action.type, error: "Not connected. Call connect() first." };
        }
        // Safety check
        if (this.config.requireApproval && isDangerousAction(action)) {
            return {
                success: false,
                layer: this.info.protocol,
                action: action.type,
                error: `Action "${action.type}" requires human approval. Use the Greenlight Gate.`,
            };
        }
        if (action.delay) {
            await new Promise(r => setTimeout(r, action.delay));
        }
        const protocols = getProtocolCascade(this.info.protocol);
        for (const proto of protocols) {
            const result = await this.tryProtocol(proto, action);
            if (result.success)
                return result;
            if (result.error?.includes("not available") || result.error?.includes("not connected") || result.error?.includes("not found")) {
                continue;
            }
            return result;
        }
        return {
            success: false,
            layer: this.info.protocol,
            action: action.type,
            error: `All protocols failed for action: ${action.type}`,
        };
    }
    /** Try a single protocol for an action */
    async tryProtocol(proto, action) {
        switch (proto) {
            case "midi":
                return this.executeMIDI(action);
            case "cdp":
                if (this.cdpDriver)
                    return this.executeCDP(action);
                return { success: false, layer: "cdp", action: action.type, error: "CDP not connected" };
            case "uia":
                if (this.uiaDriver)
                    return this.executeUIA(action);
                return { success: false, layer: "uia", action: action.type, error: "UIA not connected" };
            case "osc":
                return this.executeRealOSC(action);
            case "hotkey":
                return this.executeHotkey(action);
            case "screenshot":
                return this.executeScreenshot(action);
            default:
                return { success: false, layer: proto, action: action.type, error: `Unknown protocol: ${proto}` };
        }
    }
    // ── MIDI Execution ────────────────────────────────────────────────────
    /** Execute via MIDI — the precision control layer for synthesizers */
    async executeMIDI(action) {
        if (!this.midiDriver) {
            return { success: false, layer: "midi", action: action.type, error: "MIDI not connected" };
        }
        const channel = this.info.midiChannel ?? 0;
        const synthName = this.info.synthCCMap ?? this.appName;
        switch (action.type) {
            case "note": {
                // target = note name (C4, F#3) or MIDI number, value = velocity (0-127)
                const noteNum = action.target ? noteToMidi(action.target) : 60;
                const velocity = parseInt(action.value ?? "100", 10);
                await this.midiDriver.sendNote(channel, noteNum, velocity, 500);
                return {
                    success: true,
                    layer: "midi",
                    action: "note",
                    result: { note: noteNum, velocity, channel, duration: 500 },
                };
            }
            case "cc": {
                // target = CC number or param name, value = CC value (0-127)
                const ccNum = parseInt(action.target ?? "0", 10);
                const ccVal = parseInt(action.value ?? "0", 10);
                this.midiDriver.sendCC(channel, ccNum, ccVal);
                return {
                    success: true,
                    layer: "midi",
                    action: "cc",
                    result: { channel, cc: ccNum, value: ccVal },
                };
            }
            case "parameter": {
                // target = parameter name (e.g., "filter1Cutoff"), value = value (0-127 or 0-100 as %)
                let paramValue = parseInt(action.value ?? "0", 10);
                // If value is 0-100, assume it's a percentage and convert
                if (paramValue <= 100 && action.value?.includes?.("%") || paramValue <= 100) {
                    paramValue = percentToMidi(paramValue);
                }
                const success = this.midiDriver.sendParameter(synthName, action.target ?? "", paramValue, channel);
                return {
                    success,
                    layer: "midi",
                    action: "parameter",
                    result: { synth: synthName, param: action.target, value: paramValue, channel },
                };
            }
            case "patch": {
                // value = object with param:value pairs (JSON string)
                try {
                    const patch = typeof action.value === "string" ? JSON.parse(action.value) : {};
                    this.midiDriver.sendPatch(channel, patch, synthName);
                    return {
                        success: true,
                        layer: "midi",
                        action: "patch",
                        result: { synth: synthName, params: Object.keys(patch).length, channel },
                    };
                }
                catch (err) {
                    return { success: false, layer: "midi", action: "patch", error: `Invalid patch JSON: ${err.message}` };
                }
            }
            case "nrpn": {
                // target = "msb/lsb", value = NRPN value (0-16383)
                const parts = (action.target ?? "0/0").split("/");
                const msb = parseInt(parts[0] ?? "0", 10);
                const lsb = parseInt(parts[1] ?? "0", 10);
                const nrpnVal = parseInt(action.value ?? "0", 10);
                this.midiDriver.sendNRPN(channel, msb, lsb, nrpnVal);
                return {
                    success: true,
                    layer: "midi",
                    action: "nrpn",
                    result: { channel, msb, lsb, value: nrpnVal },
                };
            }
            case "program_change": {
                const program = parseInt(action.value ?? "0", 10);
                this.midiDriver.sendProgramChange(channel, program);
                return {
                    success: true,
                    layer: "midi",
                    action: "program_change",
                    result: { channel, program },
                };
            }
            case "pitch_bend": {
                const bend = parseInt(action.value ?? "0", 10);
                this.midiDriver.sendPitchBend(channel, bend);
                return {
                    success: true,
                    layer: "midi",
                    action: "pitch_bend",
                    result: { channel, value: bend },
                };
            }
            case "chord": {
                // target = comma-separated note names, value = velocity
                const noteNames = (action.target ?? "C4,E4,G4").split(",");
                const notes = noteNames.map(n => noteToMidi(n.trim()));
                const velocity = parseInt(action.value ?? "100", 10);
                await this.midiDriver.playChord(channel, notes, velocity, 800);
                return {
                    success: true,
                    layer: "midi",
                    action: "chord",
                    result: { notes, velocity, channel },
                };
            }
            default:
                return { success: false, layer: "midi", action: action.type, error: `Unsupported MIDI action: ${action.type}. Use note/cc/parameter/patch/nrpn/chord.` };
        }
    }
    // ── OSC Execution (real UDP) ──────────────────────────────────────────
    /** Execute via real OSC (UDP datagrams) */
    async executeRealOSC(action) {
        if (!this.oscDriver) {
            return { success: false, layer: "osc", action: action.type, error: "OSC not connected" };
        }
        const host = "127.0.0.1";
        const port = this.info.oscPort ?? 7703;
        const addressMap = getOSCAddressMap(this.appName);
        switch (action.type) {
            case "osc_message": {
                // target = OSC address, value = JSON array of args
                const address = action.target ?? "/ping";
                let args = [];
                if (action.value) {
                    try {
                        args = JSON.parse(action.value);
                    }
                    catch {
                        args = [parseFloat(action.value) || action.value];
                    }
                }
                await this.oscDriver.send(host, port, address, args);
                return {
                    success: true,
                    layer: "osc",
                    action: "osc_message",
                    result: { address, args, host, port },
                };
            }
            default: {
                // Try to map action type to an OSC address
                const oscAddress = addressMap[action.type] ?? `/live/${action.type}`;
                let args = [];
                if (action.value) {
                    try {
                        args = JSON.parse(action.value);
                    }
                    catch {
                        args = [parseFloat(action.value) || action.value];
                    }
                }
                try {
                    await this.oscDriver.send(host, port, oscAddress, args);
                    return {
                        success: true,
                        layer: "osc",
                        action: action.type,
                        result: { address: oscAddress, args, host, port },
                    };
                }
                catch (err) {
                    return { success: false, layer: "osc", action: action.type, error: err.message };
                }
            }
        }
    }
    /** Get the OSC address map for this app */
    getAppOSCMap() {
        return getOSCAddressMap(this.appName);
    }
    // ── Legacy Protocol Execution ──────────────────────────────────────────
    /** Execute via CDP */
    async executeCDP(action) {
        if (!this.cdpDriver)
            return { success: false, layer: "cdp", action: action.type, error: "No CDP driver" };
        switch (action.type) {
            case "click":
                return this.cdpDriver.click(action.target ?? "");
            case "type":
                return this.cdpDriver.type(action.target ?? "input", action.value ?? "", true);
            case "select":
                return this.cdpDriver.select(action.target ?? "select", action.value ?? "");
            case "shortcut":
                return { success: true, layer: "cdp", action: "shortcut", result: "Use hotkey protocol for shortcuts" };
            default:
                return { success: false, layer: "cdp", action: action.type, error: `Unsupported CDP action: ${action.type}` };
        }
    }
    /** Execute via UIAutomation */
    async executeUIA(action) {
        if (!this.uiaDriver)
            return { success: false, layer: "uia", action: action.type, error: "No UIA driver" };
        switch (action.type) {
            case "click":
                return this.uiaDriver.click(action.target ?? "");
            case "type":
                return this.uiaDriver.type(action.target ?? "", action.value ?? "");
            case "shortcut":
                return this.uiaDriver.shortcut(combineModifiers(action.modifiers ?? [], action.value ?? ""));
            case "menu":
                return this.uiaDriver.shortcut(action.value ?? "");
            default:
                return this.uiaDriver.click(action.target ?? "");
        }
    }
    /** Execute via Hotkey */
    async executeHotkey(action) {
        const title = this.info.process.windowTitle;
        switch (action.type) {
            case "click":
                if (action.coordinates) {
                    const { clickAt } = await import("./protocol-uia.js");
                    const drv = new UIADriver(title ?? this.appName);
                    await drv.focus();
                    return clickAt(action.coordinates.x, action.coordinates.y, title ?? undefined);
                }
                return { success: false, layer: "hotkey", action: "click", error: "No coordinates for click" };
            case "type":
                if (title) {
                    await focusWindowByTitle(title);
                    await new Promise(r => setTimeout(r, 100));
                }
                return pasteText(action.value ?? "");
            case "shortcut":
                if (title)
                    return sendHotkeyToWindow(title, action.value ?? action.target ?? "");
                return sendHotkey(action.value ?? action.target ?? "");
            case "menu":
                if (title)
                    await focusWindowByTitle(title);
                await new Promise(r => setTimeout(r, 100));
                return sendHotkey(action.value ?? "");
            case "select":
            case "toggle":
                if (title)
                    await focusWindowByTitle(title);
                return pressKey("space");
            case "wait":
                await new Promise(r => setTimeout(r, action.delay ?? 1000));
                return { success: true, layer: "hotkey", action: "wait" };
            default:
                return { success: false, layer: "hotkey", action: action.type, error: `Unsupported hotkey action: ${action.type}` };
        }
    }
    /** Screenshot fallback */
    async executeScreenshot(action) {
        return uiaScreenshot(this.info.process.windowTitle || undefined);
    }
    /** Learn the app's control surface */
    async learnSurface() {
        const controls = [];
        // For MIDI apps, return CC parameter map as "controls"
        if (this.midiDriver || this.info.protocol === "midi") {
            const synthName = this.info.synthCCMap ?? this.appName;
            const ccMap = SYNTH_CC_MAPS[synthName] ?? CC_NUMBERS;
            for (const [paramName, ccNum] of Object.entries(ccMap)) {
                controls.push({
                    id: `cc${ccNum}`,
                    label: paramName,
                    type: "slider",
                    selector: `cc:${ccNum}`,
                    value: undefined,
                    enabled: true,
                    layer: "midi",
                });
            }
        }
        // For OSC apps, return address map as "controls"
        if (this.oscDriver || this.info.protocol === "osc") {
            const addrMap = getOSCAddressMap(this.appName);
            for (const [action, address] of Object.entries(addrMap)) {
                controls.push({
                    id: action,
                    label: action,
                    type: "button",
                    selector: address,
                    enabled: true,
                    layer: "osc",
                });
            }
        }
        // Try CDP
        if (this.cdpDriver) {
            try {
                const cdpControls = await this.cdpDriver.discoverSurface();
                controls.push(...cdpControls);
            }
            catch { /* CDP surface discovery failed */ }
        }
        // Try UIA
        if (this.uiaDriver || this.info.process.windowTitle) {
            try {
                const uiaControls = await getControls(this.info.process.windowTitle || this.appName);
                controls.push(...uiaControls);
            }
            catch { /* UIA surface discovery failed */ }
        }
        // Add known shortcuts
        const identified = identifyApp(this.info.process, this.config.knownApps);
        const shortcuts = identified?.pattern.shortcuts ?? [];
        this._surface = controls;
        return {
            appId: this.info.process.name,
            appName: this.info.process.windowTitle || this.info.process.name,
            timestamp: Date.now(),
            controls,
            regions: extractRegions(controls),
            shortcuts,
        };
    }
}
// ── App Driver (Main Entry) ──────────────────────────────────────────────
export class AppDriver {
    config;
    apps = new Map();
    lastDiscovery = [];
    constructor(config) {
        this.config = { ...DEFAULT_APP_DRIVER_CONFIG, ...config };
    }
    /** Discover all running apps and their control surfaces */
    async discover() {
        this.lastDiscovery = await discoverApps(this.config);
        return this.lastDiscovery;
    }
    /** Connect to a specific app by name */
    async connect(appQuery) {
        const existing = this.apps.get(appQuery.toLowerCase());
        if (existing?.connected)
            return existing;
        let apps = this.lastDiscovery;
        if (apps.length === 0) {
            apps = await this.discover();
        }
        const lower = appQuery.toLowerCase();
        const match = apps.find(a => a.process.name.toLowerCase().includes(lower) ||
            (a.process.windowTitle?.toLowerCase().includes(lower)) ||
            a.process.command.toLowerCase().includes(lower));
        if (!match) {
            const proc = { pid: 0, name: lower, command: "", memoryMB: 0 };
            const identified = identifyApp(proc, this.config.knownApps);
            if (!identified)
                return null;
            const synthetic = {
                process: { ...proc, pid: -1 },
                protocol: identified.pattern.preferredProtocol,
                surface: Object.keys(identified.pattern.menus ?? {}),
                confidence: 0.3,
            };
            const app = new ConnectedApp(synthetic, this.config);
            const connected = await app.connect();
            if (!connected)
                return null;
            this.apps.set(appQuery.toLowerCase(), app);
            return app;
        }
        const app = new ConnectedApp(match, this.config);
        const connected = await app.connect();
        if (!connected)
            return null;
        this.apps.set(appQuery.toLowerCase(), app);
        return app;
    }
    disconnect(appQuery) {
        const app = this.apps.get(appQuery.toLowerCase());
        if (app) {
            app.disconnect();
            this.apps.delete(appQuery.toLowerCase());
        }
    }
    disconnectAll() {
        for (const app of this.apps.values()) {
            app.disconnect();
        }
        this.apps.clear();
    }
    get(appQuery) {
        return this.apps.get(appQuery.toLowerCase()) ?? null;
    }
    listConnected() {
        return [...this.apps.entries()].map(([name, app]) => ({
            name,
            protocol: app.protocol,
            connected: app.connected,
        }));
    }
    async quickControl(appName, action) {
        let app = this.get(appName);
        if (!app) {
            app = await this.connect(appName);
            if (!app) {
                return { success: false, layer: "hotkey", action: action.type, error: `Could not connect to app: ${appName}` };
            }
        }
        return app.execute(action);
    }
    async screenshot(appName) {
        if (appName) {
            const app = this.get(appName) ?? await this.connect(appName);
            if (app)
                return app.execute({ type: "screenshot" });
        }
        return uiaScreenshot();
    }
}
// ── Helper Functions ─────────────────────────────────────────────────────
function getProtocolCascade(preferred) {
    const cascades = {
        midi: ["midi", "hotkey", "screenshot"],
        osc: ["osc", "midi", "uia", "hotkey"],
        cdp: ["cdp", "uia", "hotkey", "screenshot"],
        uia: ["uia", "hotkey", "screenshot"],
        hotkey: ["hotkey", "screenshot"],
        screenshot: ["screenshot"],
    };
    return cascades[preferred] ?? ["hotkey", "screenshot"];
}
function isDangerousAction(action) {
    const dangerousTypes = ["custom"];
    const dangerousTargets = ["delete", "remove", "format", "reset", "clear"];
    const dangerousValues = ["delete", "format", "reset", "clear", "rm "];
    if (dangerousTypes.includes(action.type))
        return true;
    if (action.target && dangerousTargets.some(t => action.target.toLowerCase().includes(t)))
        return true;
    if (action.value && dangerousValues.some(v => action.value.toLowerCase().includes(v)))
        return true;
    return false;
}
function combineModifiers(modifiers, key) {
    const modMap = {
        "ctrl": "^", "alt": "%", "shift": "+", "meta": "^", "cmd": "^", "win": "%",
    };
    const parts = modifiers.map(m => modMap[m.toLowerCase()] ?? m);
    return parts.length > 0 ? parts.join("") + key : key;
}
function extractRegions(controls) {
    const regions = [];
    const seen = new Set();
    for (const ctrl of controls) {
        if (ctrl.bounds && !seen.has(ctrl.label)) {
            seen.add(ctrl.label);
            regions.push({ name: ctrl.label || ctrl.id, bounds: ctrl.bounds });
        }
    }
    return regions;
}
// ── Singleton ────────────────────────────────────────────────────────────
let defaultDriver = null;
export function getAppDriver(config) {
    if (!defaultDriver) {
        defaultDriver = new AppDriver(config);
    }
    return defaultDriver;
}
//# sourceMappingURL=driver.js.map
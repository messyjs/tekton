/**
 * Process Scanner — Discovers running applications and their debug surfaces.
 *
 * Scans Windows process list, finds CDP debug ports, identifies Electron apps,
 * probes OSC endpoints, and maps each app to the best protocol layer.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
  AppProcess,
  DiscoveredApp,
  ProtocolLayer,
  AppPattern,
  AppDriverConfig,
} from "./types.js";
import { DEFAULT_KNOWN_APPS, DEFAULT_APP_DRIVER_CONFIG } from "./types.js";

const execFileAsync = promisify(execFile);

// ── Process Discovery ──────────────────────────────────────────────────

/**
 * Get all running processes with their names, PIDs, and memory usage.
 */
export async function scanProcesses(): Promise<AppProcess[]> {
  try {
    // Format: "Name PID MemUsage CommandLine"
    const { stdout } = await execFileAsync("powershell", [
      "-NoProfile", "-Command",
      `Get-Process | Where-Object { $_.MainWindowTitle -ne '' -or $_.Name -match 'tradingview|ableton|fl64|fl32|code|chrome|discord|slack|spotify|obs|reaper|figma|electron|node' } | Select-Object Id, Name, @{N='Mem';E={[math]::Round($_.WorkingSet64/1MB,1)}}, @{N='Cmd';E={$_.Path}}, @{N='Title';E={$_.MainWindowTitle}}, StartTime | ConvertTo-Json`
    ], { timeout: 15000 });

    let procs: any[];
    try {
      const parsed = JSON.parse(stdout.trim());
      procs = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }

    return procs.map((p: any) => ({
      pid: p.Id ?? p.Id,
      name: (p.Name ?? "").toLowerCase(),
      command: p.Cmd ?? "",
      memoryMB: p.Mem ?? 0,
      startTime: p.StartTime,
      windowTitle: p.Title ?? "",
    }));

  } catch {
    // Fallback: use tasklist (less detailed but always available)
    try {
      const { stdout } = await execFileAsync("tasklist", ["/FO", "CSV", "/NH"], { timeout: 10000 });
      const lines = stdout.trim().split("\n");
      return lines
        .filter(line => line.includes('"'))
        .map(line => {
          const parts = line.match(/"([^"]*)"/g) ?? [];
          const name = (parts[0] ?? "").replace(/"/g, "").toLowerCase();
          const pid = parseInt((parts[1] ?? "0").replace(/"/g, ""), 10);
          const mem = parseFloat((parts[4] ?? "0").replace(/"/g, "").replace(/[^\d.]/g, "")) || 0;
          return { pid, name, command: "", memoryMB: mem, startTime: undefined, windowTitle: "" };
        })
        .filter(p => p.pid > 0);
    } catch {
      return [];
    }
  }
}

// ── CDP Discovery ───────────────────────────────────────────────────────

/**
 * Scan CDP debug ports to find Electron/Chromium apps with debug protocol enabled.
 */
export async function scanCDPPorts(ports?: number[]): Promise<Array<{ port: number; url: string; info: any }>> {
  const cdpPorts = ports ?? DEFAULT_APP_DRIVER_CONFIG.cdpPorts!;
  const results: Array<{ port: number; url: string; info: any }> = [];

  await Promise.all(cdpPorts.map(async (port) => {
    try {
      const resp = await fetch(`http://localhost:${port}/json/version`, {
        signal: AbortSignal.timeout(2000),
      });
      if (resp.ok) {
        const info: any = await resp.json();
        results.push({ port, url: info.webSocketDebuggerUrl ?? `ws://localhost:${port}`, info });
      }
    } catch {
      // Port not active — skip
    }
  }));

  return results;
}

/**
 * Get CDP targets (tabs/windows) for a specific debug port.
 */
export async function getCDPTargets(port: number): Promise<Array<{ id: string; title: string; url: string; type: string }>> {
  try {
    const resp = await fetch(`http://localhost:${port}/json`, {
      signal: AbortSignal.timeout(3000),
    });
    const targets: any = await resp.json();
    if (!Array.isArray(targets)) return [];
    return targets.map((t: any) => ({
      id: t.id ?? "",
      title: t.title ?? "",
      url: t.url ?? "",
      type: t.type ?? "page",
    }));
  } catch {
    return [];
  }
}

// ── OSC Discovery ────────────────────────────────────────────────────────

/**
 * Probe OSC endpoints to find music apps accepting OSC messages.
 * Uses a simple UDP ping — if we can connect, the port is active.
 */
export async function scanOSCPorts(ports?: number[]): Promise<Array<{ port: number; active: boolean }>> {
  const oscPorts = ports ?? DEFAULT_APP_DRIVER_CONFIG.oscPorts!;
  const results: Array<{ port: number; active: boolean }> = [];

  // OSC is UDP — we can try TCP on the same port as a heuristic
  // (most OSC-over-TCP implementations accept TCP connections)
  for (const port of oscPorts) {
    try {
      // Try HTTP first (some OSC servers also expose REST)
      const resp = await fetch(`http://localhost:${port}/health`, {
        signal: AbortSignal.timeout(1500),
      });
      if (resp.ok || resp.status === 404) {
        results.push({ port, active: true });
        continue;
      }
    } catch {
      // Not HTTP — try raw TCP
      try {
        const { Socket } = await import("node:net");
        const socket = new Socket();
        await new Promise<void>((resolve, reject) => {
          socket.setTimeout(1500);
          socket.on("connect", () => { socket.destroy(); resolve(); });
          socket.on("error", reject);
          socket.on("timeout", () => { socket.destroy(); reject(new Error("timeout")); });
          socket.connect(port, "127.0.0.1");
        });
        results.push({ port, active: true });
      } catch {
        results.push({ port, active: false });
      }
    }
  }

  return results;
}

// ── App Identification ───────────────────────────────────────────────────

/**
 * Identify an app from its process info using known patterns.
 */
export function identifyApp(
  process: AppProcess,
  knownApps: Record<string, AppPattern> = DEFAULT_KNOWN_APPS,
): { appId: string; pattern: AppPattern } | null {
  const processName = process.name.toLowerCase();
  const command = process.command.toLowerCase();
  const title = (process.windowTitle ?? "").toLowerCase();

  for (const [appId, pattern] of Object.entries(knownApps)) {
    for (const matcher of pattern.processMatchers) {
      if (processName.includes(matcher) || command.includes(matcher) || title.includes(matcher)) {
        return { appId, pattern };
      }
    }
  }

  // Heuristic: if it has --inspect or --remote-debugging-port, it's probably Electron
  if (command.includes("--remote-debugging-port") || command.includes("--inspect")) {
    return {
      appId: "electron-app",
      pattern: {
        processMatchers: [processName],
        preferredProtocol: "cdp",
      },
    };
  }

  return null;
}

export async function scanMIDIPorts(): Promise<Array<{ port: number; name: string }>> {
  try {
    const { Output } = require("midi");
    const output = new Output();
    const portCount = output.getPortCount();
    const ports: Array<{ port: number; name: string }> = [];
    for (let i = 0; i < portCount; i++) {
      ports.push({ port: i, name: output.getPortName(i) });
    }
    output.closePort();
    return ports;
  } catch {
    return [];
  }
}

/**
 * Determine best protocol layer for an app based on its process and known patterns.
 */
export function determineProtocol(
  process: AppProcess,
  cdpEndpoints: Array<{ port: number; url: string; info: any }>,
  oscEndpoints: Array<{ port: number; active: boolean }>,
  midiEndpoints: Array<{ port: number; name: string }> = [],
  knownApps: Record<string, AppPattern> = DEFAULT_KNOWN_APPS,
): { layer: ProtocolLayer; debugPort?: number; oscPort?: number; midiPort?: number; midiPortName?: string; cdpEndpoint?: string } {
    const identified = identifyApp(process, knownApps);

    // If we know this app, use its preferred protocol
    if (identified) {
      const { pattern } = identified;

      // MIDI - preferred for synths and plugins
      if (pattern.preferredProtocol === "midi") {
        // Find a MIDI port matching this synth name
        const midiMatch = midiEndpoints.find(m =>
          m.name.toLowerCase().includes(process.name.toLowerCase())
        );
        if (midiMatch || midiEndpoints.length > 0) {
          return {
            layer: "midi",
            midiPort: midiMatch?.port ?? 0,
            midiPortName: midiMatch?.name,
            midiChannel: (pattern as any).midiChannel ?? 0,
          } as any;
        }
        // No MIDI ports — fall through to hotkey
      }

      // CDP
      if (pattern.preferredProtocol === "cdp") {
        const cdp = cdpEndpoints.find(c =>
          pattern.debugPort ? c.port === pattern.debugPort : true
        );
        if (cdp) {
          return { layer: "cdp", debugPort: cdp.port, cdpEndpoint: cdp.url };
        }
      }

      // OSC
      if (pattern.preferredProtocol === "osc") {
        const osc = oscEndpoints.find(o =>
          pattern.oscPort ? o.port === pattern.oscPort : o.active
        );
        if (osc) {
          return { layer: "osc", oscPort: osc.port };
        }
      }

      // UIA fallback
      if (pattern.preferredProtocol === "uia") {
        return { layer: "uia" };
      }
    }

    // Auto-detect: try CDP first, then MIDI (if name matches), then UIA
    for (const cdp of cdpEndpoints) {
      return { layer: "cdp", debugPort: cdp.port, cdpEndpoint: cdp.url };
    }

    // Check if process name matches a synth/DAW pattern → prefer MIDI
    const synthNames = ["massive", "serum", "fm8", "sylenth", "operator", "waverider", "vital", "diva"];
    if (synthNames.some(s => process.name.toLowerCase().includes(s)) && midiEndpoints.length > 0) {
      return { layer: "midi", midiPort: 0 };
    }

    // If it has a window title, use UIAutomation
    if (process.windowTitle && process.windowTitle.length > 0) {
      return { layer: "uia" };
    }

    return { layer: "hotkey" };
  }

// ── Full Discovery Pipeline ─────────────────────────────────────────────

/**
 * Run the full discovery pipeline:
 * 1. Scan processes
 * 2. Scan CDP ports
 * 3. Scan OSC ports
 * 4. Identify apps
 * 5. Determine best protocol for each
 * 6. Return discovered apps with their control surfaces
 */
export async function discoverApps(config?: AppDriverConfig): Promise<DiscoveredApp[]> {
  const cfg = { ...DEFAULT_APP_DRIVER_CONFIG, ...config };
  const knownApps = { ...DEFAULT_KNOWN_APPS, ...cfg.knownApps };

  const [processes, cdpEndpoints, oscEndpoints, midiEndpoints] = await Promise.all([
    scanProcesses(),
    scanCDPPorts(cfg.cdpPorts),
    scanOSCPorts(cfg.oscPorts),
    scanMIDIPorts(),
  ]);

  // Deduplicate processes (same app may appear with multiple windows)
  const seen = new Set<string>();
  const apps: DiscoveredApp[] = [];
  const cdpUsed = new Set<number>();

  for (const proc of processes) {
    // Skip tiny/background processes
    if (proc.memoryMB < 1 && !proc.windowTitle) continue;

    const key = `${proc.name}:${proc.pid}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const identified = identifyApp(proc, knownApps);
    const proto = determineProtocol(proc, cdpEndpoints, oscEndpoints, midiEndpoints, knownApps);

    // Mark CDP port as used
    if (proto.debugPort) cdpUsed.add(proto.debugPort);

    // Build initial surface from known pattern
    const surface: string[] = [];
    if (identified) {
      surface.push(...(identified.pattern.shortcuts ?? []).map(s => s.action));
      surface.push(...Object.keys(identified.pattern.menus ?? {}));
    }

    // For CDP apps, add browser-level controls
    if (proto.layer === "cdp") {
      surface.push("navigate", "click", "type", "select", "screenshot", "evaluate_javascript");
    }

    // For UIA apps, add Windows-level controls
    if (proto.layer === "uia") {
      surface.push("focus", "click", "type", "shortcut", "menu_select", "screenshot");
    }

    // For MIDI apps, add synth-level controls
    if (proto.layer === "midi" || proto.midiPort !== undefined) {
      surface.push("note", "cc", "nrpn", "program_change", "pitch_bend", "parameter", "patch", "chord", "scale");
    }

    // For OSC apps, add music-level controls
    if (proto.layer === "osc") {
      surface.push("play", "stop", "record", "set_tempo", "get_tracks", "set_volume");
    }

    apps.push({
      process: proc,
      protocol: proto.layer,
      debugPort: proto.debugPort,
      debugUrl: proto.cdpEndpoint,
      cdpEndpoint: proto.cdpEndpoint,
      oscPort: proto.oscPort,
      midiPort: proto.midiPort,
      midiPortName: proto.midiPortName,
      midiChannel: (proto as any).midiChannel,
      synthCCMap: identified?.pattern.preferredProtocol === "midi" ? identified.appId : undefined,
      surface,
      confidence: identified ? 0.9 : (proto.layer !== "hotkey" ? 0.5 : 0.2),
    });
  }

  // Find CDP endpoints that aren't mapped to any process (orphaned debuggers)
  for (const cdp of cdpEndpoints) {
    if (!cdpUsed.has(cdp.port)) {
      apps.push({
        process: {
          pid: 0,
          name: (cdp.info?.Browser ?? "unknown-browser").toLowerCase().replace(/\s+/g, "-"),
          command: "",
          memoryMB: 0,
          windowTitle: cdp.info?.Browser ?? "",
        },
        protocol: "cdp",
        debugPort: cdp.port,
        debugUrl: cdp.url,
        cdpEndpoint: cdp.url,
        surface: ["navigate", "click", "type", "select", "screenshot", "evaluate_javascript"],
        confidence: 0.7,
      });
    }
  }

  return apps.sort((a, b) => b.confidence - a.confidence);
}
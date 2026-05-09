/**
 * App Driver — Universal software control layer.
 *
 * Auto-discovers running applications, connects via the best protocol
 * (MIDI → OSC → CDP → UIAutomation → Hotkeys → Screenshot), and provides
 * a unified API to control any software on the machine.
 *
 * For synthesizers: MIDI CC/NRPN for precise parameter control
 * For DAWs: OSC for transport/track/clip control
 * For web apps: CDP for DOM-level control
 * For native apps: UIAutomation + Hotkeys
 *
 * @example
 * ```ts
 * import { getAppDriver } from "@tekton/core/app-driver";
 *
 * const driver = getAppDriver();
 * const apps = await driver.discover();
 * const massive = await driver.connect("massive");  // Connects via MIDI
 * await massive.execute({ type: "parameter", target: "filter1Cutoff", value: "50%" });
 * await massive.execute({ type: "note", target: "C4", value: "100" });
 * ```
 */

// Core driver
export { AppDriver, ConnectedApp, getAppDriver } from "./driver.js";

// Process discovery
export {
  discoverApps,
  scanProcesses,
  scanCDPPorts,
  scanOSCPorts,
  scanMIDIPorts,
  identifyApp,
  determineProtocol,
  getCDPTargets,
} from "./process-scanner.js";

// Protocol drivers
export { DEFAULT_KNOWN_APPS, DEFAULT_APP_DRIVER_CONFIG } from "./types.js";
export { CDPDriver } from "./protocol-cdp.js";
export {
  UIADriver,
  listWindows,
  findWindow,
  focusWindow,
  getControls,
  takeScreenshot,
} from "./protocol-uia.js";
export type { UIWindow } from "./protocol-uia.js";
export {
  focusWindowByTitle,
  sendHotkey,
  sendHotkeyToWindow,
  typeTextSlow,
  pasteText,
  pressKey,
  toSendKeys,
  COMMON_SHORTCUTS,
} from "./protocol-hotkey.js";

// MIDI protocol
export {
  MIDIDriver,
  CC_NUMBERS,
  MASSIVE_CC_MAP,
  SYNTH_CC_MAPS,
  SCALES,
  CHORDS,
  noteToMidi,
  midiToNote,
  percentToMidi,
  midiToPercent,
} from "./protocol-midi.js";

// OSC protocol
export {
  OSCDriver,
  ABLETON_OSC_ADDRESSES,
  FL_STUDIO_OSC_ADDRESSES,
  REAPER_OSC_ADDRESSES,
  encodeOSCMessage,
  decodeOSCMessage,
  encodeOSCBundle,
  toNTPTimetag,
  getOSCAddressMap,
} from "./protocol-osc.js";

// Types
export type {
  ProtocolLayer,
  AppProcess,
  DiscoveredApp,
  ControlAction,
  ControlResult,
  SurfaceControl,
  SurfaceMap,
  AppDriverConfig,
  AppPattern,
} from "./types.js";
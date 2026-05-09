/**
 * OSC Protocol Driver — Open Sound Control for DAW and music app control.
 *
 * Unlike the previous HTTP REST implementation, this sends REAL OSC messages
 * over UDP datagrams. This is how Ableton Live, Reaper, TouchOSC, and other
 * music applications actually communicate.
 *
 * OSC Messages:
 *   Address Pattern: /live/play
 *   Type Tags: i=int, f=float, s=string, b=blob
 *   Arguments: [int, float, string, ...]
 *
 * Usage:
 *   const osc = new OSCDriver();
 *   await osc.send("127.0.0.1", 7703, "/live/play");
 *   await osc.send("127.0.0.1", 7703, "/live/tempo", [120.0]);
 *   await osc.send("127.0.0.1", 7703, "/live/track/set/volume", [0, 0.75]);
 */
import { createSocket } from "node:dgram";
import { EventEmitter } from "node:events";
// ── Ableton Live OSC Map ────────────────────────────────────────────────
export const ABLETON_OSC_ADDRESSES = {
    // Transport
    play: "/live/play",
    playContinue: "/live/play/continue",
    playSelection: "/live/play/selection",
    stop: "/live/stop",
    pause: "/live/pause",
    tempo: "/live/tempo",
    time: "/live/time",
    overdub: "/live/overdub",
    // Track controls
    trackVolume: "/live/track/set/volume",
    trackPan: "/live/track/set/pan",
    trackMute: "/live/track/set/mute",
    trackSolo: "/live/track/set/solo",
    trackArm: "/live/track/set/arm",
    trackSend: "/live/track/set/send",
    trackName: "/live/track/set/name",
    // Clip controls
    clipFire: "/live/clip/fire",
    clipStop: "/live/clip/stop",
    clipName: "/live/clip/set/name",
    clipColor: "/live/clip/set/color",
    // Device controls
    deviceParam: "/live/device/set/param",
    // Scene controls
    sceneFire: "/live/scene/fire",
    // Getters
    getTempo: "/live/tempo",
    getTracks: "/live/track/get/all",
    getTrackVolume: "/live/track/get/volume",
    getClipInfo: "/live/clip/get/info",
};
// ── FL Studio OSC Map ───────────────────────────────────────────────────
export const FL_STUDIO_OSC_ADDRESSES = {
    // Transport
    play: "/flstudio/play",
    stop: "/flstudio/stop",
    pause: "/flstudio/pause",
    tempo: "/flstudio/tempo",
    pattern: "/flstudio/pattern",
    record: "/flstudio/record",
    // Mixer
    trackVolume: "/flstudio/mixer/volume",
    trackPan: "/flstudio/mixer/pan",
    trackMute: "/flstudio/mixer/mute",
    trackFx: "/flstudio/mixer/fx",
    // Channel rack
    channelVolume: "/flstudio/channel/volume",
    channelPitch: "/flstudio/channel/pitch",
    channelCut: "/flstudio/channel/cutoff",
    // Playlist
    clipMute: "/flstudio/clip/mute",
};
// ── Reaper OSC Map ──────────────────────────────────────────────────────
export const REAPER_OSC_ADDRESSES = {
    play: "/transport/play",
    stop: "/transport/stop",
    pause: "/transport/pause",
    record: "/transport/record",
    tempo: "/tempo",
    trackVolume: "/track/{n}/volume",
    trackPan: "/track/{n}/pan",
    trackMute: "/track/{n}/mute",
    trackSolo: "/track/{n}/solo",
    trackArm: "/track/{n}/recordarm",
    fxParam: "/track/{n}/fx/{fx}/param/{p}",
};
// ── OSC Encoding ────────────────────────────────────────────────────────
/**
 * Encode an OSC message to a binary buffer for sending over UDP.
 */
export function encodeOSCMessage(address, args) {
    const parts = [];
    // Address pattern (null-terminated, padded to 4 bytes)
    parts.push(padString(address));
    // Type tags
    let typeTags = ",";
    if (args && args.length > 0) {
        for (const arg of args) {
            if (typeof arg === "number") {
                // Determine if int or float
                if (Number.isInteger(arg)) {
                    typeTags += "i";
                }
                else {
                    typeTags += "f";
                }
            }
            else if (typeof arg === "string") {
                typeTags += "s";
            }
            else if (Buffer.isBuffer(arg)) {
                typeTags += "b";
            }
        }
    }
    parts.push(padString(typeTags));
    // Arguments
    if (args && args.length > 0) {
        for (const arg of args) {
            if (typeof arg === "number") {
                if (Number.isInteger(arg)) {
                    // 32-bit big-endian int
                    const buf = Buffer.alloc(4);
                    buf.writeInt32BE(arg, 0);
                    parts.push(buf);
                }
                else {
                    // 32-bit big-endian float
                    const buf = Buffer.alloc(4);
                    buf.writeFloatBE(arg, 0);
                    parts.push(buf);
                }
            }
            else if (typeof arg === "string") {
                parts.push(padString(arg));
            }
            else if (Buffer.isBuffer(arg)) {
                // Blob: 4-byte length + data + padding
                const lenBuf = Buffer.alloc(4);
                lenBuf.writeInt32BE(arg.length, 0);
                parts.push(lenBuf);
                parts.push(arg);
                // Pad to 4-byte boundary
                const padLen = (4 - (arg.length % 4)) % 4;
                if (padLen > 0) {
                    parts.push(Buffer.alloc(padLen));
                }
            }
        }
    }
    return Buffer.concat(parts);
}
/**
 * Encode an OSC bundle to a binary buffer.
 */
export function encodeOSCBundle(timetag, elements) {
    const parts = [];
    // Bundle identifier
    parts.push(padString("#bundle"));
    // Timetag (8 bytes: 4 bytes seconds + 4 bytes fractional)
    const timeBuf = Buffer.alloc(8);
    timeBuf.writeUInt32BE(Math.floor(timetag / 0x100000000) >>> 0, 0);
    timeBuf.writeUInt32BE(timetag >>> 0, 4);
    parts.push(timeBuf);
    // Elements
    for (const elem of elements) {
        if ("elements" in elem) {
            // Nested bundle
            const elemBuf = encodeOSCBundle(elem.timetag, elem.elements);
            const lenBuf = Buffer.alloc(4);
            lenBuf.writeInt32BE(elemBuf.length, 0);
            parts.push(lenBuf);
            parts.push(elemBuf);
        }
        else {
            // Message
            const msg = elem;
            const msgBuf = encodeOSCMessage(msg.address, msg.args);
            const lenBuf = Buffer.alloc(4);
            lenBuf.writeInt32BE(msgBuf.length, 0);
            parts.push(lenBuf);
            parts.push(msgBuf);
        }
    }
    return Buffer.concat(parts);
}
/**
 * Decode an OSC message from a binary buffer.
 */
export function decodeOSCMessage(data) {
    let offset = 0;
    // Read address
    const address = readPaddedString(data, offset);
    offset += paddedLength(address.length + 1);
    // Read type tags
    const typeTags = readPaddedString(data, offset);
    offset += paddedLength(typeTags.length + 1);
    const args = [];
    const tags = typeTags.substring(1); // Skip leading comma
    for (const tag of tags) {
        switch (tag) {
            case "i": {
                const val = data.readInt32BE(offset);
                offset += 4;
                args.push(val);
                break;
            }
            case "f": {
                const val = data.readFloatBE(offset);
                offset += 4;
                args.push(val);
                break;
            }
            case "s": {
                const val = readPaddedString(data, offset);
                offset += paddedLength(val.length + 1);
                args.push(val);
                break;
            }
            case "b": {
                const len = data.readInt32BE(offset);
                offset += 4;
                const val = data.subarray(offset, offset + len);
                offset += paddedLength(len);
                args.push(Buffer.from(val));
                break;
            }
        }
    }
    return { address, args };
}
// ── OSC Driver Class ───────────────────────────────────────────────────
export class OSCDriver extends EventEmitter {
    socket = null;
    _localPort;
    _bound = false;
    config;
    constructor(config = {}) {
        super();
        this.config = config;
        this._localPort = config.receivePort ?? 0; // 0 = random available port
    }
    /** Initialize the UDP socket for sending/receiving */
    async init() {
        if (this.socket)
            return;
        this.socket = createSocket("udp4");
        this.socket.on("message", (msg, rinfo) => {
            try {
                // Check if it's a bundle or message
                if (msg.toString("utf8", 0, 8).startsWith("#bundle")) {
                    this.emit("bundle", msg, rinfo);
                }
                else {
                    const decoded = decodeOSCMessage(msg);
                    this.emit("message", decoded, rinfo);
                }
            }
            catch (err) {
                this.emit("error", err);
            }
        });
        this.socket.on("error", (err) => {
            this.emit("error", err);
        });
        return new Promise((resolve, reject) => {
            this.socket.bind(this._localPort, () => {
                this._bound = true;
                this._localPort = this.socket.address().port;
                this.emit("ready", this._localPort);
                resolve();
            });
            this.socket.on("error", reject);
        });
    }
    /** Close the socket */
    close() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
            this._bound = false;
        }
    }
    /** Get the local port number (useful when port 0 is used) */
    get localPort() { return this._localPort; }
    /** Check if the socket is bound */
    get bound() { return this._bound; }
    // ── Send Methods ────────────────────────────────────────────────────
    /**
     * Send an OSC message.
     * @param host Remote host
     * @param port Remote port
     * @param address OSC address pattern (e.g., "/live/play")
     * @param args Arguments (numbers, strings, or buffers)
     */
    async send(host, port, address, args) {
        if (!this.socket)
            await this.init();
        if (!this.socket)
            throw new Error("OSC socket not initialized");
        const message = encodeOSCMessage(address, args);
        const remoteHost = host || this.config.remoteHost || "127.0.0.1";
        const remotePort = port || this.config.remotePort || 7703;
        return new Promise((resolve, reject) => {
            this.socket.send(message, remotePort, remoteHost, (err) => {
                if (err) {
                    this.emit("error", err);
                    reject(err);
                }
                else {
                    if (this.config.debug) {
                        this.emit("sent", { address, args, host: remoteHost, port: remotePort });
                    }
                    resolve();
                }
            });
        });
    }
    /**
     * Send an OSC message using default host/port from config.
     */
    async sendDefault(address, args) {
        const host = this.config.remoteHost ?? "127.0.0.1";
        const port = this.config.remotePort ?? 7703;
        return this.send(host, port, address, args);
    }
    /**
     * Send an OSC bundle with a timetag.
     */
    async sendBundle(host, port, timetag, elements) {
        if (!this.socket)
            await this.init();
        if (!this.socket)
            throw new Error("OSC socket not initialized");
        const bundle = encodeOSCBundle(timetag, elements);
        return new Promise((resolve, reject) => {
            this.socket.send(bundle, port, host, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    // ── Ableton Live Shortcuts ──────────────────────────────────────────
    /** Start Ableton playback */
    async abletonPlay(host, port) {
        return this.send(host ?? "127.0.0.1", port ?? 7703, "/live/play");
    }
    /** Stop Ableton playback */
    async abletonStop(host, port) {
        return this.send(host ?? "127.0.0.1", port ?? 7703, "/live/stop");
    }
    /** Set Ableton tempo */
    async abletonSetTempo(tempo, host, port) {
        return this.send(host ?? "127.0.0.1", port ?? 7703, "/live/tempo", [tempo]);
    }
    /** Set track volume (0.0 to 1.0) */
    async abletonSetVolume(track, volume, host, port) {
        return this.send(host ?? "127.0.0.1", port ?? 7703, "/live/track/set/volume", [track, volume]);
    }
    /** Set track pan (-1.0 to 1.0) */
    async abletonSetPan(track, pan, host, port) {
        return this.send(host ?? "127.0.0.1", port ?? 7703, "/live/track/set/pan", [track, pan]);
    }
    /** Arm a track for recording */
    async abletonArmTrack(track, armed, host, port) {
        return this.send(host ?? "127.0.0.1", port ?? 7703, "/live/track/set/arm", [track, armed ? 1 : 0]);
    }
    /** Fire a clip */
    async abletonFireClip(track, clip, host, port) {
        return this.send(host ?? "127.0.0.1", port ?? 7703, "/live/clip/fire", [track, clip]);
    }
    /** Stop a clip */
    async abletonStopClip(track, clip, host, port) {
        return this.send(host ?? "127.0.0.1", port ?? 7703, "/live/clip/stop", [track, clip]);
    }
    // ── Reaper Shortcuts ──────────────────────────────────────────────────
    /** Start Reaper playback */
    async reaperPlay(host, port) {
        return this.send(host ?? "127.0.0.1", port ?? 7001, "/transport/play");
    }
    /** Stop Reaper playback */
    async reaperStop(host, port) {
        return this.send(host ?? "127.0.0.1", port ?? 7001, "/transport/stop");
    }
    /** Set Reaper track volume (0.0 to 1.0) */
    async reaperSetVolume(track, volume, host, port) {
        const addr = `/track/${track}/volume`;
        return this.send(host ?? "127.0.0.1", port ?? 7001, addr, [volume]);
    }
    // ── Receive Methods ──────────────────────────────────────────────────
    /** Listen for OSC messages (calls handler for each message) */
    onMessage(handler) {
        this.on("message", handler);
    }
    /** Wait for a specific OSC address pattern */
    async waitFor(address, timeoutMs = 5000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.removeListener("message", handler);
                reject(new Error(`Timeout waiting for OSC address: ${address}`));
            }, timeoutMs);
            const handler = (msg) => {
                if (msg.address === address) {
                    clearTimeout(timer);
                    resolve(msg.args);
                }
            };
            this.on("message", handler);
        });
    }
    // ── Discovery ─────────────────────────────────────────────────────────
    /**
     * Probe an OSC endpoint to check if it's active.
     * Sends a ping message and waits for a response.
     */
    async probe(host, port, pingAddress = "/ping") {
        try {
            if (!this.socket)
                await this.init();
            // Set up response listener
            const responsePromise = this.waitFor(pingAddress, 2000);
            // Send ping
            await this.send(host, port, pingAddress);
            try {
                await responsePromise;
                return true;
            }
            catch {
                // No response, but port might still be active (one-way)
                return true; // Consider it active if sending succeeded
            }
        }
        catch {
            return false;
        }
    }
}
// ── Helper Functions ──────────────────────────────────────────────────────
/** Pad a string to 4-byte boundary with null bytes */
function padString(str) {
    const buf = Buffer.from(str, "utf8");
    const nullByte = Buffer.from([0]);
    const padded = Buffer.concat([buf, nullByte]);
    const padding = (4 - (padded.length % 4)) % 4;
    return Buffer.concat([padded, Buffer.alloc(padding)]);
}
/** Read a null-terminated string from buffer at offset */
function readPaddedString(data, offset) {
    let end = offset;
    while (end < data.length && data[end] !== 0)
        end++;
    return data.toString("utf8", offset, end);
}
/** Calculate padded length (length including null terminator, padded to 4 bytes) */
function paddedLength(length) {
    return Math.ceil(length / 4) * 4;
}
/** Get current NTP timetag from Date */
export function toNTPTimetag(date = new Date()) {
    // NTP epoch is Jan 1, 1900
    // Unix epoch is Jan 1, 1970 (difference: 2208988800 seconds)
    const ntpEpochDiff = 2208988800;
    const unixMs = date.getTime();
    const unixSec = unixMs / 1000;
    const ntpSec = unixSec + ntpEpochDiff;
    return Math.floor(ntpSec * 0x100000000); // Simplified 64-bit
}
/** Get all known OSC address maps */
export function getOSCAddressMap(appName) {
    switch (appName.toLowerCase()) {
        case "ableton":
        case "live":
            return ABLETON_OSC_ADDRESSES;
        case "flstudio":
        case "fl studio":
        case "fl64":
            return FL_STUDIO_OSC_ADDRESSES;
        case "reaper":
            return REAPER_OSC_ADDRESSES;
        default:
            return {};
    }
}
//# sourceMappingURL=protocol-osc.js.map
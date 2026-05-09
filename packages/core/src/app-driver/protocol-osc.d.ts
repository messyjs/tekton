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
import { RemoteInfo } from "node:dgram";
import { EventEmitter } from "node:events";
export interface OSCMessage {
    address: string;
    args?: OSCValue[];
}
export interface OSCBundle {
    timetag: number;
    elements: Array<OSCMessage | OSCBundle>;
}
export type OSCValue = number | string | Buffer;
export interface OSCDriverConfig {
    /** Local port to bind for receiving OSC messages */
    receivePort?: number;
    /** Default remote host */
    remoteHost?: string;
    /** Default remote port */
    remotePort?: number;
    /** Enable OSC message logging */
    debug?: boolean;
}
export declare const ABLETON_OSC_ADDRESSES: Record<string, string>;
export declare const FL_STUDIO_OSC_ADDRESSES: Record<string, string>;
export declare const REAPER_OSC_ADDRESSES: Record<string, string>;
/**
 * Encode an OSC message to a binary buffer for sending over UDP.
 */
export declare function encodeOSCMessage(address: string, args?: OSCValue[]): Buffer;
/**
 * Encode an OSC bundle to a binary buffer.
 */
export declare function encodeOSCBundle(timetag: number, elements: Array<OSCMessage | OSCBundle>): Buffer;
/**
 * Decode an OSC message from a binary buffer.
 */
export declare function decodeOSCMessage(data: Buffer): {
    address: string;
    args: OSCValue[];
};
export declare class OSCDriver extends EventEmitter {
    private socket;
    private _localPort;
    private _bound;
    private config;
    constructor(config?: OSCDriverConfig);
    /** Initialize the UDP socket for sending/receiving */
    init(): Promise<void>;
    /** Close the socket */
    close(): void;
    /** Get the local port number (useful when port 0 is used) */
    get localPort(): number;
    /** Check if the socket is bound */
    get bound(): boolean;
    /**
     * Send an OSC message.
     * @param host Remote host
     * @param port Remote port
     * @param address OSC address pattern (e.g., "/live/play")
     * @param args Arguments (numbers, strings, or buffers)
     */
    send(host: string, port: number, address: string, args?: OSCValue[]): Promise<void>;
    /**
     * Send an OSC message using default host/port from config.
     */
    sendDefault(address: string, args?: OSCValue[]): Promise<void>;
    /**
     * Send an OSC bundle with a timetag.
     */
    sendBundle(host: string, port: number, timetag: number, elements: OSCMessage[]): Promise<void>;
    /** Start Ableton playback */
    abletonPlay(host?: string, port?: number): Promise<void>;
    /** Stop Ableton playback */
    abletonStop(host?: string, port?: number): Promise<void>;
    /** Set Ableton tempo */
    abletonSetTempo(tempo: number, host?: string, port?: number): Promise<void>;
    /** Set track volume (0.0 to 1.0) */
    abletonSetVolume(track: number, volume: number, host?: string, port?: number): Promise<void>;
    /** Set track pan (-1.0 to 1.0) */
    abletonSetPan(track: number, pan: number, host?: string, port?: number): Promise<void>;
    /** Arm a track for recording */
    abletonArmTrack(track: number, armed: boolean, host?: string, port?: number): Promise<void>;
    /** Fire a clip */
    abletonFireClip(track: number, clip: number, host?: string, port?: number): Promise<void>;
    /** Stop a clip */
    abletonStopClip(track: number, clip: number, host?: string, port?: number): Promise<void>;
    /** Start Reaper playback */
    reaperPlay(host?: string, port?: number): Promise<void>;
    /** Stop Reaper playback */
    reaperStop(host?: string, port?: number): Promise<void>;
    /** Set Reaper track volume (0.0 to 1.0) */
    reaperSetVolume(track: number, volume: number, host?: string, port?: number): Promise<void>;
    /** Listen for OSC messages (calls handler for each message) */
    onMessage(handler: (msg: {
        address: string;
        args: OSCValue[];
    }, rinfo: RemoteInfo) => void): void;
    /** Wait for a specific OSC address pattern */
    waitFor(address: string, timeoutMs?: number): Promise<OSCValue[]>;
    /**
     * Probe an OSC endpoint to check if it's active.
     * Sends a ping message and waits for a response.
     */
    probe(host: string, port: number, pingAddress?: string): Promise<boolean>;
}
/** Get current NTP timetag from Date */
export declare function toNTPTimetag(date?: Date): number;
/** Get all known OSC address maps */
export declare function getOSCAddressMap(appName: string): Record<string, string>;
//# sourceMappingURL=protocol-osc.d.ts.map
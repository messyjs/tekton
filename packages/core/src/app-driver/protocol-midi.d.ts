/**
 * MIDI Protocol Driver — Direct parameter control for synthesizers and DAWs.
 *
 * MIDI is the highest-fidelity protocol for controlling music software.
 * Every knob, slider, and parameter in a synth plugin maps to a MIDI CC number.
 * This is far more reliable than UIAutomation or hotkey clicking.
 *
 * Standard MIDI CC assignments:
 *   CC 1  = Modulation Wheel
 *   CC 2  = Breath Controller
 *   CC 4  = Foot Controller
 *   CC 5  = Portamento Time
 *   CC 7  = Channel Volume
 *   CC 8  = Balance
 *   CC 10 = Pan
 *   CC 11 = Expression
 *   CC 64 = Sustain Pedal
 *   CC 65 = Portamento On/Off
 *   CC 71 = Resonance (Filter)
 *   CC 74 = Brightness / Cutoff (Filter)
 *   CC 76 = Decay
 *   CC 77 = Attack
 *   CC 78 = Release
 *   CC 91 = Reverb Depth
 *   CC 93 = Chorus Depth
 *
 * Usage:
 *   const driver = new MIDIDriver();
 *   await driver.open('Massive Virtual Input', 0);
 *   await driver.sendCC(0, 74, 64);        // Filter cutoff → 50%
 *   await driver.sendNote(0, 60, 100, 500); // Middle C, velocity 100, 500ms
 */
import { EventEmitter } from "node:events";
export interface MIDIMessage {
    status: number;
    data1: number;
    data2: number;
    timestamp?: number;
}
export interface NoteOnParams {
    channel: number;
    note: number;
    velocity: number;
}
export interface NoteOffParams {
    channel: number;
    note: number;
    velocity?: number;
}
export interface CCParams {
    channel: number;
    cc: number;
    value: number;
}
export interface NRPNParams {
    channel: number;
    msb: number;
    lsb: number;
    value: number;
}
export interface ProgramChangeParams {
    channel: number;
    program: number;
}
export interface PitchBendParams {
    channel: number;
    value: number;
}
export interface AftertouchParams {
    channel: number;
    pressure: number;
}
export interface PolyAftertouchParams {
    channel: number;
    note: number;
    pressure: number;
}
export declare const CC_NUMBERS: Record<string, number>;
export declare const MASSIVE_CC_MAP: Record<string, number>;
export declare const SYNTH_CC_MAPS: Record<string, Record<string, number>>;
export declare class MIDIDriver extends EventEmitter {
    private output;
    private input;
    private _portName;
    private _portNumber;
    private _connected;
    private _virtualPort;
    private _channel;
    private _noteTimers;
    /** List available MIDI output ports */
    listOutputPorts(): Promise<Array<{
        port: number;
        name: string;
    }>>;
    /** List available MIDI input ports (for feedback) */
    listInputPorts(): Promise<Array<{
        port: number;
        name: string;
    }>>;
    /**
     * Connect to a MIDI output port.
     * @param portNameOrNumber - Port name substring or port number
     * @param channel - Default MIDI channel (0-15, default 0)
     */
    connect(portNameOrNumber?: string | number, channel?: number): Promise<boolean>;
    /**
     * Create a virtual MIDI output port (Windows: uses teVirtualMIDI)
     */
    createVirtualPort(name?: string): Promise<boolean>;
    /** Disconnect from MIDI port */
    disconnect(): void;
    get connected(): boolean;
    get portName(): string;
    get channel(): number;
    /** Send a raw MIDI message */
    sendRaw(status: number, data1: number, data2: number): void;
    /** Send a Note On message */
    sendNoteOn(channel: number, note: number, velocity?: number): void;
    /** Send a Note Off message */
    sendNoteOff(channel: number, note: number, velocity?: number): void;
    /** Send a Note On with automatic Note Off after duration */
    sendNote(channel: number, note: number, velocity?: number, durationMs?: number): Promise<void>;
    /** Send Control Change (CC) */
    sendCC(channel: number, cc: number, value: number): void;
    /** Send a CC by parameter name (using synth CC map) */
    sendParameter(synthName: string, paramName: string, value: number, channel?: number): boolean;
    /** Send NRPN (14-bit parameter) */
    sendNRPN(channel: number, msb: number, lsb: number, value: number): void;
    /** Send Program Change */
    sendProgramChange(channel: number, program: number): void;
    /** Send Pitch Bend */
    sendPitchBend(channel: number, value: number): void;
    /** Send Channel Pressure (Aftertouch) */
    sendAftertouch(channel: number, pressure: number): void;
    /** Send Polyphonic Aftertouch */
    sendPolyAftertouch(channel: number, note: number, pressure: number): void;
    /** Send All Notes Off on a channel */
    sendAllNotesOff(channel?: number): void;
    /** Play a chord (multiple notes simultaneously) */
    playChord(channel: number, notes: number[], velocity?: number, durationMs?: number): Promise<void>;
    /** Play a scale sequence */
    playScale(channel: number, rootNote: number, scale: number[], velocity?: number, noteDuration?: number, gap?: number): Promise<void>;
    /**
     * Send multiple CC values at once to program a synth patch.
     * Values should be 0-127.
     */
    sendPatch(channel: number, patch: Record<string, number>, synthName?: string): void;
}
/** Convert note name (e.g., "C4", "F#3") to MIDI note number */
export declare function noteToMidi(note: string): number;
/** Convert MIDI note number to note name */
export declare function midiToNote(midi: number): string;
/** Convert percentage (0-100) to MIDI value (0-127) */
export declare function percentToMidi(percent: number): number;
/** Convert MIDI value (0-127) to percentage (0-100) */
export declare function midiToPercent(value: number): number;
/** Scales for playScale() */
export declare const SCALES: {
    major: number[];
    minor: number[];
    dorian: number[];
    mixolydian: number[];
    pentatonic: number[];
    blues: number[];
    chromatic: number[];
};
/** Chords for playChord() */
export declare const CHORDS: {
    major: number[];
    minor: number[];
    dim: number[];
    aug: number[];
    dom7: number[];
    maj7: number[];
    min7: number[];
    sus2: number[];
    sus4: number[];
    add9: number[];
};
//# sourceMappingURL=protocol-midi.d.ts.map
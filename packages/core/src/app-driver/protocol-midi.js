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
// ── Standard CC Number Map ───────────────────────────────────────────────
export const CC_NUMBERS = {
    // Standard MIDI CC assignments (GM spec)
    bankSelect: 0,
    modulationWheel: 1,
    breathController: 2,
    footController: 4,
    portamentoTime: 5,
    dataEntryMSB: 6,
    channelVolume: 7,
    balance: 8,
    pan: 10,
    expression: 11,
    effectControl1: 12,
    effectControl2: 13,
    // Extended controllers
    sustainPedal: 64,
    portamentoOnOff: 65,
    sostenutoPedal: 66,
    softPedal: 67,
    legatoPedal: 68,
    hold2: 69,
    // Sound controllers (RP-021)
    resonantFilter: 71, // Filter Resonance
    releaseTime: 72,
    attackTime: 73,
    brightness: 74, // Filter Cutoff
    decayTime: 76,
    vibratoRate: 76,
    vibratoDepth: 77,
    vibratoDelay: 78,
    // Effects
    reverbDepth: 91,
    tremoloDepth: 92,
    chorusDepth: 93,
    celesteDepth: 94,
    phaserDepth: 95,
    // NRPN/RPN
    dataIncrement: 96,
    dataDecrement: 97,
    nrpnLSB: 98,
    nrpnMSB: 99,
    rpnLSB: 100,
    rpnMSB: 101,
    // All sounds off
    allSoundsOff: 120,
    resetAllControllers: 121,
    allNotesOff: 123,
};
// ── Massive Synth CC Map ────────────────────────────────────────────────
// Native Instruments Massive CC assignments (default mapping)
export const MASSIVE_CC_MAP = {
    // Oscillators
    osc1Pitch: 1,
    osc1Amp: 2,
    osc1Wavetable: 3,
    osc2Pitch: 4,
    osc2Amp: 5,
    osc2Wavetable: 6,
    osc3Pitch: 7,
    osc3Amp: 8,
    osc3Wavetable: 9,
    // Filters
    filter1Cutoff: 74, // CC74 = standard cutoff
    filter1Resonance: 71, // CC71 = standard resonance
    filter1Amp: 10,
    filter2Cutoff: 15,
    filter2Resonance: 16,
    filter2Amp: 17,
    // Envelopes
    env1Attack: 20,
    env1Decay: 21,
    env1Sustain: 22,
    env1Release: 23,
    env2Attack: 24,
    env2Decay: 25,
    env2Sustain: 26,
    env2Release: 27,
    env3Attack: 28,
    env3Decay: 29,
    env3Sustain: 30,
    env3Release: 31,
    env4Attack: 32,
    env4Decay: 33,
    env4Sustain: 34,
    env4Release: 35,
    // LFOs
    lfo1Rate: 40,
    lfo1Amp: 41,
    lfo2Rate: 42,
    lfo2Amp: 43,
    lfo3Rate: 44,
    lfo3Amp: 45,
    lfo4Rate: 46,
    lfo4Amp: 47,
    lfo5Rate: 48,
    lfo5Amp: 49,
    lfo6Rate: 50,
    lfo6Amp: 51,
    // FX
    fx1Amount: 52,
    fx2Amount: 53,
    fxMix: 54,
    // Master
    masterVolume: 7, // CC7 = standard volume
    // Noise
    noiseAmp: 12,
    noiseColor: 13,
};
// ── Synth Parameter Maps ───────────────────────────────────────────────
// Maps parameter name → CC number for known synths
export const SYNTH_CC_MAPS = {
    massive: MASSIVE_CC_MAP,
    massive_x: MASSIVE_CC_MAP, // Same CC map for Massive X
    serum: {
        osc1Volume: 1,
        osc2Volume: 2,
        osc1Warp: 3,
        osc2Warp: 4,
        filterCutoff: 74,
        filterResonance: 71,
        filterMix: 10,
        envAAttack: 20,
        envADecay: 21,
        envASustain: 22,
        envARelease: 23,
        lfo1Rate: 40,
        lfo1Amp: 41,
        masterVolume: 7,
        noiseAmp: 12,
    },
    fm8: {
        operator1Level: 1,
        operator2Level: 2,
        operator3Level: 3,
        operator4Level: 4,
        operator5Level: 5,
        operator6Level: 6,
        operator7Level: 7,
        operator8Level: 8,
        filterCutoff: 74,
        filterResonance: 71,
        masterVolume: 7,
    },
    sylenth1: {
        osc1Volume: 1,
        osc2Volume: 2,
        osc1Detune: 3,
        osc2Detune: 4,
        filterACutoff: 74,
        filterAResonance: 71,
        envAAttack: 20,
        envADecay: 21,
        filterEnvAttack: 24,
        filterEnvDecay: 25,
        lfo1Rate: 40,
        lfo1Amp: 41,
        masterVolume: 7,
    },
};
// ── MIDI Driver ─────────────────────────────────────────────────────────
export class MIDIDriver extends EventEmitter {
    output = null; // midi.Output instance
    input = null; // midi.Input instance (for feedback)
    _portName = "";
    _portNumber = -1;
    _connected = false;
    _virtualPort = false;
    _channel = 0;
    _noteTimers = new Map();
    /** List available MIDI output ports */
    async listOutputPorts() {
        try {
            const { Output, Input } = require("midi");
            const output = new Output();
            const portCount = output.getPortCount();
            const ports = [];
            for (let i = 0; i < portCount; i++) {
                ports.push({ port: i, name: output.getPortName(i) });
            }
            output.closePort();
            return ports;
        }
        catch (err) {
            // If midi package not available, return empty list
            this.emit("warning", `MIDI not available: ${err.message}`);
            return [];
        }
    }
    /** List available MIDI input ports (for feedback) */
    async listInputPorts() {
        try {
            const { Output, Input } = require("midi");
            const input = new Input();
            const portCount = input.getPortCount();
            const ports = [];
            for (let i = 0; i < portCount; i++) {
                ports.push({ port: i, name: input.getPortName(i) });
            }
            input.closePort();
            return ports;
        }
        catch {
            return [];
        }
    }
    /**
     * Connect to a MIDI output port.
     * @param portNameOrNumber - Port name substring or port number
     * @param channel - Default MIDI channel (0-15, default 0)
     */
    async connect(portNameOrNumber, channel = 0) {
        try {
            const { Output, Input } = require("midi");
            this.output = new Output();
            const ports = await this.listOutputPorts();
            let portIndex;
            if (typeof portNameOrNumber === "number") {
                portIndex = portNameOrNumber;
            }
            else if (typeof portNameOrNumber === "string") {
                // Find by name substring match
                const match = ports.find(p => p.name.toLowerCase().includes(portNameOrNumber.toLowerCase()));
                if (match) {
                    portIndex = match.port;
                }
                else {
                    // Try to create a virtual port
                    // On Windows with teVirtualMIDI, we can open the virtual port
                    this.emit("info", `No port matching "${portNameOrNumber}" found. Available: ${ports.map(p => p.name).join(", ")}`);
                    return false;
                }
            }
            else {
                // No port specified — use first available
                if (ports.length === 0) {
                    this.emit("warning", "No MIDI output ports available");
                    return false;
                }
                portIndex = 0;
            }
            if (portIndex < 0 || portIndex >= (await this.listOutputPorts()).length) {
                this.emit("error", `Invalid MIDI port: ${portIndex}`);
                return false;
            }
            this.output.openPort(portIndex);
            this._portNumber = portIndex;
            this._portName = ports.find(p => p.port === portIndex)?.name ?? `Port ${portIndex}`;
            this._channel = channel;
            this._connected = true;
            this.emit("connected", { port: portIndex, name: this._portName, channel });
            return true;
        }
        catch (err) {
            this.emit("error", `MIDI connect failed: ${err.message}`);
            return false;
        }
    }
    /**
     * Create a virtual MIDI output port (Windows: uses teVirtualMIDI)
     */
    async createVirtualPort(name = "Tekton MIDI Out") {
        try {
            const { Output, Input } = require("midi");
            this.output = new Output();
            this.output.openVirtualPort(name);
            this._portName = name;
            this._virtualPort = true;
            this._connected = true;
            this.emit("connected", { port: -1, name, virtual: true });
            return true;
        }
        catch (err) {
            // Virtual ports may not be supported on all platforms
            this.emit("warning", `Virtual port not supported: ${err.message}. Using hardware port instead.`);
            // Fallback: try to connect to first available port
            return this.connect(0);
        }
    }
    /** Disconnect from MIDI port */
    disconnect() {
        // Cancel any pending note-off timers
        for (const timer of this._noteTimers.values()) {
            clearTimeout(timer);
        }
        this._noteTimers.clear();
        if (this.output) {
            try {
                // Send All Notes Off
                for (let ch = 0; ch < 16; ch++) {
                    this.sendRaw(0xB0 | ch, 123, 0); // CC123 = All Notes Off
                }
                this.output.closePort();
            }
            catch { /* ignore close errors */ }
            this.output = null;
        }
        this._connected = false;
        this.emit("disconnected");
    }
    get connected() { return this._connected; }
    get portName() { return this._portName; }
    get channel() { return this._channel; }
    // ── Raw MIDI ──────────────────────────────────────────────────────────
    /** Send a raw MIDI message */
    sendRaw(status, data1, data2) {
        if (!this._connected || !this.output) {
            this.emit("warning", "MIDI not connected");
            return;
        }
        this.output.sendMessage([status & 0xFF, data1 & 0x7F, data2 & 0x7F]);
    }
    // ── High-Level MIDI ───────────────────────────────────────────────────
    /** Send a Note On message */
    sendNoteOn(channel, note, velocity = 100) {
        this.sendRaw(0x90 | (channel & 0x0F), note & 0x7F, velocity & 0x7F);
    }
    /** Send a Note Off message */
    sendNoteOff(channel, note, velocity = 0) {
        this.sendRaw(0x80 | (channel & 0x0F), note & 0x7F, velocity & 0x7F);
    }
    /** Send a Note On with automatic Note Off after duration */
    async sendNote(channel, note, velocity = 100, durationMs = 500) {
        this.sendNoteOn(channel, note, velocity);
        // Schedule Note Off
        return new Promise(resolve => {
            const key = `${channel}:${note}`;
            // Clear any existing timer for this note
            const existing = this._noteTimers.get(key);
            if (existing)
                clearTimeout(existing);
            const timer = setTimeout(() => {
                this.sendNoteOff(channel, note, 0);
                this._noteTimers.delete(key);
                resolve();
            }, durationMs);
            this._noteTimers.set(key, timer);
        });
    }
    /** Send Control Change (CC) */
    sendCC(channel, cc, value) {
        this.sendRaw(0xB0 | (channel & 0x0F), cc & 0x7F, value & 0x7F);
    }
    /** Send a CC by parameter name (using synth CC map) */
    sendParameter(synthName, paramName, value, channel = 0) {
        const ccMap = SYNTH_CC_MAPS[synthName.toLowerCase()] ?? CC_NUMBERS;
        const ccNumber = ccMap[paramName] ?? CC_NUMBERS[paramName];
        if (ccNumber === undefined) {
            this.emit("warning", `Unknown parameter "${paramName}" for synth "${synthName}"`);
            return false;
        }
        this.sendCC(channel, ccNumber, value);
        return true;
    }
    /** Send NRPN (14-bit parameter) */
    sendNRPN(channel, msb, lsb, value) {
        // NRPN is sent as 4 CC messages:
        // CC99 = Parameter MSB
        // CC98 = Parameter LSB
        // CC6  = Data Entry MSB
        // CC38 = Data Entry LSB (optional, for 14-bit values)
        this.sendCC(channel, 99, msb & 0x7F); // NRPN MSB
        this.sendCC(channel, 98, lsb & 0x7F); // NRPN LSB
        this.sendCC(channel, 6, (value >> 7) & 0x7F); // Data MSB
        this.sendCC(channel, 38, value & 0x7F); // Data LSB
    }
    /** Send Program Change */
    sendProgramChange(channel, program) {
        this.sendRaw(0xC0 | (channel & 0x0F), program & 0x7F, 0);
    }
    /** Send Pitch Bend */
    sendPitchBend(channel, value) {
        // Pitch bend is 14-bit: value is -8192 to 8191, sent as two 7-bit bytes
        const normalized = value + 8192; // Offset to 0-16383
        const lsb = normalized & 0x7F;
        const msb = (normalized >> 7) & 0x7F;
        this.sendRaw(0xE0 | (channel & 0x0F), lsb, msb);
    }
    /** Send Channel Pressure (Aftertouch) */
    sendAftertouch(channel, pressure) {
        this.sendRaw(0xD0 | (channel & 0x0F), pressure & 0x7F, 0);
    }
    /** Send Polyphonic Aftertouch */
    sendPolyAftertouch(channel, note, pressure) {
        this.sendRaw(0xA0 | (channel & 0x0F), note & 0x7F, pressure & 0x7F);
    }
    /** Send All Notes Off on a channel */
    sendAllNotesOff(channel = -1) {
        if (channel === -1) {
            for (let ch = 0; ch < 16; ch++) {
                this.sendCC(ch, 123, 0); // All Notes Off
                this.sendCC(ch, 120, 0); // All Sound Off
            }
        }
        else {
            this.sendCC(channel, 123, 0);
            this.sendCC(channel, 120, 0);
        }
    }
    // ── Convenience: Play Scale / Chord ───────────────────────────────────
    /** Play a chord (multiple notes simultaneously) */
    async playChord(channel, notes, velocity = 100, durationMs = 500) {
        // Send all Note Ons
        for (const note of notes) {
            this.sendNoteOn(channel, note, velocity);
        }
        // Wait for duration
        await new Promise(r => setTimeout(r, durationMs));
        // Send all Note Offs
        for (const note of notes) {
            this.sendNoteOff(channel, note, 0);
        }
    }
    /** Play a scale sequence */
    async playScale(channel, rootNote, scale, velocity = 80, noteDuration = 250, gap = 50) {
        for (const interval of scale) {
            await this.sendNote(channel, rootNote + interval, velocity, noteDuration);
            if (gap > 0)
                await new Promise(r => setTimeout(r, gap));
        }
    }
    // ── Preset: Program a patch ───────────────────────────────────────────
    /**
     * Send multiple CC values at once to program a synth patch.
     * Values should be 0-127.
     */
    sendPatch(channel, patch, synthName) {
        for (const [paramName, value] of Object.entries(patch)) {
            if (synthName) {
                this.sendParameter(synthName, paramName, value, channel);
            }
            else {
                // Try standard CC numbers first
                const ccNumber = CC_NUMBERS[paramName];
                if (ccNumber !== undefined) {
                    this.sendCC(channel, ccNumber, value);
                }
                else {
                    // Try as numeric CC number
                    const num = parseInt(paramName, 10);
                    if (!isNaN(num)) {
                        this.sendCC(channel, num, value);
                    }
                }
            }
        }
    }
}
// ── Note Helpers ─────────────────────────────────────────────────────────
/** Convert note name (e.g., "C4", "F#3") to MIDI note number */
export function noteToMidi(note) {
    const noteMap = {
        "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3,
        "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8,
        "A": 9, "A#": 10, "Bb": 10, "B": 11,
    };
    const match = note.match(/^([A-G][#b]?)(\d)$/);
    if (!match)
        return 60; // Default to middle C
    const noteName = match[1];
    const octave = parseInt(match[2], 10);
    return (octave + 1) * 12 + (noteMap[noteName] ?? 0);
}
/** Convert MIDI note number to note name */
export function midiToNote(midi) {
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const octave = Math.floor(midi / 12) - 1;
    const note = midi % 12;
    return `${noteNames[note]}${octave}`;
}
/** Convert percentage (0-100) to MIDI value (0-127) */
export function percentToMidi(percent) {
    return Math.round(Math.max(0, Math.min(100, percent)) * 1.27);
}
/** Convert MIDI value (0-127) to percentage (0-100) */
export function midiToPercent(value) {
    return Math.round(value / 1.27);
}
/** Scales for playScale() */
export const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11, 12],
    minor: [0, 2, 3, 5, 7, 8, 10, 12],
    dorian: [0, 2, 3, 5, 7, 9, 10, 12],
    mixolydian: [0, 2, 4, 5, 7, 9, 10, 12],
    pentatonic: [0, 2, 4, 7, 9, 12],
    blues: [0, 3, 5, 6, 7, 10, 12],
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};
/** Chords for playChord() */
export const CHORDS = {
    major: [0, 4, 7],
    minor: [0, 3, 7],
    dim: [0, 3, 6],
    aug: [0, 4, 8],
    dom7: [0, 4, 7, 10],
    maj7: [0, 4, 7, 11],
    min7: [0, 3, 7, 10],
    sus2: [0, 2, 7],
    sus4: [0, 5, 7],
    add9: [0, 4, 7, 14],
};
//# sourceMappingURL=protocol-midi.js.map
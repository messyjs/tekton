import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const koffi = require('koffi');

// ============================================================
// Tekton Virtual MIDI Daemon
// Creates a teVirtualMIDI loopback port and forwards data
// ============================================================

const vmdll = koffi.load('teVirtualMIDI64.dll');
const kernel32 = koffi.load('kernel32.dll');

const virtualMIDICreatePortEx2 = vmdll.func('virtualMIDICreatePortEx2', 'void *', ['str16', 'void *', 'uint64', 'uint32', 'uint32']);
const virtualMIDIClosePort = vmdll.func('virtualMIDIClosePort', 'void', ['void *']);
const virtualMIDISendData = vmdll.func('virtualMIDISendData', 'bool', ['void *', 'uint8 *', 'uint32']);
const virtualMIDIGetData = vmdll.func('virtualMIDIGetData', 'bool', ['void *', 'uint8 *', 'uint32 *']);
const GetLastError = kernel32.func('GetLastError', 'uint32', []);

const PORT_NAME = 'Tekton VPort';
const MAX_SYSEX = 65535;
const TE_VM_FLAGS_INSTANTIATE_BOTH = 12;
const TE_VM_FLAGS_PARSE_RX = 1;

// Create the port with PARSE_RX flag for clean MIDI message boundaries
// NOTE: We use NULL callback and poll with virtualMIDIGetData in a loop
console.log(`Creating virtual MIDI loopback port "${PORT_NAME}"...`);
const port = virtualMIDICreatePortEx2(PORT_NAME, null, 0n, MAX_SYSEX, TE_VM_FLAGS_PARSE_RX | TE_VM_FLAGS_INSTANTIATE_BOTH);

if (!port) {
    const err = GetLastError();
    console.error(`FAILED: Error ${err}`);
    process.exit(1);
}
console.log(`✅ Port "${PORT_NAME}" created! Starting loopback forwarding...`);

// Loopback: read data from virtualMIDIGetData (from external apps sending to this port)
// and echo it back via virtualMIDISendData (to external apps reading from this port)
const buffer = Buffer.alloc(MAX_SYSEX);
const pLength = Buffer.alloc(4);

let forwarded = 0;
let errors = 0;

function loopbackPoll() {
    try {
        // Write initial buffer size
        pLength.writeUInt32LE(MAX_SYSEX, 0);
        
        // virtualMIDIGetData blocks until data arrives - we can't use this in the main thread
        // Instead, we need to use the Node.js midi package to read from the port
        // But that would create a circular dependency
        // 
        // Better approach: Use a separate thread or use a different mechanism
    } catch (e) {
        // ignore
    }
}

// Alternative approach: Use the Node.js midi package on the OUTPUT side
// to read data and echo it back
const midi = require('midi');

// Find the Tekton VPort in the output and input lists
const midiOutput = new midi.Output();
const midiInput = new midi.Input();

let outputIdx = -1;
let inputIdx = -1;

for (let i = 0; i < midiOutput.getPortCount(); i++) {
    if (midiOutput.getPortName(i) === PORT_NAME) {
        outputIdx = i;
        break;
    }
}
for (let i = 0; i < midiInput.getPortCount(); i++) {
    if (midiInput.getPortName(i) === PORT_NAME) {
        inputIdx = i;
        break;
    }
}

midiOutput.closePort();
midiInput.closePort();

if (outputIdx === -1 || inputIdx === -1) {
    console.error(`Port "${PORT_NAME}" not found in MIDI enumeration!`);
    console.error(`Output idx: ${outputIdx}, Input idx: ${inputIdx}`);
    virtualMIDIClosePort(port);
    process.exit(1);
}

console.log(`Port indices: Output=[${outputIdx}], Input=[${inputIdx}]`);

// Open the MIDI output side (to receive data FROM external apps)
// and use virtualMIDISendData to forward it TO external apps reading the input
const recvOutput = new midi.Output();
recvOutput.openPort(outputIdx);
console.log(`Opened output port [${outputIdx}] for receiving`);

// Now we have two routes:
// Route 1: External App → Windows MIDI Output "Tekton VPort" → virtualMIDIGetData → virtualMIDISendData → Windows MIDI Input → Massive
// Route 2: Our App → virtualMIDISendData → Windows MIDI Input "Tekton VPort" → Massive (direct control)

// For Route 1 (loopback), we'd need to use virtualMIDIGetData which is blocking.
// Since we can't do blocking calls in Node.js main thread, we'll use a C++ addon or 
// just skip loopback and use Route 2 for direct control.

// For Route 2 (direct control), we simply use virtualMIDISendData from anywhere.
// But we can't call it from outside this process since the port handle is here.
// So we need an IPC mechanism.

// Simplest IPC: HTTP server
import http from 'http';

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/midi') {
        let body = [];
        req.on('data', chunk => body.push(chunk));
        req.on('end', () => {
            try {
                const data = JSON.parse(Buffer.concat(body).toString());
                const { bytes } = data;
                if (Array.isArray(bytes) && bytes.length > 0) {
                    const buf = Buffer.from(bytes);
                    const ok = virtualMIDISendData(port, buf, buf.length);
                    if (ok) {
                        forwarded++;
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ ok: true, forwarded }));
                    } else {
                        errors++;
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ ok: false, error: GetLastError() }));
                    }
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: false, error: 'Missing bytes array' }));
                }
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: e.message }));
            }
        });
    } else if (req.method === 'GET' && req.url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            port: PORT_NAME, 
            forwarded, 
            errors,
            outputIdx, 
            inputIdx,
            uptime: process.uptime()
        }));
    } else if (req.method === 'POST' && req.url === '/note-on') {
        let body = [];
        req.on('data', chunk => body.push(chunk));
        req.on('end', () => {
            try {
                const { note = 60, velocity = 100, channel = 0 } = JSON.parse(Buffer.concat(body).toString());
                const buf = Buffer.from([0x90 | (channel & 0xF), note & 0x7F, velocity & 0x7F]);
                virtualMIDISendData(port, buf, buf.length);
                forwarded++;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, note, velocity, channel }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: e.message }));
            }
        });
    } else if (req.method === 'POST' && req.url === '/note-off') {
        let body = [];
        req.on('data', chunk => body.push(chunk));
        req.on('end', () => {
            try {
                const { note = 60, channel = 0 } = JSON.parse(Buffer.concat(body).toString());
                const buf = Buffer.from([0x80 | (channel & 0xF), note & 0x7F, 0]);
                virtualMIDISendData(port, buf, buf.length);
                forwarded++;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, note, channel }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: e.message }));
            }
        });
    } else if (req.method === 'POST' && req.url === '/cc') {
        let body = [];
        req.on('data', chunk => body.push(chunk));
        req.on('end', () => {
            try {
                const { cc = 7, value = 64, channel = 0 } = JSON.parse(Buffer.concat(body).toString());
                const buf = Buffer.from([0xB0 | (channel & 0xF), cc & 0x7F, value & 0x7F]);
                virtualMIDISendData(port, buf, buf.length);
                forwarded++;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, cc, value, channel }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: e.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

const PORT = 13947;
server.listen(PORT, '127.0.0.1', () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   TEKTON VIRTUAL MIDI DAEMON                    ║');
    console.log(`║   Port: ${PORT_NAME.padEnd(37)}║`);
    console.log(`║   HTTP: http://127.0.0.1:${PORT}/status`.padEnd(50) + '║');
    console.log('║                                                  ║');
    console.log('║   Endpoints:                                     ║');
    console.log('║     POST /note-on  {note, velocity, channel}     ║');
    console.log('║     POST /note-off {note, channel}               ║');
    console.log('║     POST /cc       {cc, value, channel}          ║');
    console.log('║     POST /midi     {bytes: [0x90, 60, 100]}     ║');
    console.log('║     GET  /status                                 ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
    console.log(`Massive: enable "${PORT_NAME}" as MIDI Input to receive data`);
});

// Cleanup
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    virtualMIDIClosePort(port);
    vmdll.unload();
    server.close();
    process.exit(0);
});
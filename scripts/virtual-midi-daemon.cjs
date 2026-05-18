const koffi = require('koffi');
const vmdll = koffi.load('teVirtualMIDI64.dll');
const kernel32 = koffi.load('kernel32.dll');

const virtualMIDICreatePortEx2 = vmdll.func('virtualMIDICreatePortEx2', 'void *', ['str16', 'void *', 'uint64', 'uint32', 'uint32']);
const virtualMIDIClosePort = vmdll.func('virtualMIDIClosePort', 'void', ['void *']);
const virtualMIDISendData = vmdll.func('virtualMIDISendData', 'bool', ['void *', 'uint8 *', 'uint32']);
const virtualMIDIGetData = vmdll.func('virtualMIDIGetData', 'bool', ['void *', 'uint8 *', 'uint32 *']); // not used, just loopback forwarding

// Create bidirectional virtual MIDI port
const PORT_NAME = 'Tekton VPort';
const TE_VM_FLAGS_INSTANTIATE_BOTH = 12;
const MAX_SYSEX = 65535;

console.log(`Creating virtual MIDI port "${PORT_NAME}"...`);
const port = virtualMIDICreatePortEx2(PORT_NAME, null, 0n, MAX_SYSEX, TE_VM_FLAGS_INSTANTIATE_BOTH);

if (!port || port === null) {
    const GetLastError = kernel32.func('GetLastError', 'uint32', []);
    console.error(`FAILED to create port! Error: ${GetLastError()}`);
    process.exit(1);
}

console.log(`✅ Virtual MIDI port "${PORT_NAME}" created!`);
console.log('  This port is a LOOPBACK - data sent to it will be echoed back.');
console.log('  Keeping port alive until process is killed...');
console.log('  Press Ctrl+C to close the port and exit.');

// Keep the process alive
process.on('SIGINT', () => {
    console.log('\nClosing port...');
    virtualMIDIClosePort(port);
    console.log('Port closed. Exiting.');
    vmdll.unload();
    process.exit(0);
});

// Prevent process from exiting
setInterval(() => {}, 60000);

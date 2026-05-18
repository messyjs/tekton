const koffi = require('koffi');
const vmdll = koffi.load('C:\Windows\System32\teVirtualMIDI64.dll');
const virtualMIDICreatePort = vmdll.func('virtualMIDICreatePort', 'void *', ['str16']);

console.log('Creating virtual MIDI port "TektonMIDI" (admin)...');
const port = virtualMIDICreatePort('TektonMIDI');
console.log('Handle:', port);

if (port && !koffi.isNull(port)) {
  console.log('SUCCESS!');
  // Keep port alive for 2 minutes
  setTimeout(() => { virtualMIDIClosePort(port); process.exit(0); }, 120000);
} else {
  console.log('FAILED');
  process.exit(1);
}

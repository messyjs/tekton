const midi = require('midi');

const out = new midi.Output();
out.openPort(0); // Maschine Plus Virtual

console.log('Playing C major chord (C4, E4, G4) on Maschine Plus Virtual...');

// Play C4
out.sendMessage([0x90, 60, 100]);
// Play E4
out.sendMessage([0x90, 64, 100]);
// Play G4
out.sendMessage([0x90, 67, 100]);

// Hold for 1 second
setTimeout(() => {
  // Note off
  out.sendMessage([0x80, 60, 0]);
  out.sendMessage([0x80, 64, 0]);
  out.sendMessage([0x80, 67, 0]);
  console.log('Chord off.');
  
  // Play a melody
  setTimeout(() => {
    const notes = [60, 64, 67, 72, 67, 64, 60];
    let i = 0;
    const interval = setInterval(() => {
      if (i < notes.length) {
        out.sendMessage([0x90, notes[i], 100]);
        const noteNum = notes[i];
        setTimeout(() => out.sendMessage([0x80, noteNum, 0]), 300);
        i++;
      } else {
        clearInterval(interval);
        out.closePort();
        console.log('Done!');
        process.exit(0);
      }
    }, 400);
  }, 500);
}, 1000);


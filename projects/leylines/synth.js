// Simple Tone.js synth & mapping functions
const synth = new Tone.Synth({
  oscillator: { type: 'sine' },
  envelope: { attack: 0.1, release: 1 }
}).toDestination();

function playNoteFromPos(x, y) {
  // Map x → pitch, y → velocity
  const note = Tone.Frequency(200 + x/width * 800, 'Hz').toNote();
  const vel  = 1 - y/height;
  synth.triggerAttackRelease(note, 0.5, undefined, vel);
}

function modSynth(param, value) {
  // e.g. change filter cutoff or detune
  // synth.set({ detune: value * 100 });
}

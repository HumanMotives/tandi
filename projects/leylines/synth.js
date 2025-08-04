// synth.js

// --- 1) Create three simple synths and connect them directly to output ---
const pad = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'triangle' },
  envelope:   { attack: 1.5, release: 2 }
}).toDestination();

const lead = new Tone.Synth({
  oscillator: { type: 'sine' },
  envelope:   { attack: 0.05, release: 0.5 }
}).toDestination();

const bass = new Tone.MonoSynth({
  oscillator: { type: 'square' },
  envelope:   { attack: 0.005, decay: 0.3, sustain: 0.2, release: 1 }
}).toDestination();

// --- 2) Called from sketch.js to play a note based on mode & position ---
function playModeNote(mode, x, y) {
  // Map y → freq 100–800Hz
  const freq = 100 + (1 - y / window.innerHeight) * 700;
  if (mode === 'rings') {
    pad.triggerAttackRelease(freq, 2);
  } else if (mode === 'waves') {
    lead.triggerAttackRelease(freq * 1.5, 0.5);
  } else if (mode === 'branch') {
    bass.triggerAttackRelease(freq * 0.5, '8n');
  }
}

// --- 3) Stub for your drag-modulation; no-op so it won’t crash ---
function modSynth(param, value) {
  // e.g. you could do:
  // if (param === 'chaos') pad.set({ detune: value * 200 });
}

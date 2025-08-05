// synth.js

// ——————————————————————————————————————————————————
// 0) Helpers: mapRange & clamp (no p5 dependency)
// ——————————————————————————————————————————————————
function mapRange(value, inMin, inMax, outMin, outMax) {
  return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// ——————————————————————————————————————————————————
// 1) Audio init & chord loop
// ——————————————————————————————————————————————————
var _audioStarted = false, chordLoop;
async function startAudio() {
  if (_audioStarted) return;
  await Tone.start();
  Tone.Transport.start();
  chordLoop = new Tone.Loop(time => playChord(time), '1m').start(0);
  _audioStarted = true;
  console.log('🎵 Audio unlocked & looping');
}

// ——————————————————————————————————————————————————
// 2) Happy scale definition
// ——————————————————————————————————————————————————
const scales = {
  major: ['C4','D4','E4','G4','A4','C5','D5','E5'],
  minor: ['C4','D4','Eb4','F4','G4','Ab4','Bb4','C5']
};
var currentScale = 'major';

// ——————————————————————————————————————————————————
// 3) Synth & FX chain
// Pure sine voice
const pureSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'sine' },
  envelope:   { attack: 0.5, decay: 0.1, sustain: 0.7, release: 1 }
});
// Rich triangle voice
const richSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'triangle' },
  envelope:   { attack: 0.1, decay: 0.2, sustain: 0.5, release: 1 }
});
// FX: filter → reverb → master
const filter = new Tone.Filter(800, 'lowpass').toDestination();
const reverb = new Tone.Reverb({ decay: 3, wet: 0 }).connect(filter);
pureSynth.connect(reverb);
richSynth.connect(reverb);

// Pluck accent for stones
const pluckSynth = new Tone.PluckSynth({
  dampening: 2000,
  resonance: 0.8
}).toDestination();

// ——————————————————————————————————————————————————
// 4) Control knobs (globals, var not let)
// ——————————————————————————————————————————————————
var freqVal   = 2;     // from horizontal swipe
var rowSpacing;        // from vertical swipe
var bulgeVal  = 0;     // from vertical swipe
var noiseVal  = 0;     // from two-finger twist

// ——————————————————————————————————————————————————
// 5) Play base chord
// ——————————————————————————————————————————————————
function playChord(time) {
  const notes = scales[currentScale];
  // map freqVal → root index in [0 .. notes.length-3]
  let idx = Math.floor(mapRange(freqVal, 0.5, 5, 0, notes.length - 3));
  idx = clamp(idx, 0, notes.length - 3);
  const chord = [notes[idx], notes[idx+1], notes[idx+2]];

  // crossfade pure ↔ rich by noiseVal
  pureSynth.volume.value = -12 + noiseVal * 6;
  richSynth.volume.value = -18 + noiseVal * 12;

  // filter cutoff from rowSpacing (you’ll need to set rowSpacing in sketch.js)
  // assume rowSpacing in [h*0.02 .. h*0.15], map to [200 .. 2000] Hz
  let cutoff = mapRange(rowSpacing, window.innerHeight*0.02, window.innerHeight*0.15, 200, 2000);
  cutoff = clamp(cutoff, 200, 8000);
  filter.frequency.value = cutoff;

  // reverb wet by bulgeVal
  reverb.wet.value = clamp(bulgeVal * 0.6, 0, 0.9);

  // trigger both voices
  pureSynth.triggerAttackRelease(chord, '1m', time);
  richSynth.triggerAttackRelease(chord, '1m', time);
}

// ——————————————————————————————————————————————————
// 6) Called from sketch.js to update noiseVal / bulgeVal
// ——————————————————————————————————————————————————
function modSynth(region, val) {
  switch (region) {
    case 'B': noiseVal = clamp(val, 0, 1); break;
    case 'C': bulgeVal = clamp(val, 0, 1); break;
  }
}

// ——————————————————————————————————————————————————
// 7) Stone pluck trigger
// ——————————————————————————————————————————————————
function triggerStoneSound() {
  const notes = scales[currentScale];
  const top   = notes[notes.length - 1];
  const note  = Tone.Frequency(top).transpose(12).toNote();
  pluckSynth.triggerAttackRelease(note, '16n');
}

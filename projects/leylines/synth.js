// synth.js

// 1) Audio init & chord loop
let _audioStarted = false, chordLoop;
async function startAudio() {
  if (_audioStarted) return;
  await Tone.start();
  Tone.Transport.start();
  // Loop the chord every whole note
  chordLoop = new Tone.Loop(time => playChord(time), '1m').start(0);
  _audioStarted = true;
  console.log('🎵 Audio unlocked & loop started');
}

// 2) Happy scale definition
const scales = {
  major: ['C4','D4','E4','G4','A4','C5','D5','E5'],
  minor: ['C4','D4','Eb4','F4','G4','Ab4','Bb4','C5']
};
let currentScale = 'major';

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

// 4) Control knobs (updated from sketch.js)
let freqVal   = 2;     // horizontal swipe
let rowSpacing, waveAmp; // affects filter cutoff
let bulgeVal  = 0;     // vertical swipe
let noiseVal  = 0;     // twist

// 5) Play base chord
function playChord(time) {
  const notes = scales[currentScale];
  // map freqVal → root index (0…notes.length–3)
  let idx = Math.floor(map(freqVal, 0.5, 5, 0, notes.length - 3));
  idx = constrain(idx, 0, notes.length - 3);
  const chord = [notes[idx], notes[idx+1], notes[idx+2]];

  // crossfade pure ↔ rich by noiseVal (twist gesture)
  pureSynth.volume.value = -12 + (noiseVal * 6);  // louder when twist
  richSynth.volume.value = -18 + (noiseVal * 12);

  // filter cutoff ~ rowSpacing, map spacing→[200,2000] Hz
  const cutoff = map(rowSpacing, height*0.02, height*0.15, 200, 2000);
  filter.frequency.value = cutoff;

  // reverb wet by bulgeVal
  reverb.wet.value = bulgeVal * 0.6;

  // trigger both voices
  pureSynth.triggerAttackRelease(chord, '1m', time);
  richSynth.triggerAttackRelease(chord, '1m', time);
}

// 6) Called from sketch.js to tweak synth params
// region 'A','B','C' as before
function modSynth(region, val) {
  switch(region) {
    case 'A': 
      // optionally adjust scale or other
      // e.g. currentScale = val > 0.5 ? 'minor':'major';
      break;
    case 'B':
      noiseVal = val;
      break;
    case 'C':
      bulgeVal = val;
      break;
  }
}

// 7) Stone pluck trigger
function triggerStoneSound() {
  // use top scale degree + octave
  const notes = scales[currentScale];
  const top   = notes[notes.length - 1];
  const note  = Tone.Frequency(top).transpose(12).toNote();
  pluckSynth.triggerAttackRelease(note, '16n');
}

// synth.js

// ——————————————————————————————————————————————
// 1) Unlock & start Transport on first interaction
// ——————————————————————————————————————————————
let _audioStarted = false;
async function startAudio() {
  if (!_audioStarted) {
    await Tone.start();
    Tone.Transport.start();
    _audioStarted = true;
    console.log('🎵 Audio unlocked & Transport started');
  }
}

// ——————————————————————————————————————————————
// 2) Define extended scales (major/minor) with extra high notes
// ——————————————————————————————————————————————
const scales = {
  major: ['C2','D2','E2','F2','G2','A2','B2','C3','D3','E3','F3'],
  minor: ['C2','D2','Eb2','F2','G2','Ab2','Bb2','C3','D3','Eb3','F3']
};
let currentScale = 'major';

// ——————————————————————————————————————————————
// 3) Three voices (poly-stacking synths + reverb on waves)
// ——————————————————————————————————————————————
const bassSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'sine' },
  envelope:   { attack: 0.01, decay: 0.3, sustain: 0.5, release: 1 },
  filter:     { type: 'lowpass', frequency: 200 }
}).toDestination();

const waveReverb = new Tone.Reverb({ decay: 4, wet: 0.5 }).toDestination();
const waveSynth  = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'sine' },
  envelope:   { attack: 0.5, decay: 1, sustain: 0.7, release: 2 }
}).connect(waveReverb);

const pluckFilter = new Tone.Filter(800, 'lowpass').toDestination();
const pluckSynth  = new Tone.PolySynth({
  voice:   Tone.Synth,
  options: {
    oscillator: { type: 'sine' },
    envelope:   { attack: 0.005, decay: 0.5, sustain: 0.1, release: 1 }
  },
  maxPolyphony: 8
}).chain(pluckFilter, Tone.Destination);

// ——————————————————————————————————————————————
// 4) Wire up your scale‐buttons
// ——————————————————————————————————————————————
document.querySelectorAll('#toolbar button[data-scale]')
  .forEach(btn => btn.onclick = () => {
    currentScale = btn.dataset.scale;
    console.log('Scale →', currentScale);
  });

// ——————————————————————————————————————————————
// 5) Play & loop notes, with octave shifts per mode
// ——————————————————————————————————————————————
function playModeNote(mode, x, y) {
  // pick a degree from the extended scale
  const notes = scales[currentScale];
  const idx   = Math.floor((1 - y / window.innerHeight) * notes.length);
  const note  = notes[Math.min(Math.max(idx, 0), notes.length - 1)];
  const baseF = Tone.Frequency(note).toFrequency();

  if (mode === 'rings') {
    // rings = sine bass, one octave up
    bassSynth.triggerAttackRelease(baseF * 2, '1m');
  }
  else if (mode === 'waves') {
    // waves = pad, one octave down
    waveSynth.triggerAttackRelease(baseF / 2, '2n');
  }
  else if (mode === 'branch') {
    // branch = gentle sine pluck, one octave up
    pluckSynth.triggerAttackRelease(baseF * 2, '4n');
  }
}

function scheduleShapeLoop(shape) {
  const interval = { rings:'1m', waves:'2n', branch:'4n' }[shape.mode];
  shape.loop = new Tone.Loop(time => {
    playModeNote(shape.mode, shape.x, shape.y);
  }, interval).start(0);
}

// ——————————————————————————————————————————————
// 6) No-op modulation stub
// ——————————————————————————————————————————————
function modSynth(param, value) {
  // future: detune/filter based on chaos, etc.
}

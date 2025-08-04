// synth.js

// ——————————————————————————————————————————————
// 1. Unlock & start Transport on first interaction
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
// 2. Define scales & current selection
// ——————————————————————————————————————————————
const scales = {
  major: ['C2','D2','E2','F2','G2','A2','B2','C3'],
  minor: ['C2','D2','Eb2','F2','G2','Ab2','Bb2','C3']
};
let currentScale = 'major';

// ——————————————————————————————————————————————
// 3. Create three poly voices
// ——————————————————————————————————————————————
// Rings-bass: sine + LPF @200Hz
const bassSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'sine' },
  envelope:   { attack: 0.01, decay: 0.3, sustain: 0.5, release: 1 },
  filter:     { type: 'lowpass', frequency: 200 }
}).toDestination();

// Waves-pad: sine + reverb, dropped an octave
const waveReverb = new Tone.Reverb({ decay: 4, wet: 0.5 }).toDestination();
const waveSynth  = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'sine' },
  envelope:   { attack: 0.5, decay: 1, sustain: 0.7, release: 2 }
}).connect(waveReverb);

// Branch-pluck: sine + LPF for gentle rainy plucks
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
// 4. Hook up scale-toggle buttons
// ——————————————————————————————————————————————
document.querySelectorAll('#toolbar button[data-scale]')
  .forEach(btn => btn.onclick = () => {
    currentScale = btn.dataset.scale;
    console.log('Scale →', currentScale);
  });

// ——————————————————————————————————————————————
// 5. playModeNote & Loop scheduler
// ——————————————————————————————————————————————
function playModeNote(mode, x, y) {
  // pick a note from the current scale based on vertical position
  const notes = scales[currentScale];
  const idx   = Math.floor((1 - y/window.innerHeight) * notes.length);
  const note  = notes[Math.min(Math.max(idx, 0), notes.length - 1)];

  if (mode === 'rings') {
    bassSynth.triggerAttackRelease(note, '1m');
  }
  else if (mode === 'waves') {
    // drop pad an octave
    const freq = Tone.Frequency(note).toFrequency() / 2;
    waveSynth.triggerAttackRelease(freq, '2n');
  }
  else if (mode === 'branch') {
    pluckSynth.triggerAttackRelease(note, '4n');
  }
}

function scheduleShapeLoop(shape) {
  const interval = { rings:'1m', waves:'2n', branch:'4n' }[shape.mode];
  shape.loop = new Tone.Loop(time => {
    playModeNote(shape.mode, shape.x, shape.y);
  }, interval).start(0);
}

// ——————————————————————————————————————————————
// 6. No‐op for modulation stub
// ——————————————————————————————————————————————
function modSynth(param, value) {
  // placeholder for future detune/filter tweaks
}

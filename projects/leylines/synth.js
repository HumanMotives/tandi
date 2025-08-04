// synth.js

// —————————————————————————————————————————————————————————————
// 1) Unlock AudioContext & start Transport + chord‐loop
// —————————————————————————————————————————————————————————————
let _started = false;
async function startAudio() {
  if (!_started) {
    await Tone.start();
    Tone.Transport.start();
    // Loop a chord every half note
    new Tone.Loop(time => playWaveChord(), '2n').start(0);
    _started = true;
    console.log('▶️ Audio unlocked & looping');
  }
}

// —————————————————————————————————————————————————————————————
// 2) Scales & scale UI
// —————————————————————————————————————————————————————————————
const scales = {
  major: ['C2','D2','E2','F2','G2','A2','B2','C3','D3','E3','F3'],
  minor: ['C2','D2','Eb2','F2','G2','Ab2','Bb2','C3','D3','Eb3','F3']
};
let currentScale = 'major';
document.querySelectorAll('#toolbar button[data-scale]')
  .forEach(b => b.onclick = () => {
    currentScale = b.dataset.scale;
    document.querySelectorAll('#toolbar button[data-scale]')
      .forEach(x => x.classList.toggle('active', x===b));
  });

// —————————————————————————————————————————————————————————————
// 3) One sine-pad voice → reverb → lowpass + a little noise synth
// —————————————————————————————————————————————————————————————
const waveFilter = new Tone.Filter(2000, 'lowpass').toDestination();
const waveReverb = new Tone.Reverb({ decay: 4, wet: 0.5 })
  .connect(waveFilter);
const waveSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'sine' },
  envelope:   { attack: 0.5, decay:1, sustain:0.6, release:3 }
}).connect(waveReverb);

const noiseSynth = new Tone.NoiseSynth({
  noise:    { type: 'white' },
  envelope: { attack: 0.1, decay: 0.5, sustain:0.1, release:1 }
}).connect(waveFilter);

// —————————————————————————————————————————————————————————————
// 4) Global modParams (driven by regions)
// —————————————————————————————————————————————————————————————
let modParams = {
  filter:   2000,   // Hz
  reverb:   0.5,    // wet 0–1
  wavefold: 0,      // detune amount
  noise:    0,      // noise amp 0–1
  inversion:0       // chord inversion steps
};

// —————————————————————————————————————————————————————————————
// 5) Build & play a chord at each loop iteration
// —————————————————————————————————————————————————————————————
function playWaveChord() {
  // pick a root from the scale based on global freq (from sketch.js)
  const notes = scales[currentScale];
  let idx = Math.floor(
    map(freq, 0.5, 8, 0, notes.length)
  );
  idx = constrain(idx, 0, notes.length - 1);

  // root + third + fifth, then apply inversion offset
  let degrees = [0,2,4].map(d => {
    let pos = constrain(idx + d + modParams.inversion, 0, notes.length-1);
    return notes[pos];
  });

  // apply wave-fold as detune
  waveSynth.set({ detune: modParams.wavefold * 150 });

  // apply filter & reverb
  waveFilter.frequency.value = modParams.filter;
  waveReverb.wet.value        = modParams.reverb;

  // trigger the chord
  waveSynth.triggerAttackRelease(degrees, '2n', undefined, 0.6);

  // sprinkle in noise if asked
  if (modParams.noise > 0.05) {
    // noise amplitude ≈ modParams.noise
    noiseSynth.triggerAttackRelease(modParams.noise, '2n');
  }
}

// —————————————————————————————————————————————————————————————
// 6) Called from sketch.js: update modParams by region & value
// —————————————————————————————————————————————————————————————
function modSynth(region, value) {
  switch(region) {
    case 'A':  // left third → filter & reverb
      modParams.filter = lerp(200, 8000, value);
      modParams.reverb = value;
      break;
    case 'B':  // middle third → wavefold & noise
      modParams.wavefold = value;
      modParams.noise    = value;
      break;
    case 'C':  // right third → chord inversion
      // map value[0..1] → –2..+2 steps
      modParams.inversion = floor(lerp(-2, 2, value));
      break;
  }
}

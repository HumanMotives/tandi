// synth.js

// 1) Unlock & start the Transport + chord-loop
let _audioStarted = false;
async function startAudio() {
  if (!_audioStarted) {
    await Tone.start();
    Tone.Transport.start();
    // loop our chord every half-note
    new Tone.Loop(time => playWaveChord(), '2n').start(0);
    _audioStarted = true;
    console.log('🔊 Audio unlocked & looping');
  }
}

// 2) Scales & UI binding for Major/Minor
const scales = {
  major: ['C2','D2','E2','F2','G2','A2','B2','C3','D3','E3','F3'],
  minor: ['C2','D2','Eb2','F2','G2','Ab2','Bb2','C3','D3','Eb3','F3']
};
let currentScale = 'major';
document.querySelectorAll('#toolbar button[data-scale]')
  .forEach(btn => btn.onclick = () => {
    currentScale = btn.dataset.scale;
    document.querySelectorAll('#toolbar button[data-scale]')
      .forEach(x => x.classList.toggle('active', x===btn));
  });

// 3) One sine-pad voice → Reverb → Low-Pass + a NoiseSynth
const waveFilter = new Tone.Filter(2000, 'lowpass').toDestination();
const waveReverb = new Tone.Reverb({ decay: 4, wet: 0.5 })
  .connect(waveFilter);

const waveSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'sine' },
  envelope:   { attack: 0.5, decay: 1, sustain: 0.6, release: 3 }
});
waveSynth.volume.value = -18;            // drop volume
waveSynth.connect(waveReverb);

const noiseSynth = new Tone.NoiseSynth({
  noise:    { type: 'white' },
  envelope: { attack: 0.1, decay: 0.5, sustain: 0.1, release: 1 }
});
noiseSynth.volume.value = -18;           // drop noise too
noiseSynth.connect(waveFilter);

// 4) Region-driven modParams
let modParams = {
  filter:    2000,   // LPF cutoff
  reverb:    0.5,    // wet
  wavefold:  0,      // detune
  noise:     0,      // noise mix
  inversion: 0       // chord inversion steps
};

// 5) Build & play a 3-note chord (root/3rd/5th), transposed +2 octaves
function playWaveChord() {
  // pick root from scale based on current global freq (from sketch.js)
  const notes = scales[currentScale];
  let idx = Math.floor(map(freq, 0.5, 8, 0, notes.length));
  idx = constrain(idx, 0, notes.length - 1);

  // build root, third, fifth
  let chord = [0,2,4].map(d => {
    let pos = constrain(idx + d + modParams.inversion, 0, notes.length-1);
    return notes[pos];
  });

  // transpose each note up 24 semitones (2 octaves)
  let transposed = chord.map(n =>
    Tone.Frequency(n).transpose(24).toNote()
  );

  // apply modulators
  waveSynth.set({ detune: modParams.wavefold * 150 });
  waveFilter.frequency.value = modParams.filter;
  waveReverb.wet.value        = modParams.reverb;

  // trigger the pad-chord
  waveSynth.triggerAttackRelease(transposed, '2n', undefined, 0.4);

  // sprinkle in noise if configured
  if (modParams.noise > 0.05) {
    noiseSynth.triggerAttackRelease(modParams.noise, '2n');
  }
}

// 6) Called from sketch.js to update modParams per region
function modSynth(region, value) {
  switch(region) {
    case 'A': // left third → filter & reverb
      modParams.filter = lerp(200, 8000, value);
      modParams.reverb = value;
      break;
    case 'B': // middle third → wavefold & noise
      modParams.wavefold = value;
      modParams.noise    = value;
      break;
    case 'C': // right third → chord inversion
      modParams.inversion = floor(lerp(-2, 2, value));
      break;
  }
}

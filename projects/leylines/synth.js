// synth.js

// 1) Unlock & start Transport + schedule the looping chord
let _audioStarted = false;
async function startAudio() {
  if (!_audioStarted) {
    await Tone.start();
    Tone.Transport.start();
    // Loop the chord every half-note
    new Tone.Loop(time => playWaveChord(), '2n').start(0);
    _audioStarted = true;
    console.log('🔊 Audio unlocked & looping');
  }
}

// 2) Happy major/minor scales & UI binding
const scales = {
  major: ['C2','D2','E2','F2','G2','A2','B2','C3','D3','E3','F3'],
  minor: ['C2','D2','Eb2','F2','G2','Ab2','Bb2','C3','D3','Eb3','F3']
};
let currentScale = 'major';
document.querySelectorAll('#toolbar button[data-scale]')
  .forEach(btn => btn.onclick = () => {
    currentScale = btn.dataset.scale;
    document.querySelectorAll('#toolbar button[data-scale]')
      .forEach(x => x.classList.toggle('active', x === btn));
  });

// 3) Sine-pad → Reverb → Low-Pass + a gentle NoiseSynth
const waveFilter = new Tone.Filter(2000, 'lowpass').toDestination();
const waveReverb = new Tone.Reverb({ decay: 4, wet: 0.5 })
  .connect(waveFilter);

const waveSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'sine' },
  envelope:   { attack: 0.5, decay: 1, sustain: 0.6, release: 3 }
});
waveSynth.volume.value = -18;
waveSynth.connect(waveReverb);

const noiseSynth = new Tone.NoiseSynth({
  noise:    { type: 'white' },
  envelope: { attack: 0.1, decay: 0.5, sustain: 0.1, release: 1 }
});
noiseSynth.volume.value = -18;
noiseSynth.connect(waveFilter);

// 4) Region-based modulation parameters
let modParams = {
  filter:    2000,
  reverb:    0.5,
  wavefold:  0,
  noise:     0,
  inversion: 0
};

// 5) Build & play a 3-note chord (root/3rd/5th), then transpose +2 octaves
function playWaveChord() {
  const notes = scales[currentScale];
  let idx = Math.floor(map(freq, 0.5, 8, 0, notes.length));
  idx = constrain(idx, 0, notes.length - 1);

  // root, third, fifth with inversion
  let chord = [0, 2, 4].map(d => {
    let pos = constrain(idx + d + modParams.inversion, 0, notes.length - 1);
    return notes[pos];
  });

  // transpose chord up 24 semitones
  let transposed = chord.map(n =>
    Tone.Frequency(n).transpose(24).toNote()
  );

  // apply modulators
  waveSynth.set({ detune: modParams.wavefold * 150 });
  waveFilter.frequency.value = modParams.filter;
  waveReverb.wet.value        = modParams.reverb;

  // trigger the pad
  waveSynth.triggerAttackRelease(transposed, '2n', undefined, 0.4);

  // sprinkle in noise if val > 0.05
  if (modParams.noise > 0.05) {
    noiseSynth.triggerAttackRelease(modParams.noise, '2n');
  }
}

// 6) Region → param binding (called from sketch.js)
function modSynth(region, value) {
  switch (region) {
    case 'A':  // left
      modParams.filter = lerp(200, 8000, value);
      modParams.reverb = value;
      break;
    case 'B':  // center
      modParams.wavefold = value;
      modParams.noise    = value;
      break;
    case 'C':  // right
      modParams.inversion = floor(lerp(-2, 2, value));
      break;
  }
}

// 7) Spike-pluck synth & trigger function
const spikeSynth = new Tone.PluckSynth({
  resonance: 0.8,
  dampening: 2000
}).toDestination();
spikeSynth.volume.value = -10;

function triggerSpikeNote() {
  const notes = scales[currentScale];
  const top   = notes[notes.length - 1];
  const note  = Tone.Frequency(top).transpose(12).toNote();
  spikeSynth.triggerAttackRelease(note, '16n');
}

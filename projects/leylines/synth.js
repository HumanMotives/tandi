// synth.js

// 1) Unlock & start Transport + schedule the loop
let _started = false;
async function startAudio() {
  if (!_started) {
    await Tone.start();
    Tone.Transport.start();
    // loop every half-note
    new Tone.Loop(time => {
      playWaveChord();
    }, '2n').start(0);
    _started = true;
    console.log('🔊 Audio ready & looping');
  }
}

// 2) Scales & scale-button wiring
const scales = {
  major: ['C2','D2','E2','F2','G2','A2','B2','C3','D3','E3','F3'],
  minor: ['C2','D2','Eb2','F2','G2','Ab2','Bb2','C3','D3','Eb3','F3']
};
let currentScale = 'major';
document.querySelectorAll('#toolbar button[data-scale]').forEach(b => {
  b.onclick = () => {
    currentScale = b.dataset.scale;
    document.querySelectorAll('#toolbar button[data-scale]')
      .forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
  };
});

// 3) Single poly-sine pad → reverb → lowpass
const waveFilter = new Tone.Filter(2000, 'lowpass').toDestination();
const waveReverb = new Tone.Reverb({ decay: 4, wet: 0.5 }).connect(waveFilter);
const waveSynth  = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'sine' },
  envelope:   { attack: 0.5, decay:1, sustain:0.6, release:3 }
}).connect(waveReverb);

// 4) Build a chord based on the global freq
//    Assumes `freq` is a global set in sketch.js
function playWaveChord() {
  const notes = scales[currentScale];
  // map freq (0.5–8) → scale index
  let idx = Math.floor( map(freq, 0.5, 8, 0, notes.length) );
  idx = constrain(idx, 0, notes.length - 1);
  // root, third, fifth
  const chord = [0,2,4].map(d => notes[ constrain(idx + d, 0, notes.length-1) ]);
  waveSynth.triggerAttackRelease(chord, '2n');
}

// 5) Called during pinch/rotate to morph sound
function modSynth(param, value) {
  if (param === 'filter') {
    // cutoff from 200 → 8000
    waveFilter.frequency.value = 200 + value * 7800;
  } else if (param === 'reverb') {
    waveReverb.wet.value = value;
  }
}

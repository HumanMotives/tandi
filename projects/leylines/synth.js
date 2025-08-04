// synth.js

// —————————————————————————————————————————————————————————————
// 1) startAudio(): unlocks the AudioContext & starts the Transport
// —————————————————————————————————————————————————————————————
let _audioStarted = false;
async function startAudio() {
  if (!_audioStarted) {
    await Tone.start();
    Tone.Transport.start();
    _audioStarted = true;
    console.log('🎵 AudioContext unlocked, Transport started');
  }
}

// —————————————————————————————————————————————————————————————
// 2) Three voices: bass pad, sine swell, rainy pluck
// —————————————————————————————————————————————————————————————
const pad = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'triangle' },
  envelope:   { attack: 1.5, release: 2 }
}).toDestination();

const swell = new Tone.Synth({
  oscillator: { type: 'sine' },
  envelope:   { attack: 0.1, release: 3 }
}).toDestination();

const pluckSynth = new Tone.PluckSynth({
  dampening: 4000,
  resonance: 0.9
}).toDestination();

// —————————————————————————————————————————————————————————————
// 3) playModeNote(): triggered immediately + by each Loop
// —————————————————————————————————————————————————————————————
function playModeNote(mode, x, y) {
  // map vertical position → frequency  100Hz–800Hz
  const freq = 100 + (1 - (y / window.innerHeight)) * 700;

  if (mode === 'rings') {
    pad.triggerAttackRelease(freq, '1m');
  }
  else if (mode === 'waves') {
    swell.triggerAttackRelease(freq * 1.5, '2n');
  }
  else if (mode === 'branch') {
    pluckSynth.triggerAttackRelease(freq * 0.5, '8n');
  }
}

// —————————————————————————————————————————————————————————————
// 4) scheduleShapeLoop(): attach a looping part to each shape
// —————————————————————————————————————————————————————————————
function scheduleShapeLoop(shape) {
  // pick an interval string per mode
  let interval = {
    rings:  '1m',  // one measure per bass hit
    waves:  '2n',  // half‐note pad swells
    branch: '4n'   // quarter‐note rainy plucks
  }[shape.mode];

  // create & start the loop at time=0
  shape.loop = new Tone.Loop(time => {
    playModeNote(shape.mode, shape.x, shape.y);
  }, interval).start(0);
}

// —————————————————————————————————————————————————————————————
// 5) stub for your drag‐to‐modulate (no‐op for now)
// —————————————————————————————————————————————————————————————
function modSynth(param, value) {
  // e.g. pad.set({ detune: value * 200 });
}

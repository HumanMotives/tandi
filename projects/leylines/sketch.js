// sketch.js

// ——————————————————————————————————————————————————————————————————
// 1) Visual globals
// ——————————————————————————————————————————————————————————————————
const stripes = 12;
let rowSpacing, waveAmp;
let freqVal   = 2;
let noiseVal  = 0, foldVal = 0;
let bulgeVal  = 0;
let initTouches = [];
let stones      = [];

// ——————————————————————————————————————————————————————————————————
// 2) Audio globals
// ——————————————————————————————————————————————————————————————————
let _audioStarted = false;
let synthPure, synthRich, filterNode, reverbNode, chordLoop, pluckSynth;

// ——————————————————————————————————————————————————————————————————
// 3) p5.js setup
// ——————————————————————————————————————————————————————————————————
function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();
  strokeCap(ROUND);

  // Visual band = 20% of screen height
  const regionH = height * 0.2;
  rowSpacing = regionH / (stripes - 1);
  waveAmp    = rowSpacing * 0.5;

  stroke('#fff');

  // Build your synth + FX chain
  synthPure = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope:   { attack: 0.5, decay: 0.1, sustain: 0.7, release: 1 }
  });
  synthRich = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope:   { attack: 0.1, decay: 0.2, sustain: 0.5, release: 1 }
  });
  filterNode = new Tone.Filter(800, 'lowpass').toDestination();
  reverbNode = new Tone.Reverb({ decay: 3, wet: 0 }).connect(filterNode);
  synthPure.connect(reverbNode);
  synthRich.connect(reverbNode);

  pluckSynth = new Tone.PluckSynth({
    dampening: 2000,
    resonance: 0.8
  }).toDestination();
}

// ——————————————————————————————————————————————————————————————————
// 4) p5.js draw
// ——————————————————————————————————————————————————————————————————
function draw() {
  // Pastel background HSL
  colorMode(HSL, 360, 100, 100);
  let hue = 100 + (bulgeVal - 0.5) * 30 + (noiseVal - 0.5) * 20;
  let sat = 10 + noiseVal * 30;
  let lit = 85 - bulgeVal * 10;
  background(hue, sat, lit);
  colorMode(RGB);

  const t = millis() * 0.001; // slower wave

  // Draw each stripe as segmented pen-stroke
  for (let i = 0; i < stripes; i++) {
    const centerY = height / 2;
    const half    = (stripes - 1) / 2;
    const y0      = centerY + (i - half) * rowSpacing;
    const bendF   = map(abs(i - half), 0, half, 1, 2);

    // Collect points
    let pts = [];
    for (let x = 0; x <= width; x += 5) {
      let phase = TWO_PI * freqVal * (x / width) + t;
      let y     = waveAmp * sin(phase);

      // warp/fold from two-finger twist
      y += (noise(x * noiseVal * 0.1 + t * 0.5, i * 0.2) - 0.5) * waveAmp;
      if (foldVal > 0) {
        let f = foldVal * rowSpacing;
        y = abs(((y + f) % (2 * f)) - f);
      }

      // stone repulsion
      let yy = y0 + y;
      for (let st of stones) {
        let dx = x - st.x, dy = yy - st.y, d = sqrt(dx*dx + dy*dy);
        if (d < st.r) {
          let push = (st.r - d) / st.r;
          let sign = dy / (d || 1);
          y += sign * push * st.strength * bendF;
          yy = y0 + y;
        }
      }

      pts.push({ x, y: yy });
    }

    // Draw segments with variable strokeWeight
    for (let j = 0; j < pts.length - 1; j++) {
      const p0 = pts[j], p1 = pts[j+1];
      const norm  = j / (pts.length - 1);
      // breathing base: 0.5–3px
      const baseLw = map(sin(frameCount * 0.005), -1, 1, 0.5, 3);
      // bulge adds up to +4px
      const peakLw = baseLw + bulgeVal * 4;
      const sw     = lerp(baseLw, peakLw, sin(norm * PI));
      strokeWeight(sw);
      line(p0.x, p0.y, p1.x, p1.y);
    }
  }
}

// ——————————————————————————————————————————————————————————————————
// 5) Touch handlers
// ——————————————————————————————————————————————————————————————————
function touchStarted() {
  // Unlock audio on first touch
  if (!_audioStarted) {
    Tone.start().then(() => {
      Tone.Transport.start();
      // Loop chord every measure
      chordLoop = new Tone.Loop(time => playChord(time), '1m').start(0);
      _audioStarted = true;
      console.log('🔊 Audio unlocked & loop started');
    });
  }
  initTouches = touches.map(t => ({ ...t }));
  return false;
}

function touchMoved() {
  if (touches.length === 1) {
    let { x, y } = touches[0];
    // Vertical → bulgeVal & rowSpacing
    bulgeVal = constrain(map(y, height, 0, 0, 1), 0, 1);
    let minSp = (height * 0.15) / (stripes - 1),
        maxSp = (height * 0.25) / (stripes - 1);
    rowSpacing = constrain(map(y, 0, height, maxSp, minSp), minSp, maxSp);
    waveAmp    = rowSpacing * 0.5;
    // Horizontal → freqVal
    freqVal    = constrain(map(x, 0, width, 0.5, 5), 0.5, 8);
  }
  else if (touches.length === 2 && initTouches.length === 2) {
    let [a1,b1] = initTouches, [a2,b2] = touches;
    let ang0 = atan2(b1.y - a1.y, b1.x - a1.x),
        ang1 = atan2(b2.y - a2.y, b2.x - a2.x),
        v    = constrain(map(abs(ang1 - ang0), 0, PI, 0, 1), 0, 1);
    noiseVal = foldVal = v;
  }

  // Update synth parameters
  modSynth('B', noiseVal);
  modSynth('C', bulgeVal);

  return false; // prevent page scroll
}

function touchEnded() {
  // Tap → drop stone & pluck
  if (touches.length === 0 && initTouches.length === 1) {
    let t0 = initTouches[0];
    stones.push({ x: t0.x, y: t0.y, r: width * 0.15, strength: 40 });
    triggerStoneSound();
  }
  initTouches = [];
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  const regionH = height * 0.2;
  rowSpacing = regionH / (stripes - 1);
  waveAmp    = rowSpacing * 0.5;
}

// ——————————————————————————————————————————————————————————————————
// 6) Audio functions
// ——————————————————————————————————————————————————————————————————
function playChord(time) {
  const scale = ['C4','D4','E4','G4','A4','C5','D5','E5'];
  let idx = floor(map(freqVal, 0.5, 5, 0, scale.length - 3));
  idx = constrain(idx, 0, scale.length - 3);
  const chord = [scale[idx], scale[idx+1], scale[idx+2]];

  synthPure.volume.value = -12 + noiseVal * 6;
  synthRich.volume.value = -18 + noiseVal * 12;

  let cutoff = map(rowSpacing, height*0.02, height*0.15, 200, 2000);
  filterNode.frequency.value = constrain(cutoff, 200, 8000);

  reverbNode.wet.value = constrain(bulgeVal * 0.6, 0, 1);

  synthPure.triggerAttackRelease(chord, '1m', time);
  synthRich.triggerAttackRelease(chord, '1m', time);
}

function modSynth(region, val) {
  if (region === 'B') noiseVal = val;
  if (region === 'C') bulgeVal = val;
}

function triggerStoneSound() {
  const scale = ['C4','D4','E4','G4','A4','C5','D5','E5'];
  let note = Tone.Frequency(scale[scale.length - 1]).transpose(12).toNote();
  pluckSynth.triggerAttackRelease(note, '16n');
}

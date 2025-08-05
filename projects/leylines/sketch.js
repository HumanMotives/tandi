// sketch.js

// ——————————————————————————————————————————————————————————————
// 1) VISUAL SETUP
// ——————————————————————————————————————————————————————————————
const stripes = 12;
let rowSpacing, waveAmp;
let freqVal   = 2;
let noiseVal  = 0, foldVal = 0;
let bulgeVal  = 0;
let initTouches = [];
let stones      = [];

// ——————————————————————————————————————————————————————————————
// 2) AUDIO SETUP
// ——————————————————————————————————————————————————————————————
let audioStarted = false;
let synth, filterNode, reverbNode, chordLoop, pluckSynth;
const scaleNotes = ['C4','D4','E4','F4','G4','A4','B4','C5'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();
  strokeCap(ROUND);

  // Visual band = 20% of screen height
  const regionH = height * 0.2;
  rowSpacing = regionH / (stripes - 1);
  waveAmp    = rowSpacing * 0.5;

  stroke('#fff');

  // Build FX chain (won't start until Tone.start)
  filterNode = new Tone.Filter(800, 'lowpass').toDestination();
  reverbNode = new Tone.Reverb({ decay: 3, wet: 0 }).connect(filterNode);

  // Pure-sine chord synth
  synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope:   { attack: 0.5, decay: 0.1, sustain: 0.7, release: 1 }
  }).connect(reverbNode);

  // Pluck for stones
  pluckSynth = new Tone.PluckSynth({
    dampening: 2000,
    resonance: 0.8
  }).toDestination();
}

function draw() {
  // Pastel background via HSL
  colorMode(HSL, 360, 100, 100);
  let hue = 100 + (bulgeVal - 0.5) * 30 + (noiseVal - 0.5) * 20;
  let sat = 10 + noiseVal * 30;
  let lit = 85 - bulgeVal * 10;
  background(hue, sat, lit);
  colorMode(RGB);

  const t = millis() * 0.001;

  // Draw stripes as before
  for (let i = 0; i < stripes; i++) {
    const centerY = height/2;
    const half    = (stripes - 1)/2;
    const y0      = centerY + (i - half) * rowSpacing;
    const bendF   = map(abs(i - half), 0, half, 1, 2);

    // collect points
    let pts = [];
    for (let x = 0; x <= width; x += 5) {
      let phase = TWO_PI * freqVal * (x/width) + t;
      let y     = waveAmp * sin(phase);

      y += (noise(x*noiseVal*0.1 + t*0.5, i*0.2) - 0.5) * waveAmp;
      if (foldVal > 0) {
        let f = foldVal * rowSpacing;
        y = abs(((y + f) % (2*f)) - f);
      }

      let yy = y0 + y;
      for (let st of stones) {
        let dx = x - st.x, dy = yy - st.y, d = sqrt(dx*dx + dy*dy);
        if (d < st.r) {
          let push = (st.r - d) / st.r;
          let sign = dy / (d || 1);
          y  += sign * push * st.strength * bendF;
          yy  = y0 + y;
        }
      }
      pts.push({ x, y: yy });
    }

    // draw segments with bulging stroke
    for (let j = 0; j < pts.length - 1; j++) {
      const p0 = pts[j], p1 = pts[j+1];
      const norm = j / (pts.length - 1);
      const baseLw = map(sin(frameCount*0.005), -1, 1, 0.5, 3);
      const peakLw = baseLw + bulgeVal * 4;
      const sw     = lerp(baseLw, peakLw, sin(norm*PI));
      strokeWeight(sw);
      line(p0.x, p0.y, p1.x, p1.y);
    }
  }
}

// ——————————————————————————————————————————————————————————————
// 3) TOUCH HANDLERS
// ——————————————————————————————————————————————————————————————
function touchStarted() {
  // Unlock audio on first user interaction
  if (!audioStarted) {
    Tone.start().then(() => {
      Tone.Transport.start();
      chordLoop = new Tone.Loop(playChord, '1m').start(0);
      audioStarted = true;
      console.log('🔊 Audio ready');
    });
  }
  initTouches = touches.map(t => ({ ...t }));
  return false;
}

function touchMoved() {
  if (touches.length === 1) {
    let { x, y } = touches[0];
    // vertical → bulge & spacing
    bulgeVal = constrain(map(y, height, 0, 0, 1), 0, 1);
    let minSp = (height*0.15)/(stripes-1),
        maxSp = (height*0.25)/(stripes-1);
    rowSpacing = constrain(map(y, 0, height, maxSp, minSp), minSp, maxSp);
    waveAmp    = rowSpacing * 0.5;
    // horizontal → freqVal
    freqVal    = constrain(map(x, 0, width, 0.5, 5), 0.5, 8);
  }
  else if (touches.length === 2 && initTouches.length === 2) {
    let [a1,b1] = initTouches, [a2,b2] = touches;
    let ang0 = atan2(b1.y - a1.y, b1.x - a1.x),
        ang1 = atan2(b2.y - a2.y, b2.x - a2.x),
        v    = constrain(map(abs(ang1 - ang0), 0, PI, 0, 1), 0, 1);
    noiseVal = foldVal = v;
  }

  return false;
}

function touchEnded() {
  // tap → stone + pluck
  if (touches.length === 0 && initTouches.length === 1) {
    let t0 = initTouches[0];
    stones.push({ x: t0.x, y: t0.y, r: width*0.15, strength: 40 });
    // trigger pluck on top note
    let top = scaleNotes[scaleNotes.length-1];
    let note= Tone.Frequency(top).transpose(12).toNote();
    pluckSynth.triggerAttackRelease(note, '16n');
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

// ——————————————————————————————————————————————————————————————
// 4) AUDIO CALLBACK
// ——————————————————————————————————————————————————————————————
function playChord(time) {
  // pick root from freqVal
  let idx = floor(map(freqVal, 0.5, 5, 0, scaleNotes.length-3));
  idx = constrain(idx, 0, scaleNotes.length-3);
  let chord = [
    scaleNotes[idx],
    scaleNotes[idx+1],
    scaleNotes[idx+2]
  ];

  synth.volume.value      = -12 + noiseVal * 6;
  filterNode.frequency.value = constrain(
    map(rowSpacing, height*0.02, height*0.15, 200, 2000),
    200, 8000
  );
  reverbNode.wet.value    = constrain(bulgeVal * 0.6, 0, 0.9);

  synth.triggerAttackRelease(chord, '1m', time);
}

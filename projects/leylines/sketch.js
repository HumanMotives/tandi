// sketch.js

// —————————————————————————————————————————————————————————————
// HELPER: ease-in-out quad for natural bursts
// —————————————————————————————————————————————————————————————
function easeInOutQuad(t) {
  return t < 0.5
    ? 2 * t * t
    : -1 + (4 - 2 * t) * t;
}

// —————————————————————————————————————————————————————————————
// VISUAL SETUP
// —————————————————————————————————————————————————————————————
const stripes = 12;
let rowSpacing, waveAmp;
let freqVal      = 2;
let noiseVal     = 0, foldVal = 0;
let bulgeTarget  = 0, bulgeVal = 0;
let initTouches  = [], stones = [];

// double-tap tracker
let lastTap = 0, tapDelay = 300;

// —————————————————————————————————————————————————————————————
// AUDIO SETUP
// —————————————————————————————————————————————————————————————
let audioStarted = false;
let synthPure, synthRich, tremoloNode,
    filterNode, distortionNode,
    delayNode, reverbNode,
    chordLoop, stoneSynth,
    noiseNode, noiseFilter, noiseGain;

const scaleNotes = ['C4','D4','E4','G4','A4','C5','D5','E5'];

function setup() {
  // p5 canvas
  createCanvas(windowWidth, windowHeight);
  noFill();
  strokeCap(ROUND);

  // stripe spacing ≈20%
  const regionH = height * 0.2;
  rowSpacing = regionH / (stripes - 1);
  waveAmp    = rowSpacing * 0.5;
  stroke('#fff');

  // headroom
  Tone.Destination.volume.value = -12;

  // Audio: FILTER → DISTORTION → DELAY → REVERB → OUT
  filterNode     = new Tone.Filter(800, 'lowpass');
  distortionNode = new Tone.Distortion(0).set({ oversample: '4x' });
  delayNode      = new Tone.PingPongDelay("4n", 0.3);
  reverbNode     = new Tone.Reverb({ decay: 3, wet: 0 }).toDestination();

  filterNode.connect(distortionNode);
  distortionNode.connect(delayNode);
  delayNode.connect(reverbNode);

  // white noise (silent)
  noiseNode   = new Tone.Noise('white').start();
  noiseFilter = new Tone.Filter(2000, 'lowpass');
  noiseGain   = new Tone.Gain(0).connect(reverbNode);
  noiseNode.connect(noiseFilter).connect(noiseGain);

  // drone + tremolo
  tremoloNode = new Tone.Tremolo(0, 0).start();
  synthPure = new Tone.PolySynth(Tone.Synth, {
    oscillator:{ type:'sine' },
    envelope:  { attack:0.5, decay:0.3, sustain:0.7, release:1.5 }
  }).connect(tremoloNode);
  synthPure.volume.value = -24;

  synthRich = new Tone.PolySynth(Tone.Synth, {
    oscillator:{ type:'triangle' },
    envelope:  { attack:0.3, decay:0.5, sustain:0.3, release:1.5 }
  }).connect(tremoloNode);
  synthRich.volume.value = -30;

  tremoloNode.connect(filterNode);

  // stone pluck synth
  stoneSynth = new Tone.Synth({
    oscillator:{ type:'sine' },
    envelope:  { attack:0.02, decay:0.5, sustain:0.1, release:1 }
  }).connect(filterNode);
}

function draw() {
  // smooth bulgeVal → bulgeTarget
  bulgeVal += (bulgeTarget - bulgeVal) * 0.1;
  if (abs(bulgeVal - bulgeTarget) < 0.005) bulgeVal = bulgeTarget;

  // pastel background
  colorMode(HSL, 360,100,100);
  let hue = 100 + (bulgeVal - 0.5)*30 + (noiseVal - 0.5)*20;
  let sat = 10 + noiseVal*30, lit = 85 - bulgeVal*10;
  background(hue, sat, lit);
  colorMode(RGB);

  // time scaled by freqVal → faster wave flow when you swipe right
  const t   = millis() * 0.001 * freqVal;
  const now = millis();

  // draw stripes
  for (let i = 0; i < stripes; i++) {
    const centerY = height/2,
          half    = (stripes-1)/2,
          y0      = centerY + (i-half)*rowSpacing,
          bendF   = map(abs(i-half), 0, half, 1, 2);

    let pts = [];
    for (let x = 0; x <= width; x += 5) {
      // basic sine
      let phase = TWO_PI * freqVal * (x/width) + t;
      let y     = waveAmp * sin(phase);

      // warp amplitude controlled by bulgeVal: down = smooth, up = spiky
      let wamp = waveAmp * bulgeVal;
      y += (noise(x * noiseVal * 0.1 + t * 0.5, i * 0.2) - 0.5) * wamp;

      // wave-fold by rotation
      if (foldVal > 0) {
        let f = foldVal * rowSpacing;
        y = abs(((y + f) % (2 * f)) - f);
      }

      let yy = y0 + y;

      // stone repulsion + burst
      for (let st of stones) {
        let dx = x - st.x, dy = yy - st.y, d = sqrt(dx*dx + dy*dy);
        if (d < st.r) {
          let push = (st.r - d) / st.r,
              sign = dy / (d || 1);
          // ease-in-out burst per stone
          let curr = st.strength;
          if (st.pushStart) {
            let e = (now - st.pushStart) / st.pushDur;
            if (e < 1) curr += st.strength * easeInOutQuad(e);
            else st.pushStart = 0;
          }
          y  += sign * push * curr * bendF;
          yy = y0 + y;
        }
      }

      pts.push({ x, y: yy });
    }

    // render with inverted thickness: down = thick, up = thin
    for (let j = 0; j < pts.length - 1; j++) {
      const p0 = pts[j], p1 = pts[j+1];
      const norm  = j/(pts.length-1);
      const baseLw = map(sin(frameCount*0.005), -1,1, 0.5,3);
      const peakLw = baseLw + (1 - bulgeVal)*4;
      strokeWeight(lerp(baseLw, peakLw, sin(norm*PI)));
      line(p0.x, p0.y, p1.x, p1.y);
    }
  }
}

function touchStarted() {
  if (!audioStarted) {
    Tone.start().then(()=>{
      Tone.Transport.start();
      chordLoop = new Tone.Loop(playChord, '1m').start(0);
      audioStarted = true;
    });
  }
  initTouches = touches.map(t => ({ ...t }));
  return false;
}

function touchMoved() {
  if (touches.length === 1) {
    let { x, y } = touches[0];

    // bulge target from vertical swipe
    bulgeTarget = constrain(map(y, height, 0, 0, 1), 0, 1);

    // row spacing
    const minSp = (height*0.15)/(stripes-1),
          maxSp = (height*0.25)/(stripes-1);
    rowSpacing = constrain(map(y, 0, height, maxSp, minSp), minSp, maxSp);
    waveAmp    = rowSpacing * 0.5;

    // speed & stone interval
    freqVal = constrain(map(x, 0, width, 0.5, 5), 0.5, 8);
    let newI = map(freqVal, 0.5, 5, 2, 0.2);
    for (let st of stones) st.loop.interval = newI;

    // DOWN swipe: more reverb + delay
    let wetRev = (1 - bulgeVal) * 0.8,
        wetDel = (1 - bulgeVal) * 0.5;
    reverbNode.wet.rampTo(wetRev, 0.5);
    delayNode.wet.rampTo(wetDel, 0.5);

  } else if (touches.length === 2 && initTouches.length === 2) {
    const [a1,b1] = initTouches, [a2,b2] = touches;
    const ang0 = atan2(b1.y - a1.y, b1.x - a1.x),
          ang1 = atan2(b2.y - a2.y, b2.x - a2.x),
          v    = constrain(map(abs(ang1 - ang0), 0, PI, 0, 1), 0, 1);
    noiseVal = foldVal = v;
    // gentle noise bed up to 0.5%
    noiseGain.gain.rampTo(foldVal * 0.005, 0.5);
  }
  return false;
}

function touchEnded() {
  if (touches.length === 0 && initTouches.length === 1) {
    let now = millis();
    if (now - lastTap < tapDelay) {
      const t0 = initTouches[0];
      let st = {
        x: t0.x, y: t0.y,
        r: width * 0.15,
        strength: 40,
        interval: map(freqVal, 0.5, 5, 2, 0.2),
        pushStart: 0,
        pushDur: 0
      };
      st.pushDur = st.interval * 1000 * 0.5;
      stones.push(st);

      // phase-randomize start
      let startT = Tone.now() + Math.random() * st.interval;
      st.loop = new Tone.Loop(time => {
        // snappier ADS at high speed
        stoneSynth.envelope.attack = map(freqVal, 0.5, 5, 1.2, 0.005);
        stoneSynth.envelope.decay  = map(freqVal, 0.5, 5, 1.5, 0.05);
        let deg = floor(map(st.x, 0, width, 0, scaleNotes.length));
        deg = constrain(deg, 0, scaleNotes.length - 1);
        stoneSynth.triggerAttackRelease(scaleNotes[deg], '8n', time, 0.4);
        // burst for this stone only
        st.pushStart = millis();
      }, st.interval).start(startT);

      // immediate pluck + burst
      stoneSynth.envelope.attack = map(freqVal, 0.5, 5, 1.2, 0.005);
      stoneSynth.envelope.decay  = map(freqVal, 0.5, 5, 1.5, 0.05);
      stoneSynth.triggerAttackRelease(
        scaleNotes[scaleNotes.length - 1],
        '8n', undefined, 0.4
      );
      st.pushStart = millis();
    }
    lastTap = now;
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

// —————————————————————————————————————————————————————————————
// DRONE CALLBACK
// —————————————————————————————————————————————————————————————
function playChord(time) {
  let idx = floor(map(freqVal, 0.5, 5, 0, scaleNotes.length - 3));
  idx = constrain(idx, 0, scaleNotes.length - 3);
  const chord = [
    scaleNotes[idx],
    scaleNotes[idx + 1],
    scaleNotes[idx + 2]
  ];

  synthPure.volume.value = -24 + noiseVal * 4;
  synthRich.volume.value = -30 + noiseVal * 4;

  // DOWN: low-pass; UP: bright
  filterNode.frequency.value = lerp(200, 4000, bulgeVal);

  // tremolo depth & rate
  tremoloNode.depth           = foldVal;
  tremoloNode.frequency.value = map(foldVal, 0, 1, 2, 12);

  synthPure.triggerAttackRelease(chord, '1m', time);
  synthRich.triggerAttackRelease(chord, '1m', time);
}

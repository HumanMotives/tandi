// sketch.js

// —————————————————————————————————————————————————————————————
// VISUAL SETUP
// —————————————————————————————————————————————————————————————
const stripes = 12;
let rowSpacing, waveAmp;
let freqVal = 2;
let noiseVal = 0, foldVal = 0;
let bulgeVal = 0;
let initTouches = [];
let stones = [];

// —————————————————————————————————————————————————————————————
// AUDIO SETUP
// —————————————————————————————————————————————————————————————
let audioStarted = false;
let synthPure, synthRich, tremoloNode, filterNode, reverbNode, chordLoop, stoneSynth;
const scaleNotes = ['C4','D4','E4','G4','A4','C5','D5','E5'];

function setup() {
  // p5
  createCanvas(windowWidth, windowHeight);
  noFill();
  strokeCap(ROUND);
  const regionH = height * 0.2;
  rowSpacing = regionH / (stripes - 1);
  waveAmp    = rowSpacing * 0.5;
  stroke('#fff');

  // tone master headroom
  Tone.Destination.volume.value = -12;

  // FX: synths → tremolo → filter → reverb → out
  tremoloNode  = new Tone.Tremolo(0, 0).start();
  filterNode   = new Tone.Filter(800, 'lowpass');
  reverbNode   = new Tone.Reverb({ decay: 3, wet: 0 }).toDestination();

  tremoloNode.connect(filterNode);
  filterNode.connect(reverbNode);

  // drone voices
  synthPure = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope:   { attack: 0.5, decay: 0.3, sustain: 0.7, release: 1.5 }
  }).connect(tremoloNode);
  synthPure.volume.value = -24;

  synthRich = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope:   { attack: 0.3, decay: 0.5, sustain: 0.3, release: 1.5 }
  }).connect(tremoloNode);
  synthRich.volume.value = -30;

  // warm stone synth
  stoneSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope:   { attack: 0.02, decay: 0.5, sustain: 0.1, release: 1 }
  }).connect(reverbNode);
}

function draw() {
  // pastel HSL background
  colorMode(HSL, 360,100,100);
  let hue = 100 + (bulgeVal - 0.5)*30 + (noiseVal - 0.5)*20;
  let sat = 10 + noiseVal*30;
  let lit = 85 - bulgeVal*10;
  background(hue, sat, lit);
  colorMode(RGB);

  // exponential time‐scale for slow freeze at low freqVal
  const norm = constrain((freqVal - 0.5)/(5 - 0.5),0,1);
  const tScale = 0.00005 + Math.pow(norm,2)*(0.002 - 0.00005);
  const t = millis() * tScale;

  // draw stripes
  for (let i = 0; i < stripes; i++) {
    const cY = height/2;
    const half = (stripes - 1)/2;
    const y0 = cY + (i - half)*rowSpacing;
    const bendF = map(abs(i-half),0,half,1,2);

    let pts = [];
    for (let x = 0; x <= width; x += 5) {
      let phase = TWO_PI * freqVal * (x/width) + t;
      let y = waveAmp * sin(phase);

      // perlin warp
      y += (noise(x*noiseVal*0.1 + t*0.5, i*0.2)-0.5)*waveAmp;
      // wave‐fold
      if (foldVal > 0) {
        const f = foldVal * rowSpacing;
        y = abs(((y + f)%(2*f)) - f);
      }

      // stone repulsion
      let yy = y0 + y;
      for (let st of stones) {
        let dx = x - st.x, dy = yy - st.y, d = sqrt(dx*dx + dy*dy);
        if (d < st.r) {
          let push = (st.r - d)/st.r;
          let sign = dy/(d||1);
          y += sign * push * st.strength * bendF;
          yy = y0 + y;
        }
      }
      pts.push({ x, y: yy });
    }

    // render segments
    for (let j = 0; j < pts.length - 1; j++) {
      const p0 = pts[j], p1 = pts[j+1];
      const norm2 = j/(pts.length-1);
      const baseLw = map(sin(frameCount*0.005), -1,1, 0.5,3);
      const peakLw = baseLw + bulgeVal*4;
      strokeWeight( lerp(baseLw, peakLw, sin(norm2*PI)) );
      line(p0.x,p0.y,p1.x,p1.y);
    }
  }
}

// —————————————————————————————————————————————————————————————
// TOUCH INTERACTIONS
// —————————————————————————————————————————————————————————————
function touchStarted() {
  if (!audioStarted) {
    Tone.start().then(() => {
      Tone.Transport.start();
      chordLoop = new Tone.Loop(playChord, '1m').start(0);
      audioStarted = true;
    });
  }
  initTouches = touches.map(t=>({...t}));
  return false;
}

function touchMoved() {
  if (touches.length === 1) {
    let { x,y } = touches[0];
    bulgeVal = constrain(map(y, height,0, 0,1),0,1);
    const minSp = (height*0.15)/(stripes-1),
          maxSp = (height*0.25)/(stripes-1);
    rowSpacing = constrain(map(y,0,height, maxSp,minSp), minSp,maxSp);
    waveAmp    = rowSpacing*0.5;
    freqVal    = constrain(map(x,0,width, 0.5,5), 0.5,8);
  }
  else if (touches.length===2 && initTouches.length===2) {
    let [a1,b1] = initTouches, [a2,b2] = touches;
    let ang0 = atan2(b1.y-a1.y,b1.x-a1.x),
        ang1 = atan2(b2.y-a2.y,b2.x-a2.x),
        v    = constrain(map(abs(ang1-ang0),0,PI,0,1),0,1);
    noiseVal = foldVal = v;
  }
  return false;
}

function touchEnded() {
  if (touches.length===0 && initTouches.length===1) {
    // limit to 5 stones
    if (stones.length >= 5) {
      let old = stones.shift();
      old.loop.stop(); old.loop.dispose();
    }
    let t0 = initTouches[0];
    let st = {
      x: t0.x, y: t0.y,
      r: width*0.15, strength:40,
      interval: map(freqVal,0.5,5, 2,0.2)
    };
    stones.push(st);

    // compute octave shifts [-range…+range]
    const n = stones.length, range = n-1;
    st.loop = new Tone.Loop(time => {
      let deg = floor(map(st.x,0,width, 0, scaleNotes.length));
      deg = constrain(deg,0,scaleNotes.length-1);
      let base = scaleNotes[deg];
      // determine this stone’s index
      const i = stones.indexOf(st);
      // shift = ((2*i/(n-1))-1)*range
      const shift = Math.round(((2*i/(n-1))-1)*range);
      const note  = Tone.Frequency(base).transpose(12*shift).toNote();
      // dynamic envelope from foldVal
      stoneSynth.envelope.attack = 0.02 + foldVal*0.3;
      stoneSynth.envelope.decay  = 0.5  + foldVal*0.5;
      stoneSynth.triggerAttackRelease(note, '8n', time, 0.4);
    }, st.interval).start(0);

    // immediate pluck with same dynamic envelope
    stoneSynth.envelope.attack = 0.02 + foldVal*0.3;
    stoneSynth.envelope.decay  = 0.5  + foldVal*0.5;
    // use top note, no shift
    stoneSynth.triggerAttackRelease(scaleNotes[scaleNotes.length-1], '8n', undefined, 0.4);
  }
  initTouches = [];
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  const regionH = height*0.2;
  rowSpacing = regionH/(stripes-1);
  waveAmp    = rowSpacing*0.5;
}

// —————————————————————————————————————————————————————————————
// DRONE CALLBACK
// —————————————————————————————————————————————————————————————
function playChord(time) {
  let idx = floor(map(freqVal,0.5,5, 0, scaleNotes.length-3));
  idx = constrain(idx,0,scaleNotes.length-3);
  const chord = [ scaleNotes[idx], scaleNotes[idx+1], scaleNotes[idx+2] ];

  synthPure.volume.value = -24 + noiseVal*4;
  synthRich.volume.value = -30 + noiseVal*4;

  // inverted filter: thick=dull, thin=bright
  const cutoff = lerp(400,2000, 1 - bulgeVal);
  filterNode.frequency.value = cutoff;

  // tremolo from foldVal
  tremoloNode.depth = foldVal;                       // 0→1
  tremoloNode.frequency.value = map(foldVal,0,1, 2,12);

  reverbNode.wet.value = constrain(bulgeVal*0.6,0,0.9);

  synthPure.triggerAttackRelease(chord,'1m',time);
  synthRich.triggerAttackRelease(chord,'1m',time);
}

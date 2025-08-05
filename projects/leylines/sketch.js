// sketch.js

// —————————————————————————————————————————————————————————————
// VISUAL SETUP
// —————————————————————————————————————————————————————————————
const stripes = 12;
let rowSpacing, waveAmp;
let freqVal   = 2;
let noiseVal  = 0, foldVal = 0;
let bulgeVal  = 0;
let initTouches = [];
let stones      = [];

// —————————————————————————————————————————————————————————————
// AUDIO SETUP
// —————————————————————————————————————————————————————————————
let audioStarted = false;
let synthPure, synthRich,
    tremoloNode, filterNode, reverbNode, chordLoop,
    stoneSynth, noiseNode, noiseFilter, noiseGain;

const scaleNotes = ['C4','D4','E4','G4','A4','C5','D5','E5'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();
  strokeCap(ROUND);

  // Visual band = 20% height
  const regionH = height * 0.2;
  rowSpacing = regionH/(stripes-1);
  waveAmp    = rowSpacing*0.5;
  stroke('#fff');

  // Master volume headroom
  Tone.Destination.volume.value = -12;

  // FX chain: drone → tremolo → filter → reverb → out
  tremoloNode = new Tone.Tremolo(0, 0).start();
  filterNode  = new Tone.Filter(800, 'lowpass');
  reverbNode  = new Tone.Reverb({ decay: 3, wet: 0 }).toDestination();

  tremoloNode.connect(filterNode);
  filterNode.connect(reverbNode);

  // White noise for texture
  noiseNode   = new Tone.Noise('white').start();
  noiseFilter = new Tone.Filter(2000, 'lowpass');
  noiseGain   = new Tone.Gain(0);         // start at 0
  noiseNode.connect(noiseFilter).connect(noiseGain).connect(filterNode);

  // Drone synths
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

  // Stone synth (bypasses tremolo)
  stoneSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope:   { attack: 0.02, decay: 0.5, sustain: 0.1, release: 1 }
  }).connect(reverbNode);
}

function draw() {
  // Pastel background
  colorMode(HSL, 360,100,100);
  let hue = 100 + (bulgeVal - 0.5)*30 + (noiseVal - 0.5)*20;
  let sat = 10 + noiseVal*30;
  let lit = 85 - bulgeVal*10;
  background(hue, sat, lit);
  colorMode(RGB);

  // Exponential time-scale for visuals
  const norm   = constrain((freqVal - 0.5)/(5 - 0.5),0,1);
  const tScale = 0.00005 + norm*norm*(0.002 - 0.00005);
  const t      = millis() * tScale;

  // Draw stripes
  for (let i=0; i<stripes; i++) {
    const cY   = height/2;
    const half = (stripes-1)/2;
    const y0   = cY + (i-half)*rowSpacing;
    const bend = map(abs(i-half), 0, half, 1, 2);

    let pts = [];
    for (let x=0; x<=width; x+=5) {
      let phase = TWO_PI * freqVal * (x/width) + t;
      let y     = waveAmp * sin(phase);

      // Warp & fold
      y += (noise(x*noiseVal*0.1 + t*0.5, i*0.2) - 0.5)*waveAmp;
      if (foldVal>0) {
        let f = foldVal * rowSpacing;
        y = abs(((y+f)%(2*f)) - f);
      }

      // Stones repulsion
      let yy = y0 + y;
      for (let st of stones) {
        let dx = x - st.x, dy = yy - st.y, d = sqrt(dx*dx + dy*dy);
        if (d<st.r) {
          let push = (st.r - d)/st.r,
              sign = dy/(d||1);
          y += sign * push * st.strength * bend;
          yy = y0 + y;
        }
      }

      pts.push({ x, y: yy });
    }

    // Pen‐stroke render
    for (let j=0; j<pts.length-1; j++) {
      const p0 = pts[j], p1 = pts[j+1];
      const norm2  = j/(pts.length-1);
      const baseLw = map(sin(frameCount*0.005), -1,1, 0.5,3);
      const peakLw = baseLw + bulgeVal*4;
      strokeWeight( lerp(baseLw, peakLw, sin(norm2*PI)) );
      line(p0.x,p0.y,p1.x,p1.y);
    }
  }
}

// —————————————————————————————————————————————————————————————
// TOUCH HANDLERS
// —————————————————————————————————————————————————————————————
function touchStarted() {
  if (!audioStarted) {
    Tone.start().then(()=>{
      // Initial tempo map
      Tone.Transport.bpm.value = map(freqVal,0.5,5,10,120);
      Tone.Transport.start();
      chordLoop = new Tone.Loop(playChord, '1m').start(0);
      audioStarted = true;
    });
  }
  initTouches = touches.map(t=>({...t}));
  return false;
}

function touchMoved() {
  if (touches.length===1) {
    let { x,y } = touches[0];
    bulgeVal = constrain(map(y, height,0, 0,1),0,1);
    const minSp = (height*0.15)/(stripes-1),
          maxSp = (height*0.25)/(stripes-1);
    rowSpacing = constrain(map(y,0,height,maxSp,minSp), minSp,maxSp);
    waveAmp    = rowSpacing*0.5;
    freqVal    = constrain(map(x,0,width,0.5,5),0.5,8);

    // Smooth tempo change over 0.1s
    Tone.Transport.bpm.rampTo(map(freqVal,0.5,5,10,120), 0.1);
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
    // cap stones at 5
    if (stones.length>=5) {
      let old = stones.shift();
      old.loop.stop(); old.loop.dispose();
    }
    const t0 = initTouches[0];
    let st = {
      x: t0.x, y: t0.y,
      r: width*0.15, strength:40,
      interval: map(freqVal,0.5,5, 10,0.2)
    };
    stones.push(st);

    // Create loop with position-based pitch
    st.loop = new Tone.Loop(time=>{
      let deg = floor(map(st.x,0,width,0,scaleNotes.length));
      deg = constrain(deg,0,scaleNotes.length-1);
      let shift = round(constrain(map(st.y,height,0,-2,2),-2,2));
      let note  = Tone.Frequency(scaleNotes[deg]).transpose(12*shift).toNote();

      // Pluck envelope scaled by foldVal
      stoneSynth.envelope.attack  = lerp(0.02, 0.8, foldVal);
      stoneSynth.envelope.decay   = lerp(0.2,  1.2, foldVal);
      stoneSynth.envelope.release = lerp(0.3,  2.0, foldVal);

      stoneSynth.triggerAttackRelease(note, '8n', time, 0.4);
    }, st.interval).start(0);

    // Immediate pluck
    stoneSynth.envelope.attack  = lerp(0.02, 0.8, foldVal);
    stoneSynth.envelope.decay   = lerp(0.2,  1.2, foldVal);
    stoneSynth.envelope.release = lerp(0.3,  2.0, foldVal);
    stoneSynth.triggerAttackRelease(
      scaleNotes[scaleNotes.length-1],
      '8n', undefined, 0.4
    );
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
  const chord = [
    scaleNotes[idx],
    scaleNotes[idx+1],
    scaleNotes[idx+2]
  ];

  // Smooth synth volumes
  synthPure.volume.rampTo(-24 + noiseVal*4, 0.5);
  synthRich.volume.rampTo(-30 + noiseVal*4, 0.5);

  // Inverted filter: thick=dull, thin=bright → smooth
  const cutoff = lerp(400,2000, 1 - bulgeVal);
  filterNode.frequency.rampTo(cutoff, 0.5);

  // Tremolo from foldVal → smooth
  tremoloNode.depth.rampTo(foldVal, 0.5);
  tremoloNode.frequency.rampTo(map(foldVal,0,1,2,12), 0.5);

  // Reverb wet (bulge + fold) → smooth
  const wet = constrain(bulgeVal*0.4 + foldVal*0.6, 0, 1);
  reverbNode.wet.rampTo(wet, 0.5);

  // Noise blend up to 5% → smooth
  noiseGain.gain.rampTo(foldVal * 0.05, 0.5);

  synthPure.triggerAttackRelease(chord, '1m', time);
  synthRich.triggerAttackRelease(chord, '1m', time);
}

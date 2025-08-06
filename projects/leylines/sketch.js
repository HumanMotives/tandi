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
// DOUBLE‐TAP TRACKER
// —————————————————————————————————————————————————————————————
let lastTap = 0, tapDelay = 300;

// —————————————————————————————————————————————————————————————
// AUDIO SETUP
// —————————————————————————————————————————————————————————————
let audioStarted = false;
let synthPure, synthRich, tremoloNode, filterNode, reverbNode, chordLoop, stoneSynth;
let noiseNode, noiseFilter, noiseGain;
const scaleNotes = ['C4','D4','E4','G4','A4','C5','D5','E5'];

function setup() {
  // p5 canvas
  createCanvas(windowWidth, windowHeight);
  noFill();
  strokeCap(ROUND);

  // initial band height ≈20%
  const regionH = height * 0.2;
  rowSpacing = regionH / (stripes - 1);
  waveAmp    = rowSpacing * 0.5;
  stroke('#fff');

  // headroom
  Tone.Destination.volume.value = -12;

  // FILTER → DISTORT → REVERB → OUT
  filterNode     = new Tone.Filter(800, 'lowpass');
  distortionNode = new Tone.Distortion(0).set({ oversample: '4x' });
  reverbNode     = new Tone.Reverb({ decay: 3, wet: 0 }).toDestination();
  filterNode.connect(distortionNode);
  distortionNode.connect(reverbNode);

  // noise for atmosphere
  noiseNode   = new Tone.Noise('white').start();
  noiseFilter = new Tone.Filter(2000, 'lowpass');
  noiseGain   = new Tone.Gain(0).connect(reverbNode);
  noiseNode.connect(noiseFilter).connect(noiseGain);

  // drone voices
  tremoloNode = new Tone.Tremolo(0, 0).start();
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

  tremoloNode.connect(filterNode);
  filterNode.connect(reverbNode);

  // stone pluck synth
  stoneSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope:   { attack: 0.02, decay: 0.5, sustain: 0.1, release: 1 }
  }).connect(filterNode);
}

function draw() {
  // pastel HSL background
  colorMode(HSL, 360,100,100);
  let hue = 100 + (bulgeVal - 0.5)*30 + (noiseVal - 0.5)*20;
  let sat = 10 + noiseVal*30;
  let lit = 85 - bulgeVal*10;
  background(hue,sat,lit);
  colorMode(RGB);

  const t = millis() * 0.001;

  // draw stripes
  for (let i = 0; i < stripes; i++) {
    const centerY = height/2;
    const half    = (stripes-1)/2;
    const y0      = centerY + (i-half)*rowSpacing;
    const bendF   = map(abs(i-half), 0, half, 1, 2);

    let pts = [];
    for (let x = 0; x <= width; x += 5) {
      let phase = TWO_PI*freqVal*(x/width) + t;
      let y     = waveAmp * sin(phase);
      y += (noise(x*noiseVal*0.1 + t*0.5, i*0.2)-0.5)*waveAmp;
      if (foldVal > 0) {
        let f = foldVal * rowSpacing;
        y = abs(((y+f)%(2*f)) - f);
      }
      let yy = y0 + y;
      for (let st of stones) {
        let dx = x-st.x, dy = yy-st.y, d = sqrt(dx*dx + dy*dy);
        if (d < st.r) {
          let push = (st.r - d)/st.r,
              sign = dy/(d||1);
          y  += sign * push * st.strength * bendF;
          yy  = y0 + y;
        }
      }
      pts.push({x, y:yy});
    }

    for (let j = 0; j < pts.length-1; j++) {
      const p0 = pts[j], p1 = pts[j+1];
      const norm = j/(pts.length-1);
      const baseLw = map(sin(frameCount*0.005), -1,1, 0.5,3);
      const peakLw = baseLw + bulgeVal*4;
      strokeWeight(lerp(baseLw,peakLw, sin(norm*PI)));
      line(p0.x,p0.y,p1.x,p1.y);
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
  initTouches = touches.map(t=>({...t}));
  return false;
}

function touchMoved() {
  if (touches.length === 1) {
    let {x,y} = touches[0];
    // bulge & spacing
    bulgeVal = constrain(map(y, height,0, 0,1),0,1);
    const minSp = (height*0.15)/(stripes-1),
          maxSp = (height*0.25)/(stripes-1);
    rowSpacing = constrain(map(y,0,height, maxSp,minSp),minSp,maxSp);
    waveAmp    = rowSpacing*0.5;
    // speed
    freqVal    = constrain(map(x,0,width, 0.5,5),0.5,8);

    // — update each stone’s interval dynamically —
    let newInterval = map(freqVal, 0.5, 5, 2, 0.2);
    for (let st of stones) {
      st.loop.interval = newInterval;
    }
  }
  else if (touches.length === 2 && initTouches.length === 2) {
    const [a1,b1] = initTouches, [a2,b2] = touches;
    const ang0 = atan2(b1.y-a1.y, b1.x-a1.x),
          ang1 = atan2(b2.y-a2.y, b2.x-a2.x),
          v    = constrain(map(abs(ang1-ang0),0,PI,0,1),0,1);
    noiseVal = foldVal = v;
    // smooth noise fade
    noiseGain.gain.rampTo(foldVal * 0.02, 0.5);
  }
  return false;
}

function touchEnded() {
  if (touches.length===0 && initTouches.length===1) {
    let now = millis();
    if (now - lastTap < tapDelay) {
      // place stone
      const t0 = initTouches[0];
      let st = {
        x: t0.x, y: t0.y,
        r: width*0.15,
        strength: 40,
        interval: map(freqVal,0.5,5,2,0.2)
      };
      stones.push(st);
      st.loop = new Tone.Loop(time=>{
        // ADS envelope based on freqVal
        let atk = map(freqVal,0.5,5,0.8,0.02);
        let dec = map(freqVal,0.5,5,1.2,0.1);
        stoneSynth.envelope.attack = atk;
        stoneSynth.envelope.decay  = dec;
        // pitch by x-position
        let deg = floor(map(st.x,0,width,0,scaleNotes.length));
        deg = constrain(deg,0,scaleNotes.length-1);
        stoneSynth.triggerAttackRelease(scaleNotes[deg],'8n',time,0.4);
      }, st.interval).start(0);
      // immediate pluck
      let atk0 = map(freqVal,0.5,5,0.8,0.02);
      let dec0 = map(freqVal,0.5,5,1.2,0.1);
      stoneSynth.envelope.attack = atk0;
      stoneSynth.envelope.decay  = dec0;
      stoneSynth.triggerAttackRelease(
        scaleNotes[scaleNotes.length-1],
        '8n', undefined, 0.4
      );
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
// DRONE CALLBACK (with tremolo controlled by foldVal)
// —————————————————————————————————————————————————————————————
function playChord(time) {
  let idx = floor(map(freqVal,0.5,5, 0, scaleNotes.length-3));
  idx = constrain(idx,0,scaleNotes.length-3);
  const chord = [
    scaleNotes[idx],
    scaleNotes[idx+1],
    scaleNotes[idx+2]
  ];

  synthPure.volume.value = -24 + noiseVal*4;
  synthRich.volume.value = -30 + noiseVal*4;

  filterNode.frequency.value = lerp(4000,200, bulgeVal);

  // tremolo from foldVal
  tremoloNode.depth           = foldVal;              
  tremoloNode.frequency.value = map(foldVal,0,1, 2,12);

  // reverb plus a bit of noise
  reverbNode.wet.rampTo(constrain(bulgeVal*0.6 + foldVal*0.4,0,0.9), 0.5);

  synthPure.triggerAttackRelease(chord,'1m',time);
  synthRich.triggerAttackRelease(chord,'1m',time);
}

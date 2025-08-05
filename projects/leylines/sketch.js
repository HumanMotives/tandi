// sketch.js

let amplitude, freq, patternAngle;
let noiseVisual = 0, foldVisual = 0;
let lastScaleFactor = 1;
let dragging = false;
let initTouches = [], initAmp, initFreq, initAng;
const toolbarH = 60;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();
  amplitude    = height * 0.1;
  freq         = 2;
  patternAngle = 0;
  // ensure the Waves button is highlighted
  document.querySelector('#toolbar button[data-mode="waves"]')
    .classList.add('active');
}

function draw() {
  background(245);

  // FIX: Use a constant timebase so it never freezes
  const t = millis() * 0.002;

  // Only the lines rotate, not the entire canvas element
  push();
    translate(width/2, height/2);
    rotate(patternAngle);
    translate(-width/2, -height/2);
    drawCompositeWave(t);
  pop();
}

function drawCompositeWave(t) {
  const stripes = 12;
  // subtle breathing line‐width LFO
  const lw = map(sin(frameCount * 0.005), -1, 1, 1, 6);
  stroke(50);

  let maxAbsY = 0;
  for (let i = 0; i < stripes; i++) {
    let y0 = map(i, 0, stripes - 1, height * 0.2, height * 0.8);
    strokeWeight(lw * map(amplitude, 0, height*0.5, 0.5, 1.5));

    beginShape();
    for (let x = 0; x <= width; x += 5) {
      // base sine wave
      let phase = TWO_PI * freq * (x/width) + t;
      let y = amplitude * sin(phase);

      // Perlin warp (when pinch‐in region B)
      y += (noise(
        x * noiseVisual * 0.1 + t * 0.5,
        i * 0.2
      ) - 0.5) * amplitude * 0.5;

      // wave‐fold (when pinch‐in region B)
      if (foldVisual > 0) {
        const foldAmt = foldVisual * 50;
        y = abs(((y + foldAmt) % (2 * foldAmt)) - foldAmt);
      }

      vertex(x, y0 + y);
      maxAbsY = max(maxAbsY, abs(y));
    }
    endShape();
  }

  // Spike detection → trigger pluck
  if (maxAbsY > amplitude * 0.8) {
    if (!this._lastSpike) this._lastSpike = 0;
    const now = millis();
    if (now - this._lastSpike > 500) {
      triggerSpikeNote();
      this._lastSpike = now;
    }
  }
}

async function touchStarted() {
  await startAudio();  // unlock audio context
  if (touches.length === 2) {
    initTouches = [ { ...touches[0] }, { ...touches[1] } ];
    initAmp     = amplitude;
    initFreq    = freq;
    initAng     = patternAngle;
    dragging    = true;
  }
  return false;
}

function touchMoved() {
  if (dragging && touches.length === 2) {
    const [a1,b1] = initTouches, [a2,b2] = touches;

    // raw pinch scale
    const d0 = dist(a1.x,a1.y, b1.x,b1.y);
    const d1 = dist(a2.x,a2.y, b2.x,b2.y);
    let scaleFactor = d1 / d0;

    // clamp so we never divide by zero or go off-scale
    lastScaleFactor = constrain(scaleFactor, 0.2, 3);

    // rotation delta
    const ang0 = atan2(b1.y - a1.y, b1.x - a1.x);
    const ang1 = atan2(b2.y - a2.y, b2.x - a2.x);
    const deltaAng = ang1 - ang0;

    // inverted mapping: pinch out = calm; pinch in = agitated
    amplitude    = initAmp;
    freq         = constrain(initFreq / lastScaleFactor, 0.1, 8);
    patternAngle = initAng + deltaAng;

    // which third of the screen?
    const cx     = (touches[0].x + touches[1].x) / 2;
    const region = cx < width/3
      ? 'A'
      : cx < 2*width/3
      ? 'B'
      : 'C';

    // inward pinch (scale<1) → val≈1; outward → val≈0
    const val = constrain(map(lastScaleFactor, 1, 0.2, 0, 1), 0, 1);
    modSynth(region, val);

    // visuals mod only in B
    if (region === 'B') {
      noiseVisual = val;
      foldVisual  = val;
    }
  }
  return false;
}

function touchEnded() {
  dragging = false;
  lastScaleFactor = 1;  // reset
  return false;
}

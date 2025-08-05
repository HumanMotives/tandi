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
  // highlight Waves button
  document.querySelector('#toolbar button[data-mode="waves"]')
    .classList.add('active');
}

function draw() {
  background(245);

  // compute a safe time‐warp: invert a clamped scale factor
  const safeScale = constrain(lastScaleFactor, 0.5, 3);
  const timeScale = 1 / safeScale;
  const t = millis() * 0.002 * timeScale;

  push();
    translate(width / 2, height / 2);
    rotate(patternAngle);
    translate(-width / 2, -height / 2);
    drawCompositeWave(t);
  pop();
}

function drawCompositeWave(t) {
  const stripes = 12;
  const lw = map(sin(frameCount * 0.005), -1, 1, 1, 6);
  stroke(50);

  let maxAbsY = 0;
  for (let i = 0; i < stripes; i++) {
    let y0 = map(i, 0, stripes - 1, height * 0.2, height * 0.8);
    strokeWeight(lw * map(amplitude, 0, height * 0.5, 0.5, 1.5));

    beginShape();
    for (let x = 0; x <= width; x += 5) {
      let phase = TWO_PI * freq * (x / width) + t;
      let y = amplitude * sin(phase);

      // Perlin warp
      y += (noise(
        x * noiseVisual * 0.1 + t * 0.5,
        i * 0.2
      ) - 0.5) * amplitude * 0.5;

      // wave‐fold
      if (foldVisual > 0) {
        const foldAmt = foldVisual * 50;
        y = abs(((y + foldAmt) % (2 * foldAmt)) - foldAmt);
      }

      vertex(x, y0 + y);
      maxAbsY = max(maxAbsY, abs(y));
    }
    endShape();
  }

  // detect spikes and trigger pluck
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
  await startAudio();
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
    const [a1, b1] = initTouches;
    const [a2, b2] = touches;
    // raw scale factor
    const d0 = dist(a1.x, a1.y, b1.x, b1.y);
    const d1 = dist(a2.x, a2.y, b2.x, b2.y);
    let scaleFactor = d1 / d0;

    // clamp to avoid freeze
    lastScaleFactor = constrain(scaleFactor, 0.2, 3);

    // rotation delta
    const ang0 = atan2(b1.y - a1.y, b1.x - a1.x);
    const ang1 = atan2(b2.y - a2.y, b2.x - a2.x);
    const deltaAng = ang1 - ang0;

    // inverted mapping: pinch out → calm; pinch in → agitated
    amplitude    = initAmp;
    freq         = constrain(initFreq / lastScaleFactor, 0.1, 8);
    patternAngle = initAng + deltaAng;

    // region A/B/C for audio mods
    const cx     = (touches[0].x + touches[1].x) / 2;
    const region = cx < width/3
      ? 'A'
      : cx < 2*width/3
      ? 'B'
      : 'C';

    // inward pinch (scale<1) → val≈1; outward (scale>1) → val≈0
    const val = constrain(map(lastScaleFactor, 1, 0.2, 0, 1), 0, 1);
    modSynth(region, val);

    // visuals modulation only in region B
    if (region === 'B') {
      noiseVisual = val;
      foldVisual  = val;
    }
  }
  return false;
}

function touchEnded() {
  // reset to default time‐warp
  lastScaleFactor = 1;
  dragging = false;
  return false;
}

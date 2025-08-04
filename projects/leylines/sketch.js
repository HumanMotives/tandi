// sketch.js

let amplitude, freq, patternAngle;
let noiseVisual = 0, foldVisual = 0;
let dragging = false;
let initTouches = [], initAmp, initFreq, initAng;
const toolbarH = 60;

// — Setup & activate “Waves” button
function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();
  amplitude    = height * 0.1;
  freq         = 2;
  patternAngle = 0;
  document.querySelector('#toolbar button[data-mode="waves"]')
    .classList.add('active');
}

function draw() {
  background(245);
  const t = millis() * 0.002;

  // Center & rotate whole grid
  push();
    translate(width/2, height/2);
    rotate(patternAngle);
    translate(-width/2, -height/2);
    drawCompositeWave(t);
  pop();
}

// Draw 12 noisy, wave-folded sine bands across full width
function drawCompositeWave(t) {
  const stripes = 12;
  // breathing line‐width LFO
  const lw = map(sin(frameCount * 0.005), -1, 1, 1, 6);

  stroke(50);
  for (let i = 0; i < stripes; i++) {
    // y-position of this band
    let y0 = map(i, 0, stripes - 1, height * 0.2, height * 0.8);

    strokeWeight(
      lw * map(amplitude, 0, height*0.5, 0.5, 1.5)
    );

    beginShape();
      for (let x = 0; x <= width; x += 5) {
        // base sine wave
        const phase = TWO_PI * freq * (x / width) + t;
        let y = amplitude * sin(phase);

        // Perlin warp
        const noiseOff = (noise(
          x * noiseVisual * 0.1 + t * 0.5,
          i * 0.2
        ) - 0.5) * amplitude * 0.5;
        y += noiseOff;

        // simple wave-fold
        if (foldVisual > 0) {
          // warp y around zero by foldVisual factor
          const foldAmt = foldVisual * 50;
          y = abs(((y + foldAmt) % (2 * foldAmt)) - foldAmt);
        }

        vertex(x, y0 + y);
      }
    endShape();
  }
}

// — Two-finger pinch & twist to unlock audio + morph visuals & sound
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
    // compute pinch scale
    const [a1, b1] = initTouches;
    const [a2, b2] = touches;
    const d0 = dist(a1.x, a1.y, b1.x, b1.y);
    const d1 = dist(a2.x, a2.y, b2.x, b2.y);
    const scaleFactor = d1 / d0;

    // compute rotation delta
    const ang0 = atan2(b1.y - a1.y, b1.x - a1.x);
    const ang1 = atan2(b2.y - a2.y, b2.x - a2.x);
    const deltaAng = ang1 - ang0;

    // core visuals
    amplitude    = constrain(initAmp  * scaleFactor, 10, height*0.5);
    freq         = constrain(initFreq * scaleFactor, 0.5, 8);
    patternAngle = initAng + deltaAng;

    // determine which third of the screen your fingers are in
    const cx = (touches[0].x + touches[1].x) / 2;
    const region = cx < width/3
      ? 'A'
      : cx < 2*width/3
      ? 'B'
      : 'C';

    // normalized control value
    const val = region === 'C'
      ? constrain(map(deltaAng, -PI, PI, 0, 1), 0, 1)
      : constrain(scaleFactor - 1, 0, 1);

    // audio modulators
    modSynth(region, val);

    // visual modulators
    if (region === 'B') {
      noiseVisual = val;
      foldVisual  = val;
    }
  }
  return false;
}

function touchEnded() {
  if (touches.length < 2) dragging = false;
  return false;
}

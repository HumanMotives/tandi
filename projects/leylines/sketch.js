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
  freq         = 2;    // cycles across width
  patternAngle = 0;

  // Highlight the “Waves” button
  document.querySelector('#toolbar button[data-mode="waves"]')
    .classList.add('active');
}

function draw() {
  background(245);

  // compute a time‐scale: outward pinch slows, inward speeds
  const timeScale = 1 / lastScaleFactor;
  const t = millis() * 0.002 * timeScale;

  push();
    // rotate only the wave-lines, not the entire canvas
    translate(width/2, height/2);
    rotate(patternAngle);
    translate(-width/2, -height/2);

    drawCompositeWave(t);
  pop();
}

// Draw 12 full-width bands, warped & folded per your gestures
function drawCompositeWave(t) {
  const stripes = 12;
  const lw = map(sin(frameCount * 0.005), -1, 1, 1, 6);

  stroke(50);
  for (let i = 0; i < stripes; i++) {
    let y0 = map(i, 0, stripes - 1, height * 0.2, height * 0.8);
    strokeWeight(
      lw * map(amplitude, 0, height * 0.5, 0.5, 1.5)
    );

    beginShape();
      for (let x = 0; x <= width; x += 5) {
        // base sine
        let phase = TWO_PI * freq * (x / width) + t;
        let y = amplitude * sin(phase);

        // Perlin warp (only when inward pinch)
        y += (noise(
          x * noiseVisual * 0.1 + t * 0.5,
          i * 0.2
        ) - 0.5) * amplitude * 0.5;

        // wave‐fold (only when inward pinch)
        if (foldVisual > 0) {
          const foldAmt = foldVisual * 50;
          y = abs(((y + foldAmt) % (2 * foldAmt)) - foldAmt);
        }

        vertex(x, y0 + y);
      }
    endShape();
  }
}

async function touchStarted() {
  await startAudio();  // unlock audio & start transport
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
    const [a1,b1] = initTouches;
    const [a2,b2] = touches;

    // pinch scaleFactor
    const d0 = dist(a1.x,a1.y, b1.x,b1.y);
    const d1 = dist(a2.x,a2.y, b2.x,b2.y);
    let scaleFactor = d1 / d0;
    lastScaleFactor = scaleFactor;

    // rotation delta
    const ang0 = atan2(b1.y - a1.y, b1.x - a1.x);
    const ang1 = atan2(b2.y - a2.y, b2.x - a2.x);
    const deltaAng = ang1 - ang0;

    // INVERTED mapping:
    // outward pinch (scale>1): slow & smooth → freq down, no noise/fold
    // inward pinch (scale<1): fast & jagged → freq up, noise/fold up
    amplitude = initAmp;  // keep vertical size constant
    freq      = constrain(initFreq / scaleFactor, 0.1, 8);
    patternAngle = initAng + deltaAng;

    // region detection (for audio mods)
    const cx = (touches[0].x + touches[1].x) / 2;
    const region = cx < width/3 ? 'A'
                  : cx < 2*width/3 ? 'B' : 'C';

    // normalized val: inward pinch → 1, outward → 0
    let val = constrain(
      map(scaleFactor, 1, 3, 1, 0),
      0, 1
    );

    // audio modulators
    modSynth(region, val);

    // visual modulators only in region B for warp/fold
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

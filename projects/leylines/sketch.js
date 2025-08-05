// sketch.js

let amplitude, freq, patternAngle;
let noiseVisual = 0, foldVisual = 0;
let lastScaleFactor = 1;
let dragging = false;
let initTouches = [], initAmp, initFreq, initAng;
const toolbarH = 60;
let playing = false;

function setup() {
  // create & parent the canvas (but container is hidden until Play)
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('sketch-container');

  noFill();                  // ensure lines only
  amplitude    = height * 0.1;
  freq         = 2;
  patternAngle = 0;

  // Bind the Play button with plain JS
  document.getElementById('play-btn').addEventListener('click', () => {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('sketch-container').classList.remove('hidden');
    playing = true;
  });
}

function draw() {
  if (!playing) return;     // do nothing until Play

  background('#A1A37A');
  const t  = millis() * 0.002;
  const lw = map(sin(frameCount * 0.005), -1, 1, 1, 2);

  push();
    translate(width/2, height/2);
    rotate(patternAngle);
    translate(-width/2, -height/2);
    drawCompositeWave(t, lw);
  pop();
}

function drawCompositeWave(t, lw) {
  stroke('#fff');
  let maxAbsY = 0;
  const stripes = 12;

  for (let i = 0; i < stripes; i++) {
    let y0 = map(i, 0, stripes - 1, height * 0.2, height * 0.8);
    strokeWeight(lw);

    beginShape();
      for (let x = 0; x <= width; x += 5) {
        let phase = TWO_PI * freq * (x/width) + t;
        let y = amplitude * sin(phase);

        // optional Perlin warp
        y += (noise(x * noiseVisual * 0.1 + t * 0.5, i * 0.2) - 0.5) * amplitude * 0.5;
        // optional fold
        if (foldVisual > 0) {
          const foldAmt = foldVisual * 50;
          y = abs(((y + foldAmt) % (2 * foldAmt)) - foldAmt);
        }

        vertex(x, y0 + y);
        maxAbsY = max(maxAbsY, abs(y));
      }
    endShape();
  }

  // spike detection (unchanged)
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
  if (!dragging || touches.length !== 2) return false;

  const [a1,b1] = initTouches, [a2,b2] = touches;
  const d0 = dist(a1.x,a1.y, b1.x,b1.y), d1 = dist(a2.x,a2.y, b2.x,b2.y);
  lastScaleFactor = constrain(d1 / d0, 0.2, 3);

  const ang0 = atan2(b1.y - a1.y, b1.x - a1.x);
  const ang1 = atan2(b2.y - a2.y, b2.x - a2.x);
  const deltaAng = ang1 - ang0;

  amplitude    = initAmp;
  freq         = constrain(initFreq / lastScaleFactor, 0.1, 8);
  patternAngle = initAng + deltaAng;

  // region-based mods
  const cx     = (touches[0].x + touches[1].x)/2;
  const region = cx < width/3 ? 'A' : cx < 2*width/3 ? 'B' : 'C';
  const val    = constrain(map(lastScaleFactor, 1, 0.2, 0, 1), 0, 1);
  modSynth(region, val);
  if (region === 'B') {
    noiseVisual = val;
    foldVisual  = val;
  }

  return false;
}

function touchEnded() {
  dragging = false;
  lastScaleFactor = 1;
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

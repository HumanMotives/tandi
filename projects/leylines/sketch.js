// sketch.js

const stripes = 12;
let rowSpacing, waveAmp;
let freqVal   = 2;
let noiseVal  = 0, foldVal = 0;
let initTouches = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();
  strokeCap(ROUND);

  // initial spacing: ~20% of screen / (stripes-1)
  const regionHeight = height * 0.2;
  rowSpacing = regionHeight / (stripes - 1);
  waveAmp    = rowSpacing * 0.5;

  stroke('#fff');
}

function draw() {
  background('#A1A37A');
  const t  = millis() * 0.002;
  const lw = map(sin(frameCount * 0.005), -1, 1, 1, 2);
  strokeWeight(lw);

  // vertical center + block of stripes
  for (let i = 0; i < stripes; i++) {
    const y0 = height/2 + (i - (stripes-1)/2) * rowSpacing;
    beginShape();
      for (let x = 0; x <= width; x += 5) {
        // base sine
        let phase = TWO_PI * freqVal * (x/width) + t;
        let y = waveAmp * sin(phase);

        // two‐finger twist warp/fold
        y += (noise(
          x * noiseVal * 0.1 + t * 0.5,
          i * 0.2
        ) - 0.5) * waveAmp;
        if (foldVal > 0) {
          let f = foldVal * rowSpacing;
          y = abs(((y + f) % (2*f)) - f);
        }

        vertex(x, y0 + y);
      }
    endShape();
  }
}

function touchStarted() {
  if (touches.length === 2) {
    initTouches = [ { ...touches[0] }, { ...touches[1] } ];
  }
  return false;
}

function touchMoved() {
  // --- vertical drag → rowSpacing  ---
  if (touches.length === 1) {
    // constrain spacing so total height stays ~15–25% of screen
    const minSp = (height * 0.15) / (stripes - 1);
    const maxSp = (height * 0.25) / (stripes - 1);
    // map Y: top of screen → max spacing; bottom → min spacing
    rowSpacing = constrain(
      map(touches[0].y, 0, height, maxSp, minSp),
      minSp, maxSp
    );
    waveAmp = rowSpacing * 0.5;

    // --- horizontal drag → freq  ---
    freqVal = constrain(
      map(touches[0].x, 0, width, 0.5, 5),
      0.5, 8
    );
  }
  // --- two‐finger twist → warp & fold  ---
  else if (touches.length === 2 && initTouches.length === 2) {
    const [a1,b1] = initTouches;
    const [a2,b2] = touches;
    const ang0 = atan2(b1.y - a1.y, b1.x - a1.x);
    const ang1 = atan2(b2.y - a2.y, b2.x - a2.x);
    const delta = abs(ang1 - ang0);
    const v = constrain(map(delta, 0, PI, 0, 1), 0, 1);
    noiseVal = v;
    foldVal  = v;
  }
  return false; // prevent page scroll
}

function touchEnded() {
  // optionally reset warp/fold:
  // noiseVal = foldVal = 0;
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // recalc initial spacing if you want:
  const regionHeight = height * 0.2;
  rowSpacing = regionHeight / (stripes - 1);
  waveAmp    = rowSpacing * 0.5;
}


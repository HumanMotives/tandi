// sketch.js

const stripes = 12;
let rowSpacing, waveAmp;
let freqVal = 2;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();
  stroke('#fff');
  strokeCap(ROUND);

  // initial row spacing: ~6% of height
  rowSpacing = height * 0.06;
  waveAmp    = rowSpacing * 0.5;
}

function draw() {
  background('#A1A37A');
  const t  = millis() * 0.002;

  // draw each stripe with segment-by-segment variable strokeWeight
  for (let i = 0; i < stripes; i++) {
    const centerY = height/2;
    const half    = (stripes - 1) / 2;
    const offset  = i - half;
    const y0      = centerY + offset * rowSpacing;

    // precompute all points
    let pts = [];
    for (let x = 0; x <= width; x += 5) {
      const phase = TWO_PI * freqVal * (x / width) + t;
      const y     = waveAmp * sin(phase);
      pts.push({ x, y: y0 + y });
    }

    // draw each segment with its own strokeWeight
    for (let j = 0; j < pts.length - 1; j++) {
      const p0 = pts[j], p1 = pts[j+1];
      const norm = j / (pts.length - 1);
      // thickness: 1px at ends, up to 4px in middle
      const sw = lerp(1, 4, sin(norm * PI));
      strokeWeight(sw);
      line(p0.x, p0.y, p1.x, p1.y);
    }
  }
}

function touchMoved() {
  if (touches.length === 1) {
    // vertical drag → rowSpacing (2%–15% of height per stripe)
    const minSp = (height * 0.02);
    const maxSp = (height * 0.15);
    rowSpacing = constrain(
      map(touches[0].y, 0, height, maxSp, minSp),
      minSp, maxSp
    );
    waveAmp = rowSpacing * 0.5;

    // horizontal drag → frequency (0.5–5 cycles)
    freqVal = constrain(
      map(touches[0].x, 0, width, 0.5, 5),
      0.5, 8
    );
  }
  return false; // prevent page scroll
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // recalc defaults
  rowSpacing = height * 0.06;
  waveAmp    = rowSpacing * 0.5;
}

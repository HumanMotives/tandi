// sketch.js

const stripes = 12;
let rowSpacing, waveAmp;
let freqVal   = 2;
let noiseVal  = 0, foldVal = 0;
let bulgeVal  = 0;
let initTouches = [];
let stones      = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();
  strokeCap(ROUND);

  // initial vertical band = 20% of screen height
  const regionH = height * 0.2;
  rowSpacing = regionH / (stripes - 1);
  waveAmp    = rowSpacing * 0.5;

  stroke('#fff');
}

function draw() {
  // — Dynamic pastel background in HSL —
  colorMode(HSL, 360, 100, 100);
  const baseHue = 100; // olive green
  // hue ±30° by bulge, ±20° by noise
  let hue = baseHue + (bulgeVal - 0.5) * 30 + (noiseVal - 0.5) * 20;
  // saturation 10–40%
  let sat = 10 + noiseVal * 30;
  // lightness 85→75%
  let lit = 85 - bulgeVal * 10;
  background(hue, sat, lit);
  colorMode(RGB);

  const t = millis() * 0.001;

  // draw 12 wave-stripes
  for (let i = 0; i < stripes; i++) {
    const centerY = height / 2;
    const half    = (stripes - 1) / 2;
    const y0      = centerY + (i - half) * rowSpacing;
    const bendF   = map(abs(i - half), 0, half, 1, 2);

    // build the stripe's vertices
    let pts = [];
    for (let x = 0; x <= width; x += 5) {
      let phase = TWO_PI * freqVal * (x / width) + t;
      let y     = waveAmp * sin(phase);

      // Perlin warp & wave-fold
      y += (noise(x * noiseVal * 0.1 + t * 0.5, i * 0.2) - 0.5) * waveAmp;
      if (foldVal > 0) {
        const f = foldVal * rowSpacing;
        y = abs(((y + f) % (2 * f)) - f);
      }

      // stone repulsion
      let yy = y0 + y;
      for (let st of stones) {
        let dx = x - st.x, dy = yy - st.y;
        let d  = sqrt(dx * dx + dy * dy);
        if (d < st.r) {
          let push = (st.r - d) / st.r;
          let sign = dy / (d || 1);
          y += sign * push * st.strength * bendF;
          yy = y0 + y;
        }
      }

      pts.push({ x, y: yy });
    }

    // render it with a breathing stroke-weight
    const lw = map(sin(frameCount * 0.005), -1, 1, 1, 2);
    strokeWeight(lw);
    beginShape();
      for (let p of pts) vertex(p.x, p.y);
    endShape();
  }
}

function touchStarted() {
  initTouches = touches.map(t => ({ ...t }));
  return false;
}

function touchMoved() {
  if (touches.length === 1) {
    const { x, y } = touches[0];
    // vertical → bulge + band spacing
    bulgeVal = constrain(map(y, height, 0, 0, 1), 0, 1);
    const minSp = (height * 0.15) / (stripes - 1);
    const maxSp = (height * 0.25) / (stripes - 1);
    rowSpacing = constrain(map(y, 0, height, maxSp, minSp), minSp, maxSp);
    waveAmp    = rowSpacing * 0.5;
    // horizontal → frequency
    freqVal    = constrain(map(x, 0, width, 0.5, 5), 0.5, 8);
  }
  else if (touches.length === 2 && initTouches.length === 2) {
    // two-finger twist → noiseVal & foldVal
    const [a1, b1] = initTouches;
    const [a2, b2] = touches;
    const ang0 = atan2(b1.y - a1.y, b1.x - a1.x);
    const ang1 = atan2(b2.y - a2.y, b2.x - a2.x);
    const v    = constrain(map(abs(ang1 - ang0), 0, PI, 0, 1), 0, 1);
    noiseVal = foldVal = v;
  }
  return false;
}

function touchEnded() {
  if (touches.length === 0 && initTouches.length === 1) {
    const t0 = initTouches[0];
    stones.push({
      x: t0.x,
      y: t0.y,
      r: width * 0.15,
      strength: 40
    });
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

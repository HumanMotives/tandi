// sketch.js

const stripes     = 12;
const bulgeRange  = 3;      // max extra px at stroke peak
let rowSpacing, waveAmp;
let freqVal   = 2;
let noiseVal  = 0, foldVal = 0;
let initTouches = [];
let stones      = [];
let bulgeVal    = 0;        // 0→1 from vertical drag

function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();
  strokeCap(ROUND);

  // initial band height ≈20% screen
  const regionH = height * 0.2;
  rowSpacing = regionH / (stripes - 1);
  waveAmp    = rowSpacing * 0.5;

  stroke('#fff');
}

function draw() {
  background('#A1A37A');
  const t  = millis() * 0.002;

  // draw each stripe with its pen-stroke segments
  for (let i = 0; i < stripes; i++) {
    // central Y + offset
    const centerY = height/2;
    const half    = (stripes - 1) / 2;
    const y0      = centerY + (i - half) * rowSpacing;
    // bend factor for stones
    const bendF   = map(abs(i - half), 0, half, 1, 2);

    // precompute stripe points
    let pts = [];
    for (let x = 0; x <= width; x += 5) {
      // base sine
      let phase = TWO_PI * freqVal * (x/width) + t;
      let y     = waveAmp * sin(phase);

      // warp & fold
      y += (noise(x * noiseVal * 0.1 + t*0.5, i*0.2) - 0.5) * waveAmp;
      if (foldVal > 0) {
        const f = foldVal * rowSpacing;
        y = abs(((y + f) % (2*f)) - f);
      }

      // stone repulsion
      let yy = y0 + y;
      for (let st of stones) {
        let dx = x - st.x, dy = yy - st.y;
        let d  = sqrt(dx*dx + dy*dy);
        if (d < st.r) {
          let push = (st.r - d) / st.r;
          let sign = dy / (d || 1);
          y += sign * push * st.strength * bendF;
          yy = y0 + y;
        }
      }

      pts.push({ x, y: yy });
    }

    // draw segments with variable strokeWeight
    for (let j = 0; j < pts.length - 1; j++) {
      const p0 = pts[j], p1 = pts[j+1];
      const norm  = j / (pts.length - 1);
      // breathing base weight 1→2px
      const baseLw = map(sin(frameCount * 0.005), -1, 1, 1, 2);
      // peak = base + bulgeVal * bulgeRange
      const peakLw = baseLw + bulgeVal * bulgeRange;
      // thickness hump
      const sw = lerp(baseLw, peakLw, sin(norm * PI));
      strokeWeight(sw);
      line(p0.x, p0.y, p1.x, p1.y);
    }
  }
}

function touchStarted() {
  if (touches.length === 2) {
    initTouches = [ {...touches[0]}, {...touches[1]} ];
  } else if (touches.length === 1) {
    initTouches = [ {...touches[0]} ];
  }
  return false;
}

function touchMoved() {
  // one-finger: vertical → bulgeVal & also rowSpacing, horizontal → freq
  if (touches.length === 1) {
    const y = touches[0].y;
    // bulge: bottom→0, top→1
    bulgeVal = constrain(map(y, height, 0, 0, 1), 0, 1);

    // rowSpacing between 15–25% of screen
    const minSp = (height * 0.15) / (stripes - 1);
    const maxSp = (height * 0.25) / (stripes - 1);
    rowSpacing  = constrain(
      map(y, 0, height, maxSp, minSp),
      minSp, maxSp
    );
    waveAmp     = rowSpacing * 0.5;

    // horizontal → frequency
    freqVal = constrain(
      map(touches[0].x, 0, width, 0.5, 5),
      0.5, 8
    );
  }
  // two-finger twist → warp & fold
  else if (touches.length === 2 && initTouches.length === 2) {
    const [a1,b1] = initTouches, [a2,b2] = touches;
    const ang0 = atan2(b1.y - a1.y, b1.x - a1.x);
    const ang1 = atan2(b2.y - a2.y, b2.x - a2.x);
    const delta = abs(ang1 - ang0);
    const v = constrain(map(delta, 0, PI, 0, 1), 0, 1);
    noiseVal = v;
    foldVal  = v;
  }
  return false; // prevent scroll
}

function touchEnded() {
  // tap = drop stone
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

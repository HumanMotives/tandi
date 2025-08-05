// sketch.js

const stripes = 12;
let rowSpacing, waveAmp;
let freqVal   = 2;
let noiseVal  = 0, foldVal = 0;
let initTouches = [];

// obstacle stones
let stones = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();
  strokeCap(ROUND);

  // initial row spacing ≈ 20% of screen / (#stripes-1)
  const regionH = height * 0.2;
  rowSpacing = regionH / (stripes - 1);
  waveAmp    = rowSpacing * 0.5;

  stroke('#fff');
}

function draw() {
  background('#A1A37A');
  const t  = millis() * 0.002;
  const lw = map(sin(frameCount * 0.005), -1, 1, 1, 2);
  strokeWeight(lw);

  // draw each stripe
  for (let i = 0; i < stripes; i++) {
    // center‐out offsets
    const centerY = height/2;
    const half    = (stripes - 1) / 2;
    const offset  = i - half;
    const y0      = centerY + offset * rowSpacing;

    // per‐stripe magnifier: outer lines bend more
    const bendFactor = map(abs(offset), 0, half, 1, 2);

    beginShape();
      for (let x = 0; x <= width; x += 5) {
        // base sine
        let phase = TWO_PI * freqVal * (x/width) + t;
        let y     = waveAmp * sin(phase);

        // two-finger twist warp/fold
        y += (noise(
          x * noiseVal * 0.1 + t * 0.5,
          i * 0.2
        ) - 0.5) * waveAmp;
        if (foldVal > 0) {
          const f = foldVal * rowSpacing;
          y = abs(((y + f) % (2 * f)) - f);
        }

        // obstacle repulsion
        for (let st of stones) {
          const dx = x - st.x;
          const dy = (y0 + y) - st.y;
          const d  = sqrt(dx*dx + dy*dy);
          if (d < st.r) {
            // normalized push amount 0→1
            const push = (st.r - d) / st.r;
            // direction: push perpendicular to flow (toward sign of dy)
            const sign = dy/d;
            y += sign * push * st.strength * bendFactor;
          }
        }

        vertex(x, y0 + y);
      }
    endShape();
  }
}

function touchStarted() {
  // one‐finger drag for spacing/freq:
  if (touches.length === 1) {
    initTouches = [ { ...touches[0] } ];
  }
  // two‐finger for twist:
  else if (touches.length === 2) {
    initTouches = [ { ...touches[0] }, { ...touches[1] } ];
  }
  return false;
}

function touchMoved() {
  if (touches.length === 1) {
    // vertical → rowSpacing (15–25% total height)
    const minSp = (height * 0.15) / (stripes - 1);
    const maxSp = (height * 0.25) / (stripes - 1);
    rowSpacing = constrain(
      map(touches[0].y, 0, height, maxSp, minSp),
      minSp, maxSp
    );
    waveAmp = rowSpacing * 0.5;

    // horizontal → freq
    freqVal = constrain(
      map(touches[0].x, 0, width, 0.5, 5),
      0.5, 8
    );
  }
  else if (touches.length === 2 && initTouches.length === 2) {
    // two‐finger twist → noise & fold
    const [a1,b1] = initTouches;
    const [a2,b2] = touches;
    const ang0 = atan2(b1.y - a1.y, b1.x - a1.x);
    const ang1 = atan2(b2.y - a2.y, b2.x - a2.x);
    const delta = abs(ang1 - ang0);
    const v = constrain(map(delta, 0, PI, 0, 1), 0, 1);
    noiseVal = v;
    foldVal  = v;
  }
  return false;
}

function touchEnded() {
  // single tap (no movement) = drop a stone
  if (touches.length === 0 && initTouches.length === 1) {
    const t0 = initTouches[0];
    stones.push({
      x: t0.x,
      y: t0.y,
      r: width * 0.15,    // effect radius ~15% of width
      strength: 40       // tune for how much bend
    });
  }
  initTouches = [];
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // recalc defaults if you like
  const regionH = height * 0.2;
  rowSpacing = regionH / (stripes - 1);
  waveAmp    = rowSpacing * 0.5;
}

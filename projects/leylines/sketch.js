// sketch.js

const stripes = 12;
let ampVal, freqVal, noiseVal = 0, foldVal = 0;
let initTouches = [];

// framing parameters
let marginX, topY, boxW, boxH;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();
  strokeCap(ROUND);

  // initial wave parameters
  ampVal  = height * 0.1;
  freqVal = 2;

  // compute frame rectangle: 5% left/right, 15–75% vert
  marginX = width * 0.05;
  topY    = height * 0.15;
  boxW    = width  - marginX * 2;
  boxH    = height * 0.6;
}

function draw() {
  // white outer background
  background(255);

  // draw the olive‐pastel framed area
  noStroke();
  fill('#A1A37A');
  rect(marginX, topY, boxW, boxH);

  // time & breathing
  const t  = millis() * 0.002;
  const lw = map(sin(frameCount * 0.005), -1, 1, 1, 2);

  // draw only within the box
  stroke('#fff');
  strokeWeight(lw);
  noFill();

  for (let i = 0; i < stripes; i++) {
    // y0 runs down the box
    let y0 = topY + map(i, 0, stripes - 1, 0, boxH);

    beginShape();
    for (let x = marginX; x <= marginX + boxW; x += 5) {
      // base sine
      let phase = TWO_PI * freqVal * ((x - marginX) / boxW) + t;
      let y = ampVal * sin(phase);

      // two‐finger twist warping
      y += (noise(
        (x - marginX) * noiseVal * 0.1 + t * 0.5,
        i * 0.2
      ) - 0.5) * ampVal * 0.5;

      // wave‐fold
      if (foldVal > 0) {
        const f = foldVal * 50;
        y = abs(((y + f) % (2 * f)) - f);
      }

      vertex(x, y0 + y);
    }
    endShape();
  }
}

function touchStarted() {
  if (touches.length === 2) {
    initTouches = [{ ...touches[0] }, { ...touches[1] }];
  }
  return false;
}

function touchMoved() {
  if (touches.length === 1) {
    // one‐finger: vertical → row spacing (via ampVal)
    // but now repurpose: tighter rows = smaller ampVal if you want, or adjust boxH
    // here we’ll adjust boxH (spacing)
    boxH = constrain(
      map(touches[0].y, 0, height, height * 0.8, height * 0.3),
      height * 0.2,
      height * 0.8
    );
    // one‐finger: horizontal → freq
    freqVal = constrain(map(touches[0].x, 0, width, 0.5, 5), 0.5, 8);
  }
  else if (touches.length === 2 && initTouches.length === 2) {
    // two‐finger twist → noiseVal & foldVal
    const [a1, b1] = initTouches;
    const [a2, b2] = touches;
    const ang0 = atan2(b1.y - a1.y, b1.x - a1.x);
    const ang1 = atan2(b2.y - a2.y, b2.x - a2.x);
    const deltaAng = abs(ang1 - ang0);
    const v = constrain(map(deltaAng, 0, PI, 0, 1), 0, 1);
    noiseVal = v;
    foldVal  = v;
  }
  return false;
}

function touchEnded() {
  // optionally reset deformation
  // noiseVal = foldVal = 0;
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // recalc frame
  marginX = width * 0.05;
  topY    = height * 0.15;
  boxW    = width  - marginX * 2;
  boxH    = height * 0.6;
}

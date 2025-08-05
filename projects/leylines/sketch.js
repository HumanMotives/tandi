// sketch.js

const stripes = 12;
let initialSpacing, spacingFactor;
let amplitude = 0;  // wave height
let freq      = 0;  // horizontal cycles
let noiseVisual = 0, foldVisual = 0;
let initTouches = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();
  // initial wave parameters
  amplitude      = height * 0.1;
  freq           = 2;
  initialSpacing = (height * 0.6) / (stripes - 1);
  spacingFactor  = initialSpacing;
}

function draw() {
  background('#A1A37A');

  // timebase
  const t = millis() * 0.002;
  // breathing line width 1→2 px
  const lw = map(sin(frameCount * 0.005), -1, 1, 1, 2);

  stroke('#fff');
  strokeWeight(lw);

  // draw stripes with dynamic spacing & deformation
  for (let i = 0; i < stripes; i++) {
    const y0 = height/2 + (i - (stripes-1)/2) * spacingFactor;
    beginShape();
      for (let x = 0; x <= width; x += 5) {
        let phase = TWO_PI * freq * (x/width) + t;
        let y = amplitude * sin(phase);

        // Perlin warp (driven by two-finger twist)
        y += (noise(
          x * noiseVisual * 0.1 + t * 0.5,
          i * 0.2
        ) - 0.5) * amplitude * 0.5;

        // wave-fold
        if (foldVisual > 0) {
          const f = foldVisual * 50;
          y = abs(((y + f) % (2*f)) - f);
        }

        vertex(x, y0 + y);
      }
    endShape();
  }
}

function touchStarted() {
  if (touches.length === 2) {
    // remember initial positions for twist
    initTouches = [ { ...touches[0] }, { ...touches[1] } ];
  }
  return false;
}

function touchMoved() {
  // 1-finger drag: spacing & freq
  if (touches.length === 1) {
    const x = touches[0].x, y = touches[0].y;
    // vertical → spacing (closer together ↑, farther apart ↓)
    spacingFactor = constrain(
      map(y, 0, height, initialSpacing*0.3, initialSpacing*2),
      initialSpacing*0.3,
      initialSpacing*2
    );
    // horizontal → freq
    freq = constrain(map(x, 0, width, 0.5, 5), 0.5, 8);
  }
  // 2-finger twist: deformation only
  else if (touches.length === 2 && initTouches.length===2) {
    const [a1,b1] = initTouches;
    const [a2,b2] = touches;
    const ang0 = atan2(b1.y - a1.y, b1.x - a1.x);
    const ang1 = atan2(b2.y - a2.y, b2.x - a2.x);
    const deltaAng = ang1 - ang0;
    // val 0→1 as you twist ±180°
    const val = constrain(map(abs(deltaAng), 0, PI, 0, 1), 0, 1);
    noiseVisual = val;
    foldVisual  = val;
  }
  return false; // prevent page scroll
}

function touchEnded() {
  // optional: reset deformation when you lift fingers
  // noiseVisual = foldVisual = 0;
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

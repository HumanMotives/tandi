// sketch.js

let amplitude, freq;
let dragging = false;
let initTouches = [];
let initAmp, initFreq, initAngle;
let patternAngle = 0;
const toolbarH = 60;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();
  // Initialize wave params
  amplitude = height * 0.1;
  freq      = 2;        // cycles across width
  // auto-start one wave so you see it immediately
  waves = true;
}

function draw() {
  background(245);
  push();
    translate(width/2, height/2);
    rotate(patternAngle);
    translate(-width/2, -height/2);
    drawTilingWave();
  pop();
}

// Draw stripes of sine waves
function drawTilingWave() {
  stroke(50);
  strokeWeight(2);
  const stripes = 12;
  const spacing = height / stripes;
  const t = millis() * 0.002;
  for (let i = 0; i < stripes; i++) {
    let y0 = spacing * (i + 0.5);
    beginShape();
    for (let x = 0; x <= width; x += 5) {
      let phase = TWO_PI * freq * (x/width) + t;
      let y = amplitude * sin(phase);
      vertex(x, y0 + y);
    }
    endShape();
  }
}

async function touchStarted() {
  await startAudio();    // unlock audio & start loop
  if (touches.length === 2) {
    // pinching/rotating begins
    initTouches = [ {...touches[0]}, {...touches[1]} ];
    initAmp     = amplitude;
    initFreq    = freq;
    initAngle   = patternAngle;
    dragging    = true;
  }
  return false;
}

function touchMoved() {
  if (dragging && touches.length === 2) {
    // pinch → amplitude & freq
    const [a1,b1] = initTouches;
    const [a2,b2] = touches;
    const d0 = dist(a1.x, a1.y, b1.x, b1.y);
    const d1 = dist(a2.x, a2.y, b2.x, b2.y);
    const scaleFactor = d1 / d0;
    amplitude = constrain(initAmp * scaleFactor, 10, height*0.5);
    freq      = constrain(initFreq * scaleFactor, 0.5, 8);

    // rotate → patternAngle
    const angle0 = atan2(b1.y - a1.y, b1.x - a1.x);
    const angle1 = atan2(b2.y - a2.y, b2.x - a2.x);
    patternAngle = initAngle + (angle1 - angle0);

    // modulate filter & reverb
    modSynth('filter', scaleFactor - 1);
    modSynth('reverb', map(amplitude, 0, height*0.5, 0, 1));
  }
  return false;
}

function touchEnded() {
  if (touches.length < 2) dragging = false;
  return false;
}

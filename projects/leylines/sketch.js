// sketch.js

let amplitude, freq, patternAngle;
let dragging = false;
let initTouches = [], initAmp, initFreq, initAng;
const toolbarH = 60;

// 1) Boilerplate p5 + UI highlight
function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();
  amplitude    = height * 0.1;
  freq         = 2;
  patternAngle = 0;

  // Activate the “Waves” button
  document.querySelector('#toolbar button[data-mode="waves"]')
    .classList.add('active');
}

function draw() {
  background(245);

  // center & rotate the whole grid
  push();
    translate(width/2, height/2);
    rotate(patternAngle);
    translate(-width/2, -height/2);

    drawTilingGrid();
  pop();
}

// 2) Draw a 4×6 grid of wavy bands, with a “breathing” strokeWeight
function drawTilingGrid() {
  const cols = 4, rows = 6;
  const cellW = width  / cols;
  const cellH = height / rows;
  const t = millis() * 0.002;
  // global LFO for line‐width
  const lw = map(sin(frameCount * 0.005), -1, 1, 1, 6);

  stroke(50);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let y0 = j * cellH + cellH/2;
      strokeWeight(
        lw * map(amplitude, 0, height*0.5, 0.5, 1.5)
      );
      beginShape();
        for (let x = 0; x <= cellW; x += 5) {
          // global X position
          let gx = i * cellW + x;
          let phase = TWO_PI * freq * (gx / width) + t;
          let y = amplitude * sin(phase);
          vertex(x, y0 + y);
        }
      endShape();
    }
  }
}

// 3) Two‐finger gestures unlock audio + morph parameters by region
async function touchStarted() {
  await startAudio();  
  if (touches.length === 2) {
    // record initial state
    initTouches = [ {...touches[0]}, {...touches[1]} ];
    initAmp     = amplitude;
    initFreq    = freq;
    initAng     = patternAngle;
    dragging    = true;
  }
  return false;
}

function touchMoved() {
  if (dragging && touches.length === 2) {
    // compute pinch scale
    const [a1,b1] = initTouches;
    const [a2,b2] = touches;
    const d0 = dist(a1.x, a1.y, b1.x, b1.y);
    const d1 = dist(a2.x, a2.y, b2.x, b2.y);
    const scaleFactor = d1 / d0;

    // compute rotation delta
    const ang0 = atan2(b1.y - a1.y, b1.x - a1.x);
    const ang1 = atan2(b2.y - a2.y, b2.x - a2.x);
    const deltaAng = ang1 - ang0;

    // update core visuals
    amplitude    = constrain(initAmp  * scaleFactor, 10, height*0.5);
    freq         = constrain(initFreq * scaleFactor, 0.5, 8);
    patternAngle = initAng + deltaAng;

    // find centroid region A/B/C
    const cx = (touches[0].x + touches[1].x) / 2;
    const region = cx < width/3
                 ? 'A'
                 : cx < 2*width/3
                 ? 'B'
                 : 'C';

    // pick a normalized value per region:
    let val = region === 'C'
            ? map(deltaAng, -PI, PI, 0, 1)
            : constrain(scaleFactor - 1, 0, 1);

    // drive your synth modulators
    modSynth(region, val);
  }
  return false;
}

function touchEnded() {
  if (touches.length < 2) dragging = false;
  return false;
}


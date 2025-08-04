// sketch.js

let waves = [];
let dragging = null;
const toolbarH = 60;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();

  // Highlight the active “Waves” button (only one left)
  document.querySelector('#toolbar button[data-mode="waves"]')
    .classList.add('active');
}

function draw() {
  background(245);
  if (waves.length > 0) drawCompositeWave();
}

async function touchStarted() {
  await startAudio();             // unlock on first tap
  if (mouseY < toolbarH) return false; // ignore toolbar taps

  // create a new wave component
  let s = {
    x: mouseX,
    y: mouseY,
    t0: millis(),
    // default large amplitude & 1 cycle across screen
    params: {
      amplitude: height * 0.3,
      freq:      1,
      interval: '2n',
      noise:     0
    }
  };
  waves.push(s);
  dragging = s;

  // immediate & looping drone
  playWaveNote(s);
  scheduleWaveLoop(s);

  return false;
}

function touchMoved() {
  if (dragging) {
    // vertical drag → amplitude
    dragging.params.amplitude =
      constrain(map(mouseY, height * 0.1, height * 0.9, height*0.05, height*0.4), 0, height*0.5);
    // horizontal drag → frequency (1 → 5 cycles)
    dragging.params.freq =
      constrain(map(mouseX, 0, width, 1, 5), 0.5, 8);

    // modulate filter & reverb
    modSynth('filter', map(mouseX, 0, width, 0, 1));
    modSynth('reverb', map(mouseY, 0, height, 0, 1));
  }
  return false;
}

function touchEnded() {
  dragging = null;
}

// Draw the **sum** of every wave component as one polyline
function drawCompositeWave() {
  stroke(50);
  strokeWeight(2);
  beginShape();
    // sample every 5px
    for (let x = 0; x <= width; x += 5) {
      let y = 0;
      const t = (millis() - waves[0].t0) * 0.002;
      for (let w of waves) {
        let phase = TWO_PI * (x/width * w.params.freq) + t;
        y += w.params.amplitude * sin(phase);
      }
      vertex(x, height/2 + y);
    }
  endShape();
}

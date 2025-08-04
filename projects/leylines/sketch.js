// sketch.js

let shapes = [];
let currentMode = 'rings';
let draggingShape = null;
const toolbarHeight = 60; // px – must match your CSS

function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();
  // wire up toolbar buttons
  document.querySelectorAll('#toolbar button').forEach(btn => {
    btn.onclick = () => currentMode = btn.dataset.mode;
  });
}

function draw() {
  background(245);
  for (let s of shapes) {
    const pulse = map(
      sin((millis() - s.t0) / 500),
      -1, 1, 0.7, 1.3
    );
    push();
      translate(s.x, s.y);
      if (s.mode === 'rings')     drawRings(s, pulse);
      else if (s.mode === 'waves') drawWaves(s, pulse);
      else if (s.mode === 'branch')drawBranch(s, pulse);
    pop();
  }
}

async function touchStarted() {
  // 1) unlock audio + transport on first tap
  await startAudio();

  // 2) ignore toolbar taps
  if (mouseY < toolbarHeight) return false;

  // 3) seed a new shape
  const s = {
    mode: currentMode,
    x: mouseX, y: mouseY,
    params: { size: 50, chaos: 0.2 },
    t0: millis()
  };
  shapes.push(s);
  draggingShape = s;

  // 4) immediate note + start its loop
  playModeNote(s.mode, s.x, s.y);
  scheduleShapeLoop(s);

  return false; // prevent default
}

function touchMoved() {
  if (draggingShape) {
    draggingShape.params.size  = dist(
      mouseX, mouseY,
      draggingShape.x, draggingShape.y
    );
    draggingShape.params.chaos = map(mouseX, 0, width, 0, 1);
    modSynth('chaos', draggingShape.params.chaos);
  }
  return false;
}

function touchEnded() {
  draggingShape = null;
}

// optional clear
function keyPressed() {
  if (key === 'C') {
    // stop all loops
    shapes.forEach(s => s.loop && s.loop.stop());
    shapes = [];
  }
}

// ——— your existing drawing helpers ———
function drawRings(s, p) {
  strokeWeight(2 * p);
  for (let i = 0; i < 10; i++) {
    stroke(i % 2 ? '#F8BBD0' : '#C8E6C9');
    ellipse(
      0, 0,
      s.params.size * i + noise(i, s.params.chaos) * 20
    );
  }
}

function drawWaves(s, p) {
  strokeWeight(1.5 * p);
  beginShape();
  for (let x = -s.params.size; x <= s.params.size; x += 5) {
    let y = sin(
      x / 20 + (millis() - s.t0) / 300
    ) * s.params.chaos * 30;
    vertex(x, y);
  }
  endShape();
}

function drawBranch(s, p) {
  strokeWeight(2 * p);
  branch(s.params.size, 0, s.params.chaos);
}

function branch(len, depth, chaos) {
  if (len < 10) return;
  line(0, 0, 0, -len);
  translate(0, -len);
  for (let i = 0; i < 2; i++) {
    push();
      rotate(random(-PI/4, PI/4) * chaos);
      branch(len * 0.7, depth + 1, chaos);
    pop();
  }
}

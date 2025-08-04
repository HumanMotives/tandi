let shapes = [];
let currentMode = 'rings';
let draggingShape = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();
  // toolbar buttons
  document.querySelectorAll('#toolbar button').forEach(btn => {
    btn.onclick = () => currentMode = btn.dataset.mode;
  });
}

function draw() {
  background(245);
  for (let s of shapes) {
    const pulse = map(sin((millis() - s.t0)/500), -1, 1, 0.7, 1.3);
    push();
    translate(s.x, s.y);
    if (s.mode === 'rings')    drawRings(s, pulse);
    else if (s.mode === 'waves')drawWaves(s, pulse);
    else if (s.mode === 'branch')drawBranch(s, pulse);
    pop();
  }
}

function touchStarted() {
  // new shape
  const s = {
    mode: currentMode,
    x: mouseX, y: mouseY,
    params: { size: 50, chaos: 0.2 },
    t0: millis()
  };
  shapes.push(s);
  draggingShape = s;
  playNoteFromPos(s.x, s.y);
}

function touchMoved() {
  if (draggingShape) {
    // map drag delta → size & chaos
    draggingShape.params.size  = dist(mouseX, mouseY, draggingShape.x, draggingShape.y);
    draggingShape.params.chaos = map(mouseX, 0, width, 0, 1);
    modSynth('chaos', draggingShape.params.chaos);
  }
  return false; // prevent page scroll
}

function touchEnded() {
  draggingShape = null;
}

// --- Drawing functions (very minimal) ---
function drawRings(s, p) {
  strokeWeight(2 * p);
  for (let i=0; i<10; i++) {
    stroke(i%2 ? '#F8BBD0':'#C8E6C9');
    ellipse(0,0, s.params.size*i + noise(i, s.params.chaos)*20);
  }
}

function drawWaves(s, p) {
  strokeWeight(1.5 * p);
  beginShape();
  for (let x = -s.params.size; x <= s.params.size; x += 5) {
    let y = sin((x/20) + (millis()-s.t0)/300) * s.params.chaos * 30;
    vertex(x, y);
  }
  endShape();
}

function drawBranch(s, p) {
  strokeWeight(2 * p);
  branch( s.params.size, 0, s.params.chaos );
}

function branch(len, depth, chaos) {
  if (len<10) return;
  line(0,0,0,-len);
  translate(0,-len);
  let n = 2;
  for (let i=0; i<n; i++){
    push();
    rotate( random(-PI/4, PI/4) * chaos );
    branch(len*0.7, depth+1, chaos);
    pop();
  }
}

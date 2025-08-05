// sketch.js

let state = 'start';
let ampVal, freqVal, angleVal;
let lastTouch = null;

function setup() {
  // attach canvas to our container
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('sketch-container');

  // initial wave parameters
  ampVal  = height * 0.1;
  freqVal = 2;
  angleVal= 0;

  // “Play” button handler
  select('#play-btn').mousePressed(() => {
    select('#start-screen').addClass('hidden');
    select('#sketch-container').removeClass('hidden');
    state = 'play';
  });
}

function draw() {
  if (state !== 'play') return;

  background('#A1A37A');

  // subtle breathing on line-weight
  let lw = map(sin(frameCount * 0.005), -1, 1, 1, 4);

  // time base for waves
  let t = millis() * 0.002;

  push();
    translate(width/2, height/2);
    rotate(angleVal);
    translate(-width/2, -height/2);

    stroke('#fff');
    for (let i = 0; i < 12; i++) {
      let y0 = map(i, 0, 11, height*0.2, height*0.8);
      strokeWeight(lw);
      beginShape();
        for (let x = 0; x <= width; x += 5) {
          let phase = TWO_PI * freqVal * (x/width) + t;
          let y = ampVal * sin(phase);
          vertex(x, y0 + y);
        }
      endShape();
    }
  pop();
}

function touchesChanged() {
  // record on any touch change
  lastTouch = touches.slice();
}

function touchMoved() {
  if (state !== 'play' || touches.length === 0) return false;

  // use single-finger vertical drag to adjust amplitude
  let y = touches[0].y;
  ampVal = constrain(map(y, 0, height, height*0.3, height*0.05), 10, height*0.5);

  // single-finger horizontal drag to adjust frequency
  let x = touches[0].x;
  freqVal = constrain(map(x, 0, width, 0.5, 5), 0.5, 8);

  // two-finger rotate to adjust angleVal
  if (touches.length === 2 && lastTouch && lastTouch.length === 2) {
    const [a1,b1] = lastTouch;
    const [a2,b2] = touches;
    const ang0 = atan2(b1.y - a1.y, b1.x - a1.x);
    const ang1 = atan2(b2.y - a2.y, b2.x - a2.x);
    angleVal += (ang1 - ang0);
  }

  lastTouch = touches.slice();
  return false; // prevent scroll
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

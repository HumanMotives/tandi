// sketch.js

let amplitude, freq, angleVal;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();                      // ensure only strokes, no fills
  amplitude = height * 0.1;      // default vertical displacement
  freq      = 2;                 // default horizontal cycles
  angleVal  = 0;                 // no rotation initially
}

function draw() {
  // pastel olive background
  background('#A1A37A');

  // global time base
  const t = millis() * 0.002;

  // “breathing” line thickness: 1–2px
  const lw = map(sin(frameCount * 0.005), -1, 1, 1, 2);

  push();
    // rotate just the lines when angleVal changes
    translate(width/2, height/2);
    rotate(angleVal);
    translate(-width/2, -height/2);

    stroke('#ffffff');
    strokeWeight(lw);

    const stripes = 12;
    for (let i = 0; i < stripes; i++) {
      // evenly space the 12 wave bands between 20%–80% of height
      const y0 = map(i, 0, stripes - 1, height * 0.2, height * 0.8);
      beginShape();
        for (let x = 0; x <= width; x += 5) {
          // base sine wave
          const phase = TWO_PI * freq * (x / width) + t;
          const y = amplitude * sin(phase);
          vertex(x, y0 + y);
        }
      endShape();
    }
  pop();
}

function touchMoved() {
  // single-finger up/down = amplitude
  if (touches.length === 1) {
    amplitude = constrain(
      map(touches[0].y, 0, height, height * 0.3, height * 0.05),
      10,
      height * 0.5
    );
    // single-finger left/right = frequency
    freq = constrain(
      map(touches[0].x, 0, width, 0.5, 5),
      0.5,
      8
    );
  }
  // two-finger twist = rotation
  else if (touches.length === 2) {
    const [a, b] = touches;
    angleVal = atan2(b.y - a.y, b.x - a.x);
  }
  return false; // prevent scrolling
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

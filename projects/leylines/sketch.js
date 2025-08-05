// sketch.js

const stripes = 12;
let rowSpacing, waveAmp;
let freqVal   = 2;
let noiseVal  = 0, foldVal = 0;
let bulgeVal  = 0;
let initTouches = [];
let stones      = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();
  strokeCap(ROUND);

  // initial band height ≈20% screen
  const regionH = height * 0.2;
  rowSpacing = regionH / (stripes - 1);
  waveAmp    = rowSpacing * 0.5;

  stroke('#fff');
}

function draw() {
  // — Dynamic pastel background in HSL —
  colorMode(HSL, 360, 100, 100);
  let baseHue = 100; // olive-green
  // nudge hue ±5° by bulge, then ±3° by noise
  let hue = baseHue + (bulgeVal - 0.5) * 10 + (noiseVal - 0.5) * 6;
  let sat = 8 + noiseVal * 4;   // 8–12% saturation
  let lit = 85 - bulgeVal * 5;   // 85% → 80% lightness
  background(hue, sat, lit);
  colorMode(RGB);

  const t  = millis() * 0.002;

  // draw each stripe with variable-stroke “pen” effect
  for (let i = 0; i < stripes; i++) {
    const centerY = height/2, half = (stripes-1)/2;
    let y0 = centerY + (i - half) * rowSpacing;
    const bendF = map(abs(i - half), 0, half, 1, 2);

    let pts = [];
    for (let x=0; x<=width; x+=5) {
      let phase = TWO_PI * freqVal * (x/width) + t;
      let y     = waveAmp * sin(phase);
      y += (noise(x * noiseVal * 0.1 + t*0.5, i*0.2)-0.5)*waveAmp;
      if (foldVal>0) {
        let f=foldVal*rowSpacing;
        y=abs(((y+f)%(2*f))-f);
      }
      let yy=y0+y;
      // stones...
      for (let st of stones) {
        let dx=x-st.x, dy=yy-st.y, d=sqrt(dx*dx+dy*dy);
        if (d<st.r) {
          let push=(st.r-d)/st.r, sign=dy/(d||1);
          y+=sign*push*st.strength*bendF;
          yy=y0+y;
        }
      }
      pts.push({x, y:yy});
    }

    for (let j=0; j<pts.length-1; j++) {
      const p0=pts[j], p1=pts[j+1];
      const norm=j/(pts.length-1);
      const baseLw=map(sin(frameCount*0.005),-1,1,1,2);
      const peakLw=baseLw + bulgeVal*3; // bulgeVal→ extra thickness
      const sw=lerp(baseLw, peakLw, sin(norm*PI));
      strokeWeight(sw);
      line(p0.x,p0.y,p1.x,p1.y);
    }
  }
}

function touchStarted() {
  initTouches = touches.map(t => ({...t}));
  return false;
}

function touchMoved() {
  if (touches.length === 1) {
    const y = touches[0].y;
    bulgeVal = constrain(map(y, height, 0, 0, 1), 0, 1);

    const minSp = (height * 0.15)/(stripes-1);
    const maxSp = (height * 0.25)/(stripes-1);
    rowSpacing = constrain(map(y,0,height,maxSp,minSp), minSp, maxSp);
    waveAmp    = rowSpacing*0.5;

    freqVal    = constrain(map(touches[0].x,0,width,0.5,5), 0.5, 8);
  }
  else if (touches.length === 2 && initTouches.length === 2) {
    const [a1,b1]=initTouches, [a2,b2]=touches;
    const ang0 = atan2(b1.y-a1.y, b1.x-a1.x);
    const ang1 = atan2(b2.y-a2.y, b2.x-a2.x);
    const delta=abs(ang1-ang0);
    noiseVal = foldVal = constrain(map(delta,0,PI,0,1),0,1);
  }
  return false;
}

function touchEnded() {
  if (touches.length===0 && initTouches.length===1) {
    const t0=initTouches[0];
    stones.push({ x:t0.x, y:t0.y, r:width*0.15, strength:40 });
  }
  initTouches=[];
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  const regionH = height * 0.2;
  rowSpacing = regionH/(stripes-1);
  waveAmp    = rowSpacing*0.5;
}

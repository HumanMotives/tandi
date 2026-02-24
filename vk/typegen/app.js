
// VOID KULTUR • Type Engine v5 (Alpha)

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { alpha: true });

const DPR = window.devicePixelRatio || 1;
const W = 1080;
const H = 1920;

canvas.width = W * DPR;
canvas.height = H * DPR;
ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

let running = false;
let startTime = 0;

const statusEl = document.getElementById("status");
function setStatus(msg){ statusEl.textContent = msg; }

function wordsList(){
  const val = (document.getElementById("words").value || "");
  return val.split("\n").map(w => w.trim()).filter(Boolean);
}

function currentFontColor(){
  const preset = document.getElementById("fontPreset").value;
  if(preset === "white") return "#ffffff";
  if(preset === "black") return "#000000";
  if(preset === "red") return "#ff2a2a";
  return document.getElementById("fontColor").value;
}

function clearOrFillBackground(){
  const bg = document.getElementById("bgMode").value;
  if(bg === "transparent"){
    ctx.clearRect(0, 0, W, H);
  } else {
    ctx.fillStyle = (bg === "white") ? "#ffffff" : "#000000";
    ctx.fillRect(0, 0, W, H);
  }
}

// Offscreen canvas (transparent) for glitch slicing
const off = document.createElement("canvas");
off.width = W;
off.height = H;
const ox = off.getContext("2d", { alpha: true });

function renderTextToOffscreen(drawFn){
  ox.clearRect(0,0,W,H);
  drawFn(ox);
}

function applyBlockGlitch(intensity){
  if(intensity <= 0) return;

  const blocks = Math.floor(6 + intensity * 28);
  const maxDx = 40 + intensity * 220;
  const maxDy = 12 + intensity * 120;

  // Horizontal slices
  for(let i=0;i<blocks;i++){
    const sliceH = 12 + Math.random() * (35 + intensity*140);
    const sy = Math.random() * (H - sliceH);
    const dx = (Math.random() - 0.5) * maxDx;
    ctx.drawImage(off, 0, sy, W, sliceH, dx, sy, W, sliceH);
  }

  // Vertical slices
  const vBlocks = Math.floor(2 + intensity * 12);
  for(let i=0;i<vBlocks;i++){
    const sliceW = 20 + Math.random() * (60 + intensity*220);
    const sx = Math.random() * (W - sliceW);
    const dy = (Math.random() - 0.5) * maxDy;
    ctx.drawImage(off, sx, 0, sliceW, H, sx, dy, sliceW, H);
  }

  // Dropout (alpha-safe)
  const drops = Math.floor(intensity * 8);
  for(let i=0;i<drops;i++){
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    const rw = 80 + Math.random() * (220 + intensity*320);
    const rh = 16 + Math.random() * (70 + intensity*160);
    const rx = Math.random() * (W - rw);
    const ry = Math.random() * (H - rh);
    ctx.fillRect(rx, ry, rw, rh);
    ctx.restore();
  }

  // Ghost layer (still alpha)
  if(intensity > 0.35){
    ctx.save();
    ctx.globalAlpha = 0.55 * intensity;
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(off, (Math.random()-0.5)*maxDx*0.20, (Math.random()-0.5)*maxDy*0.20);
    ctx.restore();
  }
}

function drawWord(word, progress){
  const safeWord = (typeof word === "string" ? word : "");
  clearOrFillBackground();

  const layout = document.getElementById("layoutMode").value;
  const letterMode = document.getElementById("letterMode").value;
  const scale = (parseInt(document.getElementById("sizeScale").value, 10) || 100) / 100;
  const intensity = (parseInt(document.getElementById("glitch").value, 10) || 0) / 100;
  const size = 260 * scale;

  // build strings
  let strings = [];
  if(letterMode === "sequential"){
    const letters = safeWord.split("");
    if(letters.length === 0) strings = [""];
    else{
      const idx = Math.max(0, Math.min(letters.length-1, Math.floor(progress * letters.length)));
      const visible = letters.slice(0, idx+1);
      strings = (layout === "vertical") ? visible : [visible.join("")];
    }
  } else {
    if(layout === "vertical") strings = safeWord.split("");
    else if(layout === "horizontal") strings = safeWord.split("");
    else strings = [safeWord];
  }

  // render to offscreen
  renderTextToOffscreen((c)=>{
    c.clearRect(0,0,W,H);
    c.font = "900 " + size + "px Arial Black";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = currentFontColor();
    c.globalAlpha = 1;

    if(layout === "vertical"){
      const n = strings.length || 1;
      for(let i=0;i<strings.length;i++){
        const y = H/2 - (n*size)/2 + i*size + size*0.5;
        c.fillText(strings[i], W/2, y);
      }
    } else if(layout === "horizontal" && strings.length > 1){
      const spacing = size * 0.78;
      const n = strings.length;
      for(let i=0;i<n;i++){
        const x = W/2 - (n*spacing)/2 + i*spacing + spacing*0.5;
        c.fillText(strings[i], x, H/2);
      }
    } else {
      c.fillText(strings[0] || "", W/2, H/2);
    }
  });

  // draw base glyph layer
  ctx.drawImage(off, 0, 0);

  // glitch
  applyBlockGlitch(intensity);
}

function animate(ts){
  if(!running) return;

  const list = wordsList();
  if(list.length === 0){
    setStatus("No words. Add at least 1 line.");
    running = false;
    return;
  }

  const sec = Math.max(0.2, parseFloat(document.getElementById("secPerWord").value) || 0.8);
  const elapsed = (ts - startTime) / 1000;

  const idx = Math.floor(elapsed / sec) % list.length;
  const word = list[idx] ?? "";
  const progress = (elapsed % sec) / sec;

  drawWord(word, progress);
  requestAnimationFrame(animate);
}

document.getElementById("previewBtn").onclick = ()=>{
  running = true;
  startTime = performance.now();
  setStatus("Preview running…");
  requestAnimationFrame(animate);
};

document.getElementById("stopBtn").onclick = ()=>{
  running = false;
  setStatus("Stopped.");
};

document.getElementById("recordBtn").onclick = ()=>{
  running = true;
  startTime = performance.now();

  const totalSec = Math.max(1, parseInt(document.getElementById("totalSec").value, 10) || 10);
  const fps = Math.max(24, Math.min(120, parseInt(document.getElementById("fps").value, 10) || 60));
  setStatus("Recording " + totalSec + "s @ " + fps + "fps…");

  const stream = canvas.captureStream(fps);

  const mimeCandidates = ["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"];
  let mime = "";
  for(const m of mimeCandidates){
    if(MediaRecorder.isTypeSupported(m)){ mime = m; break; }
  }

  const recorder = new MediaRecorder(stream, mime ? {mimeType:mime} : undefined);
  const chunks = [];
  recorder.ondataavailable = e => { if(e.data && e.data.size) chunks.push(e.data); };

  recorder.onstop = ()=>{
    const blob = new Blob(chunks, {type: mime || "video/webm"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().replace(/[:.]/g,"-");
    a.download = "voidkultur_alpha_" + stamp + ".webm";
    a.click();
    URL.revokeObjectURL(url);
    running = false;
    setStatus("Downloaded WebM (alpha if supported).");
  };

  recorder.start(200);
  requestAnimationFrame(animate);
  setTimeout(()=> recorder.stop(), totalSec * 1000);
};

setStatus("Idle");


// VOID KULTUR • Type Engine v4
// Fixes split() undefined errors + stronger blocky glitch + status updates.

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const DPR = window.devicePixelRatio || 1;

// Logical video size (what we export)
const W = 1080;
const H = 1920;

// Backing store size for crispness
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

function fillBackground(){
  const bg = document.getElementById("bgMode").value;
  ctx.fillStyle = bg === "white" ? "#ffffff" : "#000000";
  ctx.fillRect(0, 0, W, H);
}

function drawBaseText(text, x, y, size){
  ctx.font = "900 " + size + "px Arial Black";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = currentFontColor();
  ctx.globalAlpha = 1;
  ctx.fillText(text, x, y);
}

// Strong, blocky glitch: render text to offscreen canvas, then slice-shift chunks
const off = document.createElement("canvas");
off.width = W;
off.height = H;
const ox = off.getContext("2d");

function renderTextToOffscreen(drawFn){
  ox.clearRect(0,0,W,H);
  // transparent background to isolate glyphs
  ox.save();
  ox.globalCompositeOperation = "source-over";
  drawFn(ox);
  ox.restore();
}

function applyBlockGlitch(intensity){
  // intensity: 0..1
  if(intensity <= 0) return;

  // Decide number and size of blocks based on intensity
  const blocks = Math.floor(6 + intensity * 28);
  const maxDx = 40 + intensity * 220;
  const maxDy = 12 + intensity * 120;

  // Horizontal slices
  for(let i=0;i<blocks;i++){
    const sliceH = 12 + Math.random() * (35 + intensity*140);
    const sy = Math.random() * (H - sliceH);
    const dx = (Math.random() - 0.5) * maxDx;

    ctx.drawImage(off,
      0, sy, W, sliceH,
      dx, sy, W, sliceH
    );
  }

  // Vertical slices
  const vBlocks = Math.floor(2 + intensity * 12);
  for(let i=0;i<vBlocks;i++){
    const sliceW = 20 + Math.random() * (60 + intensity*220);
    const sx = Math.random() * (W - sliceW);
    const dy = (Math.random() - 0.5) * maxDy;

    ctx.drawImage(off,
      sx, 0, sliceW, H,
      sx, dy, sliceW, H
    );
  }

  // Occasional dropout rectangles (erase chunks)
  const drops = Math.floor(intensity * 8);
  for(let i=0;i<drops;i++){
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,1)";
    const rw = 80 + Math.random() * (220 + intensity*320);
    const rh = 16 + Math.random() * (70 + intensity*160);
    const rx = Math.random() * (W - rw);
    const ry = Math.random() * (H - rh);
    ctx.fillRect(rx, ry, rw, rh);
    ctx.restore();
  }

  // Simple RGB split shadow (visible at high intensity)
  if(intensity > 0.35){
    ctx.save();
    ctx.globalAlpha = 0.55 * intensity;
    // red offset
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(off, (Math.random()-0.5)*maxDx*0.35, (Math.random()-0.5)*maxDy*0.25);
    ctx.restore();
  }
}

function drawWord(word, progress){
  // hard guard: never call split on undefined
  const safeWord = (typeof word === "string" ? word : "");
  fillBackground();

  const layout = document.getElementById("layoutMode").value;
  const letterMode = document.getElementById("letterMode").value;
  const scale = (parseInt(document.getElementById("sizeScale").value, 10) || 100) / 100;
  const intensity = (parseInt(document.getElementById("glitch").value, 10) || 0) / 100;

  const size = 260 * scale;

  // Compose the string(s) we will draw
  let strings = [];
  if(letterMode === "sequential"){
    const letters = safeWord.split("");
    const idx = Math.max(0, Math.min(letters.length-1, Math.floor(progress * letters.length)));
    const visible = letters.slice(0, idx+1);

    if(layout === "vertical"){
      strings = visible.map(ch => ch);
    } else {
      strings = [visible.join("")];
    }
  } else {
    if(layout === "vertical"){
      strings = safeWord.split(""); // letters stacked
    } else if(layout === "horizontal"){
      strings = safeWord.split(""); // letters spread
    } else {
      strings = [safeWord];
    }
  }

  // Render to offscreen with transparent bg
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

  // Draw base clean text first
  ctx.drawImage(off, 0, 0);

  // Apply block glitch on top (bigger, more visible)
  applyBlockGlitch(intensity);

  // Occasional blink cut (pattern interrupt), also driven by intensity
  if(intensity > 0.6 && Math.random() < (0.03 + intensity*0.08)){
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = document.getElementById("bgMode").value === "white" ? "#fff" : "#000";
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
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
  // Start recording for totalSec seconds
  running = true;
  startTime = performance.now();

  const totalSec = Math.max(1, parseInt(document.getElementById("totalSec").value, 10) || 10);
  setStatus("Recording " + totalSec + "s…");

  const stream = canvas.captureStream(60);

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
    a.download = "voidkultur_reel_" + stamp + ".webm";
    a.click();
    URL.revokeObjectURL(url);
    running = false;
    setStatus("Downloaded WebM. Convert to MP4 if needed.");
  };

  recorder.start(200);
  requestAnimationFrame(animate);

  setTimeout(()=> recorder.stop(), totalSec * 1000);
};

// Initial status
setStatus("Idle");

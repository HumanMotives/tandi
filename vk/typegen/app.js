// VOID KULTUR • Type Engine
// - Canvas-based animated typography
// - Preview via requestAnimationFrame
// - Record via MediaRecorder (downloads WebM)
// Notes:
// - MP4 export in-browser is possible but heavy (ffmpeg.wasm). Best workflow: record WebM, convert to MP4 with ffmpeg.

const $ = (id) => /** @type {HTMLElement} */(document.getElementById(id));

const canvas = /** @type {HTMLCanvasElement} */($("c"));
const ctx = /** @type {CanvasRenderingContext2D} */(canvas.getContext("2d"));

const ui = {
  words: /** @type {HTMLTextAreaElement} */($("words")),
  secPerWord: /** @type {HTMLInputElement} */($("secPerWord")),
  totalSec: /** @type {HTMLInputElement} */($("totalSec")),
  fps: /** @type {HTMLInputElement} */($("fps")),
  res: /** @type {HTMLSelectElement} */($("res")),
  font: /** @type {HTMLSelectElement} */($("font")),
  style: /** @type {HTMLSelectElement} */($("style")),
  glitch: /** @type {HTMLInputElement} */($("glitch")),
  jitter: /** @type {HTMLInputElement} */($("jitter")),
  btnPreview: /** @type {HTMLButtonElement} */($("btnPreview")),
  btnStop: /** @type {HTMLButtonElement} */($("btnStop")),
  btnRecord: /** @type {HTMLButtonElement} */($("btnRecord")),
  status: $("status"),
};

const state = {
  running: false,
  startTs: 0,
  raf: 0,
  wordIndex: 0,
  wordStartTs: 0,
  lastSwitchTs: 0,
  // per-word randomized look
  bg: "#000",
  fg: "#f2f2f2",
  accent: "#ff2a2a",
  compMode: "source-over",
};

function parseRes() {
  const [w, h] = ui.res.value.split("x").map(Number);
  return { w, h };
}

function setStatus(msg) {
  ui.status.textContent = msg;
}

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function rand(min, max){ return Math.random() * (max - min) + min; }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function getWordLines() {
  return ui.words.value
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);
}

function fontStack(kind) {
  // Keep it fast and reliable across OS:
  if (kind === "condensed") return "800 10px 'Arial Narrow', 'HelveticaNeue-CondensedBold', 'Impact', system-ui, sans-serif";
  if (kind === "mono") return "800 10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
  return "900 10px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
}

function chooseLook() {
  const style = ui.style.value;
  const glitch = Number(ui.glitch.value) / 100;

  if (style === "whitevoid") {
    state.bg = pick(["#ffffff", "#f7f7f7", "#f1f1f1"]);
    state.fg = pick(["#0a0a0a", "#111111", "#161616"]);
    state.accent = "#ff2a2a";
    state.compMode = "source-over";
    return;
  }

  if (style === "inverted") {
    state.bg = pick(["#0b0b0c", "#0f0f12", "#070708"]);
    state.fg = "#ffffff";
    state.accent = pick(["#ffffff", "#ff2a2a"]);
    state.compMode = glitch > 0.6 ? "screen" : "source-over";
    return;
  }

  // blackred (default)
  state.bg = pick(["#070708", "#0b0b0c", "#101014", "#0d0d10"]);
  state.fg = pick(["#e9e9ec", "#d7d7db", "#f2f2f2"]);
  state.accent = "#ff2a2a";
  state.compMode = "source-over";
}

function fitTextSize(text, maxW, maxH, fontKind) {
  // Binary-ish scale search for big bold letters
  const base = 160; // start guess
  let lo = 40, hi = 420;
  for (let i=0;i<14;i++){
    const mid = (lo+hi)/2;
    ctx.font = fontStack(fontKind).replace("10px", `${mid}px`);
    const metrics = ctx.measureText(text);
    const w = metrics.width;
    const h = mid * 0.95;
    if (w <= maxW && h <= maxH) lo = mid;
    else hi = mid;
  }
  return lo;
}

function drawNoise(alpha=0.06) {
  // lightweight noise overlay
  const { w, h } = parseRes();
  const img = ctx.createImageData(120, 120);
  for (let i=0; i<img.data.length; i+=4){
    const v = Math.floor(Math.random()*255);
    img.data[i]=v; img.data[i+1]=v; img.data[i+2]=v; img.data[i+3]=Math.floor(alpha*255);
  }
  ctx.putImageData(img, 0, 0);
  ctx.drawImage(canvas, 0, 0, 120, 120, 0, 0, w, h);
}

function drawGlitchText(text, x, y, sizePx, align="center") {
  const g = Number(ui.glitch.value) / 100;
  const j = Number(ui.jitter.value) / 100;

  ctx.textAlign = align;
  ctx.textBaseline = "middle";

  // Main
  ctx.font = fontStack(ui.font.value).replace("10px", `${sizePx}px`);
  ctx.fillStyle = state.fg;
  ctx.globalAlpha = 1;
  ctx.fillText(text, x, y);

  // Accent ghost (red) with jitter
  const off = sizePx * 0.012 * (0.2 + j);
  ctx.fillStyle = state.accent;
  ctx.globalAlpha = clamp(0.25 + g*0.55, 0, 0.9);
  ctx.fillText(text, x + rand(-off, off), y + rand(-off, off));

  // Slice glitch: draw a few horizontal slices shifted
  const slices = Math.floor(2 + g * 8);
  for (let i=0;i<slices;i++){
    const sliceH = rand(6, 22) * (sizePx/160);
    const yy = y + rand(-sizePx*0.45, sizePx*0.45);
    const dx = rand(-40, 40) * g;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, yy - sliceH/2, canvas.width, sliceH);
    ctx.clip();
    ctx.globalAlpha = clamp(0.10 + g*0.35, 0, 0.6);
    ctx.fillStyle = i % 2 ? state.accent : state.fg;
    ctx.fillText(text, x + dx, y);
    ctx.restore();
  }

  ctx.globalAlpha = 1;
}

function currentWord(ts) {
  const words = getWordLines();
  if (!words.length) return "";
  const secPer = Math.max(0.2, Number(ui.secPerWord.value) || 0.55);
  const elapsed = (ts - state.startTs) / 1000;
  const idx = Math.floor(elapsed / secPer) % words.length;

  if (idx !== state.wordIndex) {
    state.wordIndex = idx;
    state.wordStartTs = ts;
    chooseLook();
  }
  return words[idx];
}

function clearBg() {
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = state.bg;
  ctx.fillRect(0,0,canvas.width, canvas.height);
}

function draw(ts) {
  if (!state.running) return;

  const { w, h } = parseRes();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w; canvas.height = h;
  }

  const word = currentWord(ts);
  const sinceWord = (ts - state.wordStartTs) / 1000;

  clearBg();

  // Subtle vignette / depth
  ctx.save();
  const grad = ctx.createRadialGradient(w*0.5, h*0.45, 10, w*0.5, h*0.45, Math.max(w,h)*0.75);
  grad.addColorStop(0, "rgba(255,255,255,0.03)");
  grad.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,w,h);
  ctx.restore();

  // Layout modes
  const style = ui.style.value;
  const g = Number(ui.glitch.value) / 100;
  const j = Number(ui.jitter.value) / 100;

  // Blink / pulse
  const blink = (Math.sin(sinceWord * (8 + g*10)) + 1) / 2;
  const alpha = clamp(0.55 + blink*0.55, 0, 1);

  // Random jitter
  const jx = rand(-1, 1) * (j * 20);
  const jy = rand(-1, 1) * (j * 20);

  if (style === "whitevoid") {
    // mostly empty with tiny corner element
    const corner = pick(["tl","tr","bl","br"]);
    const pad = Math.round(w * 0.06);
    const x = corner.includes("l") ? pad : (w - pad);
    const y = corner.includes("t") ? pad : (h - pad);

    const tiny = Math.max(26, Math.round(h * 0.04));
    ctx.globalAlpha = alpha;
    drawGlitchText(word, x + jx, y + jy, tiny, corner.includes("l") ? "left" : "right");

    // micro accent line
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = state.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pad, h - pad);
    ctx.lineTo(pad + Math.round(w*0.08), h - pad);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    // Big central word (editorial)
    const maxW = w * 0.90;
    const maxH = h * 0.44;
    const size = fitTextSize(word, maxW, maxH, ui.font.value);

    ctx.globalAlpha = alpha;
    drawGlitchText(word, w*0.5 + jx, h*0.52 + jy, size, "center");
    ctx.globalAlpha = 1;

    // tiny corner tag
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "700 26px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const tag = pick(["VK", "VOID", "KULTUR", "—", ".", ""]);
    ctx.fillText(tag, Math.round(w*0.04), Math.round(h*0.04));
    ctx.restore();

    // accent bar occasionally
    if (Math.random() < 0.08 + g*0.12) {
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = state.accent;
      const barH = Math.max(10, Math.round(h*0.012));
      const y = Math.round(rand(h*0.18, h*0.82));
      ctx.fillRect(0, y, w, barH);
      ctx.restore();
    }
  }

  // Noise overlay
  if (style !== "whitevoid") {
    ctx.save();
    ctx.globalAlpha = 1;
    drawNoise(0.045 + g*0.05);
    ctx.restore();
  }

  state.raf = requestAnimationFrame(draw);
}

function start() {
  if (state.running) return;
  const { w, h } = parseRes();
  canvas.width = w; canvas.height = h;

  state.running = true;
  state.startTs = performance.now();
  state.wordStartTs = state.startTs;
  state.wordIndex = -1;
  chooseLook();
  setStatus("Preview running…");
  state.raf = requestAnimationFrame(draw);
}

function stop() {
  state.running = false;
  if (state.raf) cancelAnimationFrame(state.raf);
  setStatus("Stopped.");
}

async function recordAndDownload() {
  stop();
  start();

  const fps = clamp(Number(ui.fps.value) || 60, 24, 120);
  const totalSec = clamp(Number(ui.totalSec.value) || 10, 1, 180);

  // Capture stream
  const stream = canvas.captureStream(fps);

  // MediaRecorder mime fallback
  const mimeCandidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  let mimeType = "";
  for (const m of mimeCandidates) {
    if (MediaRecorder.isTypeSupported(m)) { mimeType = m; break; }
  }

  const chunks = [];
  const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

  rec.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const startedAt = new Date();
  const pad = (n)=>String(n).padStart(2,"0");
  const stamp = `${startedAt.getFullYear()}${pad(startedAt.getMonth()+1)}${pad(startedAt.getDate())}_${pad(startedAt.getHours())}${pad(startedAt.getMinutes())}${pad(startedAt.getSeconds())}`;
  const filename = `voidkultur_type_${stamp}.webm`;

  setStatus(`Recording ${totalSec}s… (${mimeType || "default"})`);

  rec.start(200); // collect chunks every 200ms

  // Stop after duration
  await new Promise((resolve) => setTimeout(resolve, totalSec * 1000));
  rec.stop();

  await new Promise((resolve) => { rec.onstop = resolve; });

  stop();

  const blob = new Blob(chunks, { type: mimeType || "video/webm" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  setStatus(`Downloaded ${filename}. Convert to MP4 if needed.`);
}

ui.btnPreview.addEventListener("click", start);
ui.btnStop.addEventListener("click", stop);
ui.btnRecord.addEventListener("click", () => recordAndDownload());

// Start with correct canvas size
(function init(){
  const { w, h } = parseRes();
  canvas.width = w; canvas.height = h;
  clearBg();
  setStatus("Idle. Hit Start preview.");
})();

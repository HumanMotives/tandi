// ========================= js/main.js =========================
import {AudioEngine} from './js/audioEngine.js';
import {Waveform}     from './js/waveform.js';
import {UI}           from ./js/ui.js';

// ---- bootstrap singletons
const ui     = new UI(document);
const engine = new AudioEngine();
const wf     = new Waveform(ui.waveCanvas);

// keep playhead moving in the viz
wf.animate(() => engine.ctx.currentTime % (engine.buffer?.duration || 1));

// load helpers
async function ensureIR() {
  await engine.loadIR(undefined, msg => ui.log(msg));
}

// reflect waveform drag → sliders
ui.waveCanvas.addEventListener('pointerup', () => {
  if (!engine.buffer) return;
  const { start, length } = wf.slice;
  const dur = engine.buffer.duration;
  ui.start.value  = (start / dur).toFixed(3);
  ui.length.value = Math.min(1, length).toFixed(3);
  ui.start.dispatchEvent(new Event('input'));
  ui.length.dispatchEvent(new Event('input'));
});

// sliders → waveform
function syncFromSliders() {
  if (!engine.buffer) return;
  const dur    = engine.buffer.duration;
  const start  = Number(ui.start.value) * dur;
  const length = Number(ui.length.value);
  wf.setSlice(start, length);
}
['input','change'].forEach(ev => {
  ui.start.addEventListener(ev,   syncFromSliders);
  ui.length.addEventListener(ev,  syncFromSliders);
});

// loading
ui.randomLoad.addEventListener('click', async () => {
  ui.randomLoad.disabled = true; ui.randomLoad.textContent = 'Loading…';
  await ensureIR();
  try {
    const meta = await engine.loadRandomFromArchive(msg => ui.log(msg));
    wf.setBuffer(engine.buffer);
    ui.log(`📄 Loaded: ${meta.id}/${meta.file}`);
  } catch (e) {
    ui.log('❌ ' + e.message);
  }
  ui.randomLoad.disabled = false; ui.randomLoad.textContent = 'Random from Archive.org';
});

ui.fileInput.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  await ensureIR();
  await engine.loadFromFile(f, msg => ui.log(msg));
  wf.setBuffer(engine.buffer);
  ui.log('📄 Loaded local file: ' + f.name);
});

// ---------------- transport
ui.on(ui.playOnce,'click', () => {
  if (!engine.buffer) return alert('Load audio first');
  const reverse = ui.reverse.checked;
  engine.makeSlice(wf.slice.start, wf.slice.length, reverse);
  engine.playSlice({
    rate:     Number(ui.rate.value),
    filterHz: Number(ui.filter.value),
    wet:      Number(ui.wet.value),
    A:Number(ui.attack.value), D:Number(ui.decay.value),
    S:Number(ui.sustain.value), R:Number(ui.release.value)
  }, () => {});
  ui.log('▶️ Played slice once');
});

ui.on(ui.startLoop,'click', () => {
  if (!engine.buffer) return alert('Load audio first');
  const reverse = ui.reverse.checked;
  engine.makeSlice(wf.slice.start, wf.slice.length, reverse);
  engine.startFeedbackLoop({
    delayTime: Number(ui.delay.value),
    feedback:  Number(ui.feedback.value),
    rate:      Number(ui.rate.value),
    loop:      ui.loopToggle.checked,
    loopStart: wf.slice.start,
    loopEnd:   wf.slice.start + wf.slice.length
  }, () => {});
  ui.log(`🔁 Loop started (delay ${ui.delay.value}s, fb ${ui.feedback.value})`);
});

ui.on(ui.stopLoop,'click', () => { engine.stopLoop(); ui.log('⏹️ Loop stopped'); });

// ---------------- randomizers
ui.on(ui.randomSlice,'click', () => {
  if (!engine.buffer) return;
  const dur = engine.buffer.duration;
  ui.length.value = (0.01 + Math.random() * Math.min(1, dur)).toFixed(3);
  const maxStart = Math.max(0, dur - Number(ui.length.value));
  ui.start.value = (Math.random() * (maxStart / dur)).toFixed(3);
  ui.rate.value  = (0.1 + Math.random() * 2.9).toFixed(2);
  ui.start.dispatchEvent(new Event('input'));
  ui.length.dispatchEvent(new Event('input'));
  ui.rate.dispatchEvent(new Event('input'));
  ui.log('🎲 Random slice');
});

ui.on(ui.randomTone,'click', () => {
  ui.attack.value  = (Math.random()).toFixed(2);
  ui.decay.value   = (Math.random()).toFixed(2);
  ui.sustain.value = (Math.random()).toFixed(2);
  ui.release.value = (Math.random() * 3).toFixed(2);
  ui.filter.value  = (100 + Math.random() * 19900) | 0;
  ui.wet.value     = Math.random().toFixed(2);
  ['attack','decay','sustain','release','filter','wet']
    .forEach(id => ui[id].dispatchEvent(new Event('input')));
  ui.log('🎲 Random tone');
});

ui.on(ui.randomFX,'click', () => {
  ui.delay.value    = (Math.random() * 5).toFixed(2);
  ui.feedback.value = (Math.random() * 0.95).toFixed(2);
  ui.delay.dispatchEvent(new Event('input'));
  ui.feedback.dispatchEvent(new Event('input'));
  ui.log('🎲 Random FX');
});

ui.on(ui.randomAll,'click', () => {
  ui.randomSlice.click(); ui.randomTone.click(); ui.randomFX.click();
  ui.log('🔀 Randomized all');
});

// initial sync & resize
window.addEventListener('DOMContentLoaded', () => {
  const ev = new Event('resize'); window.dispatchEvent(ev);
  syncFromSliders();
});

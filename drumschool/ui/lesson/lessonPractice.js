// ui/lesson/lessonPractice.js
import { createMetronome } from "./modules/metronome.js";
import { createTransport } from "./modules/transport.js";
import { createTimeline } from "./modules/timeline.js";

export function mountLessonPractice({
  container,
  lesson,
  worldName = "Wereld",
  levelName = "Level",
  onExit = () => {}
}) {
  if (!lesson || typeof lesson !== "object") {
    throw new Error("mountLessonPractice: lesson ontbreekt of is ongeldig.");
  }

  const cfg = normalizeLessonConfig(lesson);

  const root = document.createElement("div");
  root.className = "lessonPracticeScreen";
  container.appendChild(root);

  root.innerHTML = `
    <div class="lpApp">
      <div class="lpHeader">
        <div class="lpHeaderCenter">
          <h1 class="lpWorldTitle">${escapeHtml(worldName)}</h1>
          <p class="lpLevelTitle">${escapeHtml(levelName)}</p>
        </div>

        <div class="lpHeaderRight">
          <button class="btn ghost" type="button" data-stop>Stoppen</button>
        </div>
      </div>

      <div class="lpPanel">
        <div class="lpRow" data-row="metronome">
          <div class="lpIcon">⏱️</div>
          <div class="lpLabel">
            <span class="small">Metronoom</span>
            <span class="value" id="metroState">Aan</span>
          </div>
          <div class="lpSpacer"></div>
          <button id="metroToggleBtn" class="lpMuteBtn" type="button" title="Metronoom aan/uit">🔊</button>
        </div>

        <div class="lpRow" data-row="bpm">
          <div class="lpIcon">🎵</div>
          <div class="lpLabel">
            <span class="small">BPM</span>
            <span class="value" id="bpmValue">${String(cfg.transport.bpm)}</span>
          </div>
          <input id="bpmSlider" type="range" min="40" max="220" value="${String(cfg.transport.bpm)}" />
          <div class="lpTiny">${escapeHtml(cfg.transport.timeSig)}</div>
        </div>

        <div class="lpRow" data-row="playstop">
          <div class="lpIcon">▶️</div>
          <div class="lpLabel">
            <span class="small">Les</span>
            <span class="value" id="barReadout">0/${String(cfg.transport.bars)}</span>
          </div>
          <div class="lpActions">
            <button id="playBtn" class="btn primary" type="button">Start</button>
            <button id="stopBtn" class="btn" type="button" disabled>Stop</button>
          </div>
        </div>
      </div>

      <div class="lpStage">
        <div id="timelineHost"></div>
      </div>
    </div>
  `;

  const stopBtn = root.querySelector("[data-stop]");
  const rowMetronome = root.querySelector('[data-row="metronome"]');
  const rowBpm = root.querySelector('[data-row="bpm"]');
  const rowPlayStop = root.querySelector('[data-row="playstop"]');

  const bpmSlider = root.querySelector("#bpmSlider");
  const bpmValue = root.querySelector("#bpmValue");

  const playBtn = root.querySelector("#playBtn");
  const stopPlayBtn = root.querySelector("#stopBtn");

  const metroToggleBtn = root.querySelector("#metroToggleBtn");
  const metroState = root.querySelector("#metroState");

  const barReadout = root.querySelector("#barReadout");
  const timelineHost = root.querySelector("#timelineHost");

  setVisible(rowMetronome, cfg.ui.showMetronome);
  setVisible(rowBpm, cfg.ui.showBpm);
  setVisible(rowPlayStop, cfg.ui.showPlayStop);

  const timeline = createTimeline({
    container: timelineHost,
    stepsPerBar: cfg.transport.stepsPerBar,
    bars: cfg.transport.bars,
    patternBars: cfg.patternBars
  });

  const metronome = createMetronome({
    enabled: cfg.ui.showMetronome ? true : false
  });
  syncMetronomeUI();

  // For 4/4: beatsPerBar = 4.
  // If stepsPerBar = 4 => tick every step.
  // If stepsPerBar = 8 => tick every 2 steps.
  // If stepsPerBar = 16 => tick every 4 steps.
  function isBeatStep(stepIndex) {
    const stride = Math.max(1, Math.round(cfg.transport.stepsPerBar / cfg.transport.beatsPerBar));
    return stepIndex % stride === 0;
  }

  const transport = createTransport({
    bpm: cfg.transport.bpm,
    stepsPerBar: cfg.transport.stepsPerBar,
    beatsPerBar: cfg.transport.beatsPerBar,
    bars: cfg.transport.bars,
    onStep: ({ barIndex, stepIndex }) => {
      timeline.setPlayhead(barIndex, stepIndex);

      if (cfg.ui.showMetronome) {
        metronome.tick({
          isBarStart: stepIndex === 0,
          isQuarter: isBeatStep(stepIndex) // "beat tick" for kids
        });
      }

      if (timeline.isHit(barIndex, stepIndex)) {
        metronome.hitBlip();
        timeline.pulseStep(barIndex, stepIndex);
      }

      const shownBar = Math.min(cfg.transport.bars, barIndex + 1);
      barReadout.textContent = `${shownBar}/${String(cfg.transport.bars)}`;
    },
    onDone: () => stopPlayback()
  });

  stopBtn.addEventListener("click", () => {
    cleanup();
    onExit();
  });

  playBtn.addEventListener("click", async () => {
    await metronome.ensureStarted();
    startPlayback();
  });

  stopPlayBtn.addEventListener("click", () => stopPlayback());

  metroToggleBtn.addEventListener("click", async () => {
    await metronome.ensureStarted();
    metronome.setEnabled(!metronome.getEnabled());
    syncMetronomeUI();
  });

  bpmSlider.addEventListener("input", (e) => {
    const v = clampInt(e.target.value, 40, 220);
    bpmValue.textContent = String(v);
    transport.setBpm(v);
  });

  function startPlayback() {
    playBtn.disabled = true;
    stopPlayBtn.disabled = false;

    barReadout.textContent = `0/${String(cfg.transport.bars)}`;
    timeline.resetPlayhead();
    transport.start();
  }

  function stopPlayback() {
    transport.stop();
    playBtn.disabled = false;
    stopPlayBtn.disabled = true;

    timeline.resetPlayhead();
    barReadout.textContent = `0/${String(cfg.transport.bars)}`;
  }

  function syncMetronomeUI() {
    const on = metronome.getEnabled();
    metroToggleBtn.textContent = on ? "🔊" : "🔇";
    metroState.textContent = on ? "Aan" : "Uit";
    metroToggleBtn.classList.toggle("isMuted", !on);
  }

  function cleanup() {
    stopPlayback();
    transport.destroy();
    timeline.destroy();
    metronome.destroy();
    root.remove();
  }

  function unmount() {
    cleanup();
  }

  return { unmount };
}

/* ---------------- helpers ---------------- */

function normalizeLessonConfig(lesson) {
  const ui = lesson.ui || {};
  const transport = lesson.transport || {};

  const timeSig = String(transport.timeSig || "4/4");
  const beatsPerBar = parseTimeSigBeats(timeSig);

  const stepsPerBar = clampInt(transport.stepsPerBar ?? beatsPerBar, 1, 64);
  const bars = clampInt(transport.bars ?? 1, 1, 64);
  const bpm = clampInt(transport.bpm ?? 90, 40, 220);

  const patternBarsRaw = lesson.pattern?.bars || [];
  const patternBars = [];

  for (let b = 0; b < bars; b++) {
    const barObj = patternBarsRaw[b] || { hits: [] };
    const hitsArr = Array.isArray(barObj.hits) ? barObj.hits : [];
    const hitSet = new Set();

    hitsArr.forEach((i) => {
      const n = Number(i);
      if (Number.isFinite(n) && n >= 0 && n < stepsPerBar) hitSet.add(n);
    });

    patternBars.push({ hits: hitSet });
  }

  return {
    ui: {
      showMetronome: ui.showMetronome !== false,
      showBpm: ui.showBpm !== false,
      showPlayStop: ui.showPlayStop !== false
    },
    transport: { bpm, bars, stepsPerBar, beatsPerBar, timeSig },
    patternBars
  };
}

function parseTimeSigBeats(timeSig) {
  const m = String(timeSig || "").match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return 4;
  const top = Number(m[1]);
  return Number.isFinite(top) && top > 0 ? top : 4;
}

function setVisible(el, flag) {
  if (!el) return;
  el.style.display = flag ? "" : "none";
}

function clampInt(v, min, max) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default mountLessonPractice;

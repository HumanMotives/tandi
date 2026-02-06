// ui/lesson/lessonPractice.js
import { createMetronome } from "./modules/metronome.js";
import { createTransport } from "./modules/transport.js";
import { createTimeline } from "./modules/timeline.js";

export function mountLessonPractice({
  container,
  lesson,                 // REQUIRED: lesson JSON from /levels/Wx-Ly.json
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

      <div class="lpPanel" data-panel>
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
            <button id="playBtn" class="btn primary" type="button">Oefenen</button>
            <button id="stopBtn" class="btn" type="button" disabled>Stop</button>
          </div>
        </div>

        <div class="lpRow lpRowStatus" data-row="status" style="display:none;">
          <div class="lpIcon">💡</div>
          <div class="lpLabel">
            <span class="small">Status</span>
            <span class="value" id="statusText">Klaar maken...</span>
          </div>
        </div>
      </div>

      <div class="lpStage">
        <div id="timelineHost"></div>
      </div>
    </div>
  `;

  // Elements
  const exitBtn = root.querySelector("[data-stop]");
  const rowMetronome = root.querySelector('[data-row="metronome"]');
  const rowBpm = root.querySelector('[data-row="bpm"]');
  const rowPlayStop = root.querySelector('[data-row="playstop"]');
  const rowStatus = root.querySelector('[data-row="status"]');

  const bpmSlider = root.querySelector("#bpmSlider");
  const bpmValue = root.querySelector("#bpmValue");

  const playBtn = root.querySelector("#playBtn");
  const stopPlayBtn = root.querySelector("#stopBtn");

  const metroToggleBtn = root.querySelector("#metroToggleBtn");
  const metroState = root.querySelector("#metroState");

  const barReadout = root.querySelector("#barReadout");
  const statusText = root.querySelector("#statusText");
  const timelineHost = root.querySelector("#timelineHost");

  // Apply UI flags from lesson
  setVisible(rowMetronome, cfg.ui.showMetronome);
  setVisible(rowBpm, cfg.ui.showBpm);
  setVisible(rowPlayStop, cfg.ui.showPlayStop);

  // Timeline
  const timeline = createTimeline({
    container: timelineHost,
    stepsPerBar: cfg.transport.stepsPerBar,
    bars: cfg.transport.bars,
    patternBars: cfg.patternBars
  });

  // Metronome
  const metronome = createMetronome({
    enabled: cfg.ui.showMetronome ? true : false
  });
  syncMetronomeUI();

  // State
  let isRunning = false;

  // Transport
  const transport = createTransport({
    bpm: cfg.transport.bpm,
    stepsPerBar: cfg.transport.stepsPerBar,
    bars: cfg.transport.bars,

    // NEW: always do a 1-bar count-in (4 clicks in 4/4)
    countInBars: 1,

    onStep: ({ barIndex, stepIndex, globalStepIndex, phase }) => {
      const inCountIn = phase === "countin";

      // During count-in: show status, keep bar readout at 0/X
      if (inCountIn) {
        showStatus(true, "Klaar maken...");

        barReadout.textContent = `0/${String(cfg.transport.bars)}`;

        // Forced metronome tick even if toggle off
        forcedMetronomeTick({
          isBarStart: stepIndex === 0,
          stepIndex,
          stepsPerBar: cfg.transport.stepsPerBar
        });

        // Optional: no playhead movement during count-in
        // (kids focus on clapping the count-in)
        return;
      }

      // Once playing: hide status, update playhead + hits
      showStatus(false);

      // Update moving playhead
      if (typeof timeline.setPlayhead === "function") {
        timeline.setPlayhead(barIndex, stepIndex);
      } else if (typeof timeline.setActiveStep === "function") {
        timeline.setActiveStep(barIndex, stepIndex);
      }

      // Metronome (only if enabled toggle is ON)
      if (metronome.getEnabled()) {
        metronome.tick({
          isBarStart: stepIndex === 0,
          isQuarter: isQuarterStep(stepIndex, cfg.transport.stepsPerBar)
        });
      }

      // Hit sound + pulse on hit
      if (cfg.ui.showNotes && timelineIsHit(timeline, barIndex, stepIndex)) {
        metronome.hitBlip?.();
        timelinePulse(timeline, barIndex, stepIndex);
      }

      // Readout: show current bar progress 1..bars
      const shownBar = Math.min(cfg.transport.bars, barIndex + 1);
      barReadout.textContent = `${shownBar}/${String(cfg.transport.bars)}`;
    },

    onDone: () => {
      stopPlayback();
    }
  });

  // UI handlers
  exitBtn.addEventListener("click", () => {
    cleanup();
    onExit();
  });

  playBtn.addEventListener("click", async () => {
    await metronome.ensureStarted();
    startPlayback();
  });

  stopPlayBtn.addEventListener("click", () => {
    stopPlayback();
  });

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
    if (isRunning) return;
    isRunning = true;

    playBtn.disabled = true;
    stopPlayBtn.disabled = false;

    barReadout.textContent = `0/${String(cfg.transport.bars)}`;

    // reset timeline visuals
    timelineReset(timeline);

    showStatus(true, "Klaar maken...");
    transport.start();
  }

  function stopPlayback() {
    if (!isRunning) return;
    isRunning = false;

    transport.stop();
    playBtn.disabled = false;
    stopPlayBtn.disabled = true;

    // reset visuals
    timelineReset(timeline);

    showStatus(false);
    barReadout.textContent = `0/${String(cfg.transport.bars)}`;
  }

  function forcedMetronomeTick({ isBarStart, stepIndex, stepsPerBar }) {
    const wasEnabled = metronome.getEnabled();

    // Force metronome ON for this one tick
    if (!wasEnabled) metronome.setEnabled(true);

    metronome.tick({
      isBarStart,
      isQuarter: isQuarterStep(stepIndex, stepsPerBar)
    });

    // Restore original enabled state
    if (!wasEnabled) metronome.setEnabled(false);
  }

  function showStatus(visible, text = "") {
    if (!rowStatus) return;
    rowStatus.style.display = visible ? "" : "none";
    if (visible && statusText) statusText.textContent = text || "Klaar maken...";
  }

  function syncMetronomeUI() {
    const on = metronome.getEnabled();
    metroToggleBtn.textContent = on ? "🔊" : "🔇";
    metroState.textContent = on ? "Aan" : "Uit";
    metroToggleBtn.classList.toggle("isMuted", !on);
  }

  function cleanup() {
    try { stopPlayback(); } catch {}
    try { transport.destroy(); } catch {}
    try { timeline.destroy?.(); } catch {}
    try { metronome.destroy(); } catch {}
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

  // Editor format: stepsPerBar could be 4 / 8 / 16 etc
  const stepsPerBar = clampInt(transport.stepsPerBar ?? 4, 1, 64);
  const bars = clampInt(transport.bars ?? 4, 1, 64);
  const bpm = clampInt(transport.bpm ?? 90, 40, 220);
  const timeSig = String(transport.timeSig || "4/4");

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
      showMetronome: ui.showMetronome !== false, // default true
      showBpm: ui.showBpm !== false,             // default true
      showPlayStop: ui.showPlayStop !== false,   // default true
      showNotes: ui.showNotes !== false          // default true
    },
    transport: { bpm, bars, stepsPerBar, timeSig },
    patternBars
  };
}

function isQuarterStep(stepIndex, stepsPerBar) {
  // For beginner lessons:
  // - stepsPerBar=4: every step is a quarter
  // - stepsPerBar=8: quarters are 0,2,4,6
  // - stepsPerBar=16: quarters are 0,4,8,12
  if (stepsPerBar <= 4) return true;

  const q = stepsPerBar / 4;
  if (!Number.isFinite(q) || q <= 0) return false;
  return stepIndex % q === 0;
}

function timelineReset(timeline) {
  if (!timeline) return;
  if (typeof timeline.resetPlayhead === "function") {
    timeline.resetPlayhead();
    return;
  }
  if (typeof timeline.reset === "function") {
    timeline.reset();
    return;
  }
  if (typeof timeline.setPlayhead === "function") {
    timeline.setPlayhead(0, -1);
  }
}

function timelineIsHit(timeline, barIndex, stepIndex) {
  if (!timeline) return false;
  if (typeof timeline.isHit === "function") return !!timeline.isHit(barIndex, stepIndex);
  if (typeof timeline.hasHit === "function") return !!timeline.hasHit(barIndex, stepIndex);
  return false;
}

function timelinePulse(timeline, barIndex, stepIndex) {
  if (!timeline) return;
  if (typeof timeline.pulseStep === "function") timeline.pulseStep(barIndex, stepIndex);
  else if (typeof timeline.pulseHit === "function") timeline.pulseHit(barIndex, stepIndex);
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

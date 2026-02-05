// ui/lesson/lessonPractice.js
import { createMetronome } from "./modules/metronome.js";
import { createTransport } from "./modules/transport.js";
import { createTimeline } from "./modules/timeline.js";

export function mountLessonPractice({
  container,
  lesson,                 // REQUIRED: lesson JSON
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
          <button id="metroToggleBtn" class="lpMuteBtn">🔊</button>
        </div>

        <div class="lpRow" data-row="bpm">
          <div class="lpIcon">🎵</div>
          <div class="lpLabel">
            <span class="small">BPM</span>
            <span class="value" id="bpmValue">${cfg.transport.bpm}</span>
          </div>
          <input id="bpmSlider" type="range" min="40" max="220" value="${cfg.transport.bpm}" />
          <div class="lpTiny">${escapeHtml(cfg.transport.timeSig)}</div>
        </div>

        <div class="lpRow" data-row="playstop">
          <div class="lpIcon">▶️</div>
          <div class="lpLabel">
            <span class="small">Les</span>
            <span class="value" id="barReadout">0/${cfg.transport.bars}</span>
          </div>
          <div class="lpActions">
            <button id="playBtn" class="btn primary">Start</button>
            <button id="stopBtn" class="btn" disabled>Stop</button>
          </div>
        </div>
      </div>

      <div class="lpStage">
        <div id="timelineHost"></div>
      </div>
    </div>
  `;

  const stopBtn = root.querySelector("[data-stop]");
  const bpmSlider = root.querySelector("#bpmSlider");
  const bpmValue = root.querySelector("#bpmValue");
  const playBtn = root.querySelector("#playBtn");
  const stopPlayBtn = root.querySelector("#stopBtn");
  const metroToggleBtn = root.querySelector("#metroToggleBtn");
  const metroState = root.querySelector("#metroState");
  const barReadout = root.querySelector("#barReadout");
  const timelineHost = root.querySelector("#timelineHost");

  // Timeline
  const timeline = createTimeline({
    container: timelineHost,
    stepsPerBar: cfg.transport.stepsPerBar,
    bars: cfg.transport.bars,
    patternBars: cfg.patternBars
  });

  // Metronome
  const metronome = createMetronome({ enabled: cfg.ui.showMetronome });
  syncMetronomeUI();

  // Transport
  const transport = createTransport({
    bpm: cfg.transport.bpm,
    stepsPerBar: cfg.transport.stepsPerBar,
    bars: cfg.transport.bars,
    onStep: ({ barIndex, stepIndex, stepsPerBar, isBarStart }) => {
      timeline.setPlayhead(barIndex, stepIndex);

      // 🔑 Correct metronome logic
      if (cfg.ui.showMetronome) {
        const quarterStride = stepsPerBar / 4;
        const isQuarter =
          Number.isInteger(quarterStride) &&
          stepIndex % quarterStride === 0;

        metronome.tick({
          isBarStart,
          isQuarter
        });
      }

      if (timeline.isHit(barIndex, stepIndex)) {
        metronome.hitBlip();
        timeline.pulseStep(barIndex, stepIndex);
      }

      barReadout.textContent = `${Math.min(cfg.transport.bars, barIndex + 1)}/${cfg.transport.bars}`;
    },
    onDone: stopPlayback
  });

  stopBtn.addEventListener("click", () => {
    cleanup();
    onExit();
  });

  playBtn.addEventListener("click", async () => {
    await metronome.ensureStarted();
    startPlayback();
  });

  stopPlayBtn.addEventListener("click", stopPlayback);

  metroToggleBtn.addEventListener("click", async () => {
    await metronome.ensureStarted();
    metronome.setEnabled(!metronome.getEnabled());
    syncMetronomeUI();
  });

  bpmSlider.addEventListener("input", (e) => {
    const v = clampInt(e.target.value, 40, 220);
    bpmValue.textContent = v;
    transport.setBpm(v);
  });

  function startPlayback() {
    playBtn.disabled = true;
    stopPlayBtn.disabled = false;
    barReadout.textContent = `0/${cfg.transport.bars}`;
    timeline.resetPlayhead();
    transport.start();
  }

  function stopPlayback() {
    transport.stop();
    playBtn.disabled = false;
    stopPlayBtn.disabled = true;
    timeline.resetPlayhead();
    barReadout.textContent = `0/${cfg.transport.bars}`;
  }

  function syncMetronomeUI() {
    const on = metronome.getEnabled();
    metroToggleBtn.textContent = on ? "🔊" : "🔇";
    metroState.textContent = on ? "Aan" : "Uit";
  }

  function cleanup() {
    stopPlayback();
    transport.destroy();
    timeline.destroy();
    metronome.destroy();
    root.remove();
  }

  return { unmount: cleanup };
}

/* ---------- helpers ---------- */

function normalizeLessonConfig(lesson) {
  const ui = lesson.ui || {};
  const transport = lesson.transport || {};

  const stepsPerBar = clampInt(transport.stepsPerBar ?? 4, 1, 32);
  const bars = clampInt(transport.bars ?? 1, 1, 64);
  const bpm = clampInt(transport.bpm ?? 90, 40, 220);
  const timeSig = String(transport.timeSig || "4/4");

  const patternBars = [];
  const rawBars = lesson.pattern?.bars || [];

  for (let b = 0; b < bars; b++) {
    const hits = new Set();
    (rawBars[b]?.hits || []).forEach(i => {
      if (i >= 0 && i < stepsPerBar) hits.add(i);
    });
    patternBars.push({ hits });
  }

  return {
    ui: {
      showMetronome: ui.showMetronome !== false,
      showBpm: ui.showBpm !== false,
      showPlayStop: ui.showPlayStop !== false
    },
    transport: { bpm, bars, stepsPerBar, timeSig },
    patternBars
  };
}

function clampInt(v, min, max) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
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

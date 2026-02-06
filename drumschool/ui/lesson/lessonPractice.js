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
  root.className = "lessonScreen";
  container.appendChild(root);

  root.innerHTML = `
    <div class="lessonTopBar">
      <div class="lessonTopLeft">
        <button class="btn ghost" type="button" data-exit>Stoppen</button>
      </div>

      <div class="lessonTopCenter">
        <div class="lessonWorldTitle">${escapeHtml(worldName)}</div>
        <div class="lessonLevelTitle">${escapeHtml(levelName)}</div>
      </div>

      <div class="lessonTopRight">
        <button class="btn FletcherPrimary" type="button" data-practice>Oefenen</button>
        <button class="btn" type="button" data-stopplay disabled>Stop</button>
      </div>
    </div>

    <div class="lessonControlCard">
      <div class="lessonControlLeft">
        <div class="lessonStat">
          <div class="lessonStatLabel">Les</div>
          <div class="lessonStatValue" id="barReadout">0/${cfg.transport.bars}</div>
        </div>

        <div class="lessonStat">
          <div class="lessonStatLabel">BPM</div>
          <div class="lessonStatValue" id="bpmValue">${cfg.transport.bpm}</div>
        </div>
      </div>

      <div class="lessonControlMid">
        <input id="bpmSlider" type="range" min="40" max="220" value="${cfg.transport.bpm}" />
      </div>

      <div class="lessonControlRight">
        <button class="btn ghost" type="button" id="metroToggle">Metronoom: <span id="metroState">Aan</span></button>
        <button class="btn ghost" type="button" id="noteToggle">Noten: <span id="noteState">Aan</span></button>
      </div>
    </div>

    <div class="lessonStage">
      <div id="timelineHost"></div>
    </div>

    <div class="lessonHelp" id="helpBox">
      <div class="lessonHelpInner">
        ${escapeHtml(cfg.helpText)}
      </div>
    </div>
  `;

  const btnExit = root.querySelector("[data-exit]");
  const btnPractice = root.querySelector("[data-practice]");
  const btnStopPlay = root.querySelector("[data-stopplay]");

  const bpmSlider = root.querySelector("#bpmSlider");
  const bpmValue = root.querySelector("#bpmValue");
  const barReadout = root.querySelector("#barReadout");

  const metroToggle = root.querySelector("#metroToggle");
  const metroState = root.querySelector("#metroState");

  const noteToggle = root.querySelector("#noteToggle");
  const noteState = root.querySelector("#noteState");

  const timelineHost = root.querySelector("#timelineHost");

  // Modules
  const timeline = createTimeline({
    container: timelineHost,
    stepsPerBar: cfg.transport.stepsPerBar,
    bars: cfg.transport.bars,
    patternBars: cfg.patternBars
  });

  const metronome = createMetronome({ enabled: cfg.ui.metronomeOn });
  let notesOn = cfg.ui.notesOn;

  const transport = createTransport({
    bpm: cfg.transport.bpm,
    stepsPerBar: cfg.transport.stepsPerBar,
    bars: cfg.transport.bars,
    onStep: ({ barIndex, stepIndex, stepsPerBar }) => {
      timeline.setPlayhead(barIndex, stepIndex);

      // Quarter tick: afhankelijk van grid
      const quarterEvery = Math.max(1, Math.round(stepsPerBar / 4)); // 4->1, 8->2, 16->4
      const isQuarter = (stepIndex % quarterEvery) === 0;

      metronome.tick({
        isBarStart: stepIndex === 0,
        isQuarter
      });

      if (timeline.isHit(barIndex, stepIndex)) {
        timeline.pulseStep(barIndex, stepIndex);
        if (notesOn) metronome.hitBlip();
      }

      const shownBar = Math.min(cfg.transport.bars, barIndex + 1);
      barReadout.textContent = `${shownBar}/${cfg.transport.bars}`;
    },
    onDone: () => stopPlayback()
  });

  syncMetroUI();
  syncNoteUI();

  // Events
  btnExit.addEventListener("click", () => {
    cleanup();
    onExit();
  });

  btnPractice.addEventListener("click", async () => {
    await metronome.ensureStarted();
    startPlayback();
  });

  btnStopPlay.addEventListener("click", () => stopPlayback());

  bpmSlider.addEventListener("input", (e) => {
    const v = clampInt(e.target.value, 40, 220);
    bpmValue.textContent = String(v);
    transport.setBpm(v);
  });

  metroToggle.addEventListener("click", async () => {
    await metronome.ensureStarted();
    metronome.setEnabled(!metronome.getEnabled());
    syncMetroUI();
  });

  noteToggle.addEventListener("click", () => {
    notesOn = !notesOn;
    syncNoteUI();
  });

  function startPlayback() {
    btnPractice.disabled = true;
    btnStopPlay.disabled = false;
    barReadout.textContent = `0/${cfg.transport.bars}`;
    timeline.resetPlayhead();
    transport.start();
  }

  function stopPlayback() {
    transport.stop();
    btnPractice.disabled = false;
    btnStopPlay.disabled = true;
    timeline.resetPlayhead();
    barReadout.textContent = `0/${cfg.transport.bars}`;
  }

  function syncMetroUI() {
    const on = metronome.getEnabled();
    metroState.textContent = on ? "Aan" : "Uit";
    metroToggle.classList.toggle("isMuted", !on);
  }

  function syncNoteUI() {
    noteState.textContent = notesOn ? "Aan" : "Uit";
    noteToggle.classList.toggle("isMuted", !notesOn);
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

function normalizeLessonConfig(lesson) {
  const ui = lesson.ui || {};
  const transport = lesson.transport || {};

  const stepsPerBar = clampInt(transport.stepsPerBar ?? 4, 1, 32); // 4/8/16 etc
  const bars = clampInt(transport.bars ?? 4, 1, 64);
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

  const helpText =
    typeof lesson.helpText === "string" && lesson.helpText.trim()
      ? lesson.helpText
      : "Druk op Oefenen om te starten.";

  return {
    ui: {
      metronomeOn: ui.showMetronome !== false,
      notesOn: ui.showNotes !== false
    },
    transport: { bpm, bars, stepsPerBar },
    patternBars,
    helpText
  };
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

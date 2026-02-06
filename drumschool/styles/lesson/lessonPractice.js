// ui/lesson/lessonPractice.js
// Lesson practice screen (v1 layout)

import { createMetronome } from "./modules/metronome.js";
import { createTransport } from "./modules/transport.js";
import { createTimeline } from "./modules/timeline.js";

export function mountLessonPractice({
  container,
  lesson,                 // REQUIRED: lesson JSON loaded from /levels/Wx-Ly.json
  worldName = "Wereld",
  levelName = "Les",
  player = null,          // optional: { name, avatarSrc, stars, achievements }
  onExit = () => {},
  onShowtime = () => {}
}) {
  if (!lesson || typeof lesson !== "object") {
    throw new Error("mountLessonPractice: lesson ontbreekt of is ongeldig.");
  }

  const cfg = normalizeLessonConfig(lesson);

  const root = document.createElement("div");
  root.className = "lessonScreen";
  container.appendChild(root);

  const playerName = (player?.name || "Speler").trim() || "Speler";
  const playerAvatarSrc = player?.avatarSrc || "";

  root.innerHTML = `
    <div class="lessonLayout">
      <aside class="lessonSidebar">
        <div class="lessonSidebarCard">
          <div class="lessonAvatarWrap">
            ${playerAvatarSrc ? `<img class="lessonAvatarImg" src="${playerAvatarSrc}" alt="${escapeHtml(playerName)}" />` : `<div class="lessonAvatarPlaceholder" aria-hidden="true">🙂</div>`}
          </div>
          <div class="lessonPlayerName">${escapeHtml(playerName)}</div>

          <div class="lessonStats">
            <div class="lessonStat">
              <div class="lessonStatIcon">⭐</div>
              <div class="lessonStatVal">${escapeHtml(String(player?.stars ?? 0))}</div>
            </div>
            <div class="lessonStat">
              <div class="lessonStatIcon">🏆</div>
              <div class="lessonStatVal">${escapeHtml(String(player?.achievements ?? 0))}</div>
            </div>
          </div>

          <div class="lessonSidebarHint">(v1) Stats zijn tijdelijk placeholders</div>
        </div>
      </aside>

      <main class="lessonMain">
        <div class="lessonTopBar">
          <button class="btn primary" type="button" data-top-start>Oefenen</button>
          <button class="btn" type="button" data-top-stop>Stoppen</button>
          <button class="btn ghost" type="button" data-top-showtime>Showtime</button>
        </div>

        <section class="lessonInfoCard">
          <div class="lessonInfoLeft">
            <div class="lessonWorld">${escapeHtml(worldName)}</div>
            <div class="lessonTitle">${escapeHtml(levelName)}</div>
          </div>

          <div class="lessonInfoCenter">
            <div class="lessonProgress"><span id="barReadout">0</span>/<span>${String(cfg.transport.bars)}</span></div>
          </div>

          <div class="lessonInfoRight">
            <button class="lessonIconBtn" type="button" data-info-toggle title="Uitleg aan/uit">ℹ️</button>
            <button class="lessonIconBtn" type="button" data-loop-toggle title="Loop aan/uit">🔁</button>
            <button class="lessonIconBtn" type="button" data-notes-toggle title="Noten geluid aan/uit">🎵</button>
            <button class="lessonIconBtn" type="button" data-metro-toggle title="Metronoom aan/uit">⏱️</button>
          </div>
        </section>

        <section class="lessonControls">
          <div class="lessonControlsLeft">
            <div class="lessonBpmLabel">BPM</div>
            <div class="lessonBpmValue" id="bpmValue">${String(cfg.transport.bpm)}</div>
          </div>
          <input class="lessonBpmSlider" id="bpmSlider" type="range" min="40" max="220" value="${String(cfg.transport.bpm)}" />

          <div class="lessonControlsRight">
            <button class="btn primary" type="button" data-start>Start</button>
            <button class="btn" type="button" data-stop disabled>Stop</button>
          </div>
        </section>

        <section class="lessonTimelineCard">
          <div id="timelineHost"></div>
        </section>

        <section class="lessonExplanation" data-expl>
          <div class="lessonExplanationInner" id="explanationText"></div>
        </section>
      </main>
    </div>
  `;

  // --- Elements
  const btnTopStart = root.querySelector("[data-top-start]");
  const btnTopStop = root.querySelector("[data-top-stop]");
  const btnTopShowtime = root.querySelector("[data-top-showtime]");

  const barReadout = root.querySelector("#barReadout");
  const bpmValue = root.querySelector("#bpmValue");
  const bpmSlider = root.querySelector("#bpmSlider");

  const btnStart = root.querySelector("[data-start]");
  const btnStop = root.querySelector("[data-stop]");

  const btnInfo = root.querySelector("[data-info-toggle]");
  const btnLoop = root.querySelector("[data-loop-toggle]");
  const btnNotes = root.querySelector("[data-notes-toggle]");
  const btnMetro = root.querySelector("[data-metro-toggle]");

  const explWrap = root.querySelector("[data-expl]");
  const explText = root.querySelector("#explanationText");
  const timelineHost = root.querySelector("#timelineHost");

  // --- Explanation
  explText.textContent = buildExplanationText(lesson);

  let infoVisible = true;
  function setInfoVisible(v) {
    infoVisible = !!v;
    explWrap.classList.toggle("isHidden", !infoVisible);
    btnInfo.classList.toggle("isOff", !infoVisible);
  }
  setInfoVisible(true);

  // --- Toggles
  let loopEnabled = !!cfg.ui.loop;
  let notesEnabled = !!cfg.ui.notes;

  function syncToggleUI() {
    btnLoop.classList.toggle("isOff", !loopEnabled);
    btnNotes.classList.toggle("isOff", !notesEnabled);
    btnMetro.classList.toggle("isOff", !metronome.getEnabled());
  }

  // --- Timeline (pattern)
  const timeline = createTimeline({
    container: timelineHost,
    stepsPerBar: cfg.transport.stepsPerBar,
    bars: cfg.transport.bars,
    patternBars: cfg.patternBars
  });

  // --- Audio / Metronome
  const metronome = createMetronome({ enabled: cfg.ui.metronome });

  // --- Transport engine
  const transport = createTransport({
    bpm: cfg.transport.bpm,
    stepsPerBar: cfg.transport.stepsPerBar,
    bars: cfg.transport.bars,
    onStep: ({ barIndex, stepIndex }) => {
      timeline.setPlayhead(barIndex, stepIndex);

      // Metronome: tick on every visible grid dot when stepsPerBar === 4
      // Otherwise tick on quarter notes: 0,2,4,6 (8) or 0,4,8,12 (16)
      const qStride = Math.max(1, Math.floor(cfg.transport.stepsPerBar / 4));
      const isQuarter = (stepIndex % qStride) === 0;
      metronome.tick({
        isBarStart: stepIndex === 0,
        isQuarter
      });

      if (timeline.isHit(barIndex, stepIndex)) {
        timeline.pulseStep(barIndex, stepIndex);
        if (notesEnabled) metronome.hitBlip();
      }

      const shownBar = Math.min(cfg.transport.bars, barIndex + 1);
      barReadout.textContent = String(shownBar);
    },
    onDone: () => {
      if (loopEnabled) {
        // restart clean
        timeline.resetPlayhead();
        barReadout.textContent = "0";
        transport.start();
        return;
      }

      stopPlayback();
    }
  });

  // --- Playback
  function startPlayback() {
    btnStart.disabled = true;
    btnStop.disabled = false;

    barReadout.textContent = "0";
    timeline.resetPlayhead();
    transport.start();
  }

  function stopPlayback() {
    transport.stop();
    btnStart.disabled = false;
    btnStop.disabled = true;
    timeline.resetPlayhead();
    barReadout.textContent = "0";
  }

  // --- Wire UI
  btnTopStart.addEventListener("click", async () => {
    await metronome.ensureStarted();
    startPlayback();
  });

  btnTopStop.addEventListener("click", () => {
    cleanup();
    onExit();
  });

  btnTopShowtime.addEventListener("click", () => {
    // v1: stub hook
    onShowtime({ lesson });
  });

  btnStart.addEventListener("click", async () => {
    await metronome.ensureStarted();
    startPlayback();
  });

  btnStop.addEventListener("click", () => {
    stopPlayback();
  });

  btnInfo.addEventListener("click", () => {
    setInfoVisible(!infoVisible);
  });

  btnLoop.addEventListener("click", () => {
    loopEnabled = !loopEnabled;
    syncToggleUI();
  });

  btnNotes.addEventListener("click", () => {
    notesEnabled = !notesEnabled;
    syncToggleUI();
  });

  btnMetro.addEventListener("click", async () => {
    await metronome.ensureStarted();
    metronome.setEnabled(!metronome.getEnabled());
    syncToggleUI();
  });

  bpmSlider.addEventListener("input", (e) => {
    const v = clampInt(e.target.value, 40, 220);
    bpmValue.textContent = String(v);
    transport.setBpm(v);
  });

  // Init toggle UI
  syncToggleUI();

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

  // Allowed grids: 4 (quarters), 8 (eighths), 16 (sixteenths)
  const rawSteps = Number(transport.stepsPerBar ?? 4);
  let stepsPerBar = 4;
  if (rawSteps >= 16) stepsPerBar = 16;
  else if (rawSteps >= 8) stepsPerBar = 8;
  else stepsPerBar = 4;

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
      metronome: ui.showMetronome !== false,
      loop: !!ui.loop,
      notes: ui.showNotesSound !== false
    },
    transport: { bpm, bars, stepsPerBar, timeSig },
    patternBars
  };
}

function buildExplanationText(lesson) {
  // Prefer explicit lesson text fields, fallback to intro script
  const t = (lesson.helpText || lesson.description || lesson.explanation || "").trim();
  if (t) return t;

  const lines = Array.isArray(lesson.intro) ? lesson.intro : [];
  const texts = lines
    .map((l) => (l && typeof l.text === "string" ? l.text.trim() : ""))
    .filter(Boolean);

  if (texts.length) return texts.join("\n");
  return "";
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

// ui/lesson/lessonPractice.js
import { createMetronome } from "./modules/metronome.js";
import { createTransport } from "./modules/transport.js";
import { createTimeline } from "./modules/timeline.js";

export function mountLessonPractice({
  container,
  lesson,
  worldName = "Wereld",
  levelName = "Les",
  // optional, for sidebar
  playerName = "Speler",
  playerAvatarSrc = "./assets/img/avatar_default.png",
  stats = { stars: 0, streak: 0, badges: 0 },
  onExit = () => {}
}) {
  if (!lesson || typeof lesson !== "object") {
    throw new Error("mountLessonPractice: lesson ontbreekt of is ongeldig.");
  }

  const cfg = normalizeLessonConfig(lesson);

  const root = document.createElement("div");
  root.className = "lessonV1";
  container.appendChild(root);

  // If there is an old loader element still in the DOM, hide it
  try {
    const oldLoader = document.querySelector("[data-lesson-loader]");
    if (oldLoader) oldLoader.remove();
  } catch {}

  root.innerHTML = `
    <div class="lessonGrid">
      <!-- SIDEBAR -->
      <aside class="lessonSidebar">
        <div class="lessonSidebarCard">
          <div class="lessonPlayer">
            <img class="lessonPlayerAvatar" src="${escapeHtml(playerAvatarSrc)}" alt="Avatar" />
            <div class="lessonPlayerName">${escapeHtml(playerName)}</div>
          </div>

          <div class="lessonStats">
            <div class="lessonStatRow">
              <span class="lessonStatIcon">⭐</span>
              <span class="lessonStatLabel">Stars</span>
              <span class="lessonStatValue">${Number(stats.stars) || 0}</span>
            </div>
            <div class="lessonStatRow">
              <span class="lessonStatIcon">🔥</span>
              <span class="lessonStatLabel">Streak</span>
              <span class="lessonStatValue">${Number(stats.streak) || 0}</span>
            </div>
            <div class="lessonStatRow">
              <span class="lessonStatIcon">🏅</span>
              <span class="lessonStatLabel">Badges</span>
              <span class="lessonStatValue">${Number(stats.badges) || 0}</span>
            </div>
          </div>

          <div class="lessonSidebarHint">
            (v1 sidebar placeholder)
          </div>
        </div>
      </aside>

      <!-- MAIN -->
      <main class="lessonMain">
        <!-- TOP BAR -->
        <div class="lessonTopBar">
          <button class="btn ghost" type="button" data-exit>Stoppen</button>

          <div class="lessonTopTitle">
            <div class="lessonTopWorld">${escapeHtml(worldName)}</div>
            <div class="lessonTopLevel">${escapeHtml(levelName)}</div>
          </div>

          <div class="lessonTopActions">
            <button class="btn primary" type="button" data-practice>Oefenen</button>
            <button class="btn" type="button" data-stopplay disabled>Stop</button>
            <button class="btn ghost" type="button" data-showtime>Showtime!</button>
          </div>
        </div>

        <!-- LES CARD -->
        <div class="lessonCard">
          <div class="lessonCardLeft">
            <div class="lessonCardTitle">
              <div class="lessonCardWorld">${escapeHtml(worldName)}</div>
              <div class="lessonCardLesson">${escapeHtml(levelName)}</div>
            </div>
          </div>

          <div class="lessonCardMid">
            <div class="lessonProgress">
              <div class="lessonProgressLabel">Les</div>
              <div class="lessonProgressValue" id="barReadout">0/${cfg.transport.bars}</div>
            </div>

            <div class="lessonBpm">
              <div class="lessonBpmLabel">BPM</div>
              <div class="lessonBpmValue" id="bpmValue">${cfg.transport.bpm}</div>
              <input id="bpmSlider" type="range" min="40" max="220" value="${cfg.transport.bpm}" />
            </div>
          </div>

          <div class="lessonCardRight">
            <button class="btn ghost lessonToggleBtn" type="button" id="infoToggle">
              Info: <span id="infoState">Aan</span>
            </button>
            <button class="btn ghost lessonToggleBtn" type="button" id="metroToggle">
              Metronoom: <span id="metroState">Aan</span>
            </button>
            <button class="btn ghost lessonToggleBtn" type="button" id="noteToggle">
              Noten: <span id="noteState">Aan</span>
            </button>
            <button class="btn ghost lessonToggleBtn" type="button" id="loopToggle">
              Loop: <span id="loopState">Uit</span>
            </button>
          </div>
        </div>

        <!-- STAGE -->
        <div class="lessonStage">
          <div class="lessonArrow" id="barArrow" aria-hidden="true">➜</div>
          <div id="timelineHost"></div>
        </div>

        <!-- HELP -->
        <div class="lessonHelp" id="helpBox">
          <div class="lessonHelpInner">${escapeHtml(cfg.helpText)}</div>
        </div>
      </main>
    </div>
  `;

  const btnExit = root.querySelector("[data-exit]");
  const btnPractice = root.querySelector("[data-practice]");
  const btnStopPlay = root.querySelector("[data-stopplay]");
  const btnShowtime = root.querySelector("[data-showtime]");

  const bpmSlider = root.querySelector("#bpmSlider");
  const bpmValue = root.querySelector("#bpmValue");
  const barReadout = root.querySelector("#barReadout");

  const infoToggle = root.querySelector("#infoToggle");
  const infoState = root.querySelector("#infoState");
  const helpBox = root.querySelector("#helpBox");

  const metroToggle = root.querySelector("#metroToggle");
  const metroState = root.querySelector("#metroState");

  const noteToggle = root.querySelector("#noteToggle");
  const noteState = root.querySelector("#noteState");

  const loopToggle = root.querySelector("#loopToggle");
  const loopState = root.querySelector("#loopState");

  const barArrow = root.querySelector("#barArrow");
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
  let infoOn = cfg.ui.infoOn;
  let loopOn = cfg.ui.loopOn;

  const transport = createTransport({
    bpm: cfg.transport.bpm,
    stepsPerBar: cfg.transport.stepsPerBar,
    bars: cfg.transport.bars,
    onStep: ({ barIndex, stepIndex, stepsPerBar }) => {
      timeline.setPlayhead(barIndex, stepIndex);

      // Arrow jumps per active bar (simple v1)
      moveBarArrowToBar(barIndex);

      // Quarter tick depends on grid
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
    onDone: () => {
      if (loopOn) {
        // restart clean
        stopPlayback(false);
        startPlayback();
        return;
      }
      stopPlayback();
    }
  });

  // Init UI states
  applyInfoUI();
  syncMetroUI();
  syncNoteUI();
  syncLoopUI();

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

  btnShowtime.addEventListener("click", () => {
    // v1: only UI placeholder
    alert("Showtime komt later (exam / unlock logic).");
  });

  bpmSlider.addEventListener("input", (e) => {
    const v = clampInt(e.target.value, 40, 220);
    bpmValue.textContent = String(v);
    transport.setBpm(v);
  });

  infoToggle.addEventListener("click", () => {
    infoOn = !infoOn;
    applyInfoUI();
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

  loopToggle.addEventListener("click", () => {
    loopOn = !loopOn;
    syncLoopUI();
  });

  function startPlayback() {
    btnPractice.disabled = true;
    btnStopPlay.disabled = false;
    barReadout.textContent = `0/${cfg.transport.bars}`;
    timeline.resetPlayhead();
    moveBarArrowToBar(0);
    transport.start();
  }

  function stopPlayback(reset = true) {
    transport.stop();
    btnPractice.disabled = false;
    btnStopPlay.disabled = true;

    if (reset) {
      timeline.resetPlayhead();
      barReadout.textContent = `0/${cfg.transport.bars}`;
      moveBarArrowToBar(0);
    }
  }

  function applyInfoUI() {
    infoState.textContent = infoOn ? "Aan" : "Uit";
    helpBox.style.display = infoOn ? "" : "none";
    infoToggle.classList.toggle("isMuted", !infoOn);
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

  function syncLoopUI() {
    loopState.textContent = loopOn ? "Aan" : "Uit";
    loopToggle.classList.toggle("isMuted", !loopOn);
  }

  function moveBarArrowToBar(barIndex) {
    // place arrow next to the active bar element
    const barEls = root.querySelectorAll(".tlBar");
    const barEl = barEls[barIndex];
    if (!barEl) return;

    const r = barEl.getBoundingClientRect();
    const host = root.querySelector(".lessonStage").getBoundingClientRect();

    // arrow absolute inside stage
    const top = (r.top - host.top) + (r.height / 2) - 12; // 12 = half arrow height-ish
    barArrow.style.top = `${Math.max(0, top)}px`;
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

/* helpers */

function normalizeLessonConfig(lesson) {
  const ui = lesson.ui || {};
  const transport = lesson.transport || {};

  const stepsPerBar = clampInt(transport.stepsPerBar ?? 4, 1, 32);
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
      notesOn: ui.showNotes !== false,
      infoOn: ui.showInfo !== false,
      loopOn: !!ui.loop
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

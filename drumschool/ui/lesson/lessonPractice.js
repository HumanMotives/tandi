// ui/lesson/lessonPractice.js

console.log("LESSON PRACTICE VERSION: sidebar+toggles restored", new Date().toISOString());

import { createMetronome } from "./modules/metronome.js";
import { createTransport } from "./modules/transport.js";
import { createTimeline } from "./modules/timeline.js";

export function mountLessonPractice({
  container,
  lesson, // REQUIRED: lesson JSON from /levels/Wx-Ly.json
  worldName = "Wereld",
  levelName = "Level",
  onExit = () => {},
  // Optional (if you later pass state/player):
  player = null
}) {
  if (!lesson || typeof lesson !== "object") {
    throw new Error("mountLessonPractice: lesson ontbreekt of is ongeldig.");
  }

  const cfg = normalizeLessonConfig(lesson);

  const root = document.createElement("div");
  root.className = "lessonPracticeScreen";
  container.appendChild(root);

  // Basic “player” placeholders (safe if null)
  const playerName = (player?.name || "").trim() || "Speler";
  const playerAvatar =
    player?.avatarSrc ||
    "./assets/img/avatar_placeholder.png"; // fallback (you can replace later)

  // Info text: prefer lesson.infoText, else editor fields if present
  const infoText =
    String(lesson.infoText || lesson.info || lesson.description || "").trim() ||
    "Tip: luister naar de metronoom en klap/tik mee op de bolletjes.";

  root.innerHTML = `    <div class="lpLayout">

      <!-- Sidebar -->
      <aside class="lpSidebar" aria-label="Player sidebar">
        <div class="lpSideCard">
          <div class="lpSideAvatarWrap">
            <img class="lpSideAvatar" src="${escapeHtml(playerAvatar)}" alt="Avatar" />
          </div>
          <div class="lpSideName">${escapeHtml(playerName)}</div>

          <div class="lpSideStats">
            <div class="lpStat">
              <div class="lpStatLabel">Stars</div>
              <div class="lpStatValue">${escapeHtml(String(player?.stars ?? "0"))}</div>
            </div>
            <div class="lpStat">
              <div class="lpStatLabel">Streak</div>
              <div class="lpStatValue">${escapeHtml(String(player?.streak ?? "0"))}</div>
            </div>
            <div class="lpStat">
              <div class="lpStatLabel">Rank</div>
              <div class="lpStatValue">${escapeHtml(String(player?.rank ?? "-"))}</div>
            </div>
          </div>

          <div class="lpSideAchievements" aria-label="Achievements (placeholder)">
            <div class="lpAchTitle">Achievements</div>
            <div class="lpAchRow">
              <span class="lpAchDot"></span>
              <span class="lpAchDot"></span>
              <span class="lpAchDot"></span>
              <span class="lpAchDot"></span>
              <span class="lpAchDot"></span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main -->
      <main class="lpMain">

        <!-- Top bar -->
        <div class="lpTopBar lpTopBarMock">
          <div class="lpTopLeft">
            <button class="btn btn--yellow lpTopBtn" type="button" data-stop>
              Stop de les
            </button>
          </div>

          <div class="lpTopRight">
            <button class="btn btn--red lpTopBtn" type="button" data-showtime disabled title="(v1) Examen komt later">
              Showtime!
            </button>
          </div>
        </div>

        <div class="lpDottedDivider" aria-hidden="true"></div>

        <!-- Lesson header above timeline -->
        <section class="lpLessonHeader lpLessonHeaderMock" aria-label="Lesson header">

          <div class="lpLessonMeta">
            <div class="lpWorld">${escapeHtml(worldName)}</div>
            <div class="lpLevel">${escapeHtml(levelName)}</div>
          </div>

          <!-- Keep readout for existing logic; hidden via CSS in mock style -->
          <div class="lpBarsReadout lpBarsReadoutHidden" aria-hidden="true">
            <span class="lpBarsNow" id="barReadout">0</span>
            <span class="lpBarsSep">/</span>
            <span class="lpBarsTotal">${escapeHtml(String(cfg.transport.bars))}</span>
            <span class="lpBarsLabel">bars</span>
          </div>

          <div class="lpHeaderActions">
            <button class="lpCoinBtn" type="button" data-practice title="Oefenen">
              <img class="lpCoinImg" src="/drumschool/assets/img/icons/ds_icon_play.png" alt="" draggable="false"/>
            </button>

            <button class="lpCircleToggle" type="button" data-toggle="info" aria-pressed="true" title="Info">
              <img src="/drumschool/assets/img/icons/ds_icon_info.png" alt="" draggable="false"/>
            </button>

            <button class="lpCircleToggle" type="button" data-toggle="notes" aria-pressed="${cfg.ui.showNotes ? "true" : "false"}" title="Noten geluid">
              <img src="/drumschool/assets/img/icons/ds_icon_musicnote.png" alt="" draggable="false"/>
            </button>

            <button class="lpCircleToggle" type="button" data-toggle="metro" aria-pressed="${cfg.ui.showMetronome ? "true" : "false"}" title="Geluid / Metronoom">
              <img src="/drumschool/assets/img/icons/ds_icon_sound.png" alt="" draggable="false"/>
            </button>

            <button class="lpCircleToggle lpCircleToggleLoop" type="button" data-toggle="loop" aria-pressed="${cfg.ui.loop ? "true" : "false"}" title="Loop">
              <img src="/drumschool/assets/img/icons/ds_icon_loop.png" alt="" draggable="false"/>
            </button>
          </div>
        </section>

        <!-- Controls panel (keep BPM + metronome quick toggle for v1) -->
        <section class="lpPanel" data-panel>
          <div class="lpRow" data-row="bpm">
            <div class="lpIcon">🎵</div>
            <div class="lpLabel">
              <span class="small">BPM</span>
              <span class="value" id="bpmValue">${String(cfg.transport.bpm)}</span>
            </div>
            <input id="bpmSlider" type="range" min="40" max="220" value="${String(cfg.transport.bpm)}" />
            <div class="lpTiny">${escapeHtml(cfg.transport.timeSig)}</div>
          </div>

          <div class="lpRow lpRowStatus" data-row="status" style="display:none;">
            <div class="lpIcon">💡</div>
            <div class="lpLabel">
              <span class="small">Status</span>
              <span class="value" id="statusText">Klaar maken...</span>
            </div>
          </div>
        </section>

        <!-- Timeline -->
        <section class="lpStage" aria-label="Timeline stage">
          <div id="timelineHost"></div>
        </section>

        <!-- Info panel -->
        <section class="lpInfoPanel" data-info-panel>
          <div class="lpInfoInner">
            <div class="lpInfoTitle">Uitleg</div>
            <div class="lpInfoText">${escapeHtml(infoText)}</div>
          </div>
        </section>

      </main>
    </div>`;

  // Elements
  const exitBtn = root.querySelector("[data-stop]");
  const practiceTopBtn = root.querySelector("[data-practice]");
  const showtimeBtn = root.querySelector("[data-showtime]");

  const bpmSlider = root.querySelector("#bpmSlider");
  const bpmValue = root.querySelector("#bpmValue");

  const barReadout = root.querySelector("#barReadout");
  const rowStatus = root.querySelector('[data-row="status"]');
  const statusText = root.querySelector("#statusText");

  const timelineHost = root.querySelector("#timelineHost");

  const infoPanel = root.querySelector("[data-info-panel]");
  const toggleInfoBtn = root.querySelector('[data-toggle="info"]');
  const toggleMetroBtn = root.querySelector('[data-toggle="metro"]');
  const toggleNotesBtn = root.querySelector('[data-toggle="notes"]');
  const toggleLoopBtn = root.querySelector('[data-toggle="loop"]');

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

  // State
  let isRunning = false;
  let uiInfoVisible = true;
  let uiNotesEnabled = cfg.ui.showNotes;
  let uiLoopEnabled = cfg.ui.loop;

  // Transport
  const transport = createTransport({
    bpm: cfg.transport.bpm,
    stepsPerBar: cfg.transport.stepsPerBar,
    bars: cfg.transport.bars,
    countInBars: 1,

    onStep: ({ barIndex, stepIndex, globalStepIndex, phase }) => {
      const inCountIn = phase === "countin";

      if (inCountIn) {
        showStatus(true, "Klaar maken...");
        barReadout.textContent = "0";

        forcedMetronomeTick({
          isBarStart: stepIndex === 0,
          stepIndex,
          stepsPerBar: cfg.transport.stepsPerBar
        });

        // During count-in we keep visuals calm
        return;
      }

      showStatus(false);

      // Single moving playhead preference:
      // If timeline supports a global playhead, use it.
      if (typeof timeline.setGlobalPlayhead === "function") {
        timeline.setGlobalPlayhead(globalStepIndex);
      } else if (typeof timeline.setGlobalStep === "function") {
        timeline.setGlobalStep(globalStepIndex);
      } else if (typeof timeline.setPlayhead === "function") {
        timeline.setPlayhead(barIndex, stepIndex);
      } else if (typeof timeline.setActiveStep === "function") {
        timeline.setActiveStep(barIndex, stepIndex);
      }

      // Metronome tick only if enabled
      if (metronome.getEnabled()) {
        metronome.tick({
          isBarStart: stepIndex === 0,
          isQuarter: isQuarterStep(stepIndex, cfg.transport.stepsPerBar)
        });
      }

      // Hit sound + pulse on hit (if enabled)
      if (uiNotesEnabled && timelineIsHit(timeline, barIndex, stepIndex)) {
        metronome.hitBlip?.();
        timelinePulse(timeline, barIndex, stepIndex);
      }

      const shownBar = Math.min(cfg.transport.bars, barIndex + 1);
      barReadout.textContent = String(shownBar);
    },

    onDone: () => {
      if (uiLoopEnabled) {
        stopPlayback(false);
        startPlayback();
        return;
      }
      stopPlayback();
    }
  });

  // Top bar actions
  exitBtn.addEventListener("click", () => {
    cleanup();
    onExit();
  });

  practiceTopBtn.addEventListener("click", async () => {
    await metronome.ensureStarted();
    if (!isRunning) startPlayback();
    else stopPlayback();
  });

  showtimeBtn.addEventListener("click", () => {
    // v1 placeholder: later you’ll do “exam” flow + unlock next level
    // leaving disabled for now
  });

  // Toggles
  toggleInfoBtn.addEventListener("click", () => {
    uiInfoVisible = !uiInfoVisible;
    setPressed(toggleInfoBtn, uiInfoVisible);
    infoPanel.style.display = uiInfoVisible ? "" : "none";
  });

  toggleMetroBtn.addEventListener("click", async () => {
    await metronome.ensureStarted();
    metronome.setEnabled(!metronome.getEnabled());
    setPressed(toggleMetroBtn, metronome.getEnabled());
  });

  toggleNotesBtn.addEventListener("click", () => {
    uiNotesEnabled = !uiNotesEnabled;
    setPressed(toggleNotesBtn, uiNotesEnabled);
  });

  toggleLoopBtn.addEventListener("click", () => {
    uiLoopEnabled = !uiLoopEnabled;
    setPressed(toggleLoopBtn, uiLoopEnabled);
  });

  // BPM
  bpmSlider.addEventListener("input", (e) => {
    const v = clampInt(e.target.value, 40, 220);
    bpmValue.textContent = String(v);
    transport.setBpm(v);
  });

  // Init UI state
  setPressed(toggleInfoBtn, uiInfoVisible);
  infoPanel.style.display = uiInfoVisible ? "" : "none";
  setPressed(toggleMetroBtn, metronome.getEnabled());
  setPressed(toggleNotesBtn, uiNotesEnabled);
  setPressed(toggleLoopBtn, uiLoopEnabled);

  // Start/stop label on top practice button
  syncPracticeButton();

  function syncPracticeButton() {
    // Visual-only: coin button keeps icon, just update label/pressed state
    practiceTopBtn.setAttribute("aria-pressed", isRunning ? "true" : "false");
    practiceTopBtn.setAttribute("title", isRunning ? "Stoppen" : "Oefenen");
    practiceTopBtn.classList.toggle("isRunning", !!isRunning);
  }

  function startPlayback() {
    if (isRunning) return;
    isRunning = true;

    syncPracticeButton();
    showStatus(true, "Klaar maken...");

    // reset visuals
    timelineReset(timeline);
    barReadout.textContent = "0";

    transport.start();
  }

  function stopPlayback(resetVisuals = true) {
    if (!isRunning) return;
    isRunning = false;

    transport.stop();
    syncPracticeButton();

    if (resetVisuals) {
      timelineReset(timeline);
      barReadout.textContent = "0";
    }

    showStatus(false);
  }

  function forcedMetronomeTick({ isBarStart, stepIndex, stepsPerBar }) {
    const wasEnabled = metronome.getEnabled();

    if (!wasEnabled) metronome.setEnabled(true);

    metronome.tick({
      isBarStart,
      isQuarter: isQuarterStep(stepIndex, stepsPerBar)
    });

    if (!wasEnabled) metronome.setEnabled(false);
  }

  function showStatus(visible, text = "") {
    if (!rowStatus) return;
    rowStatus.style.display = visible ? "" : "none";
    if (visible && statusText) statusText.textContent = text || "Klaar maken...";
  }

  function cleanup() {
    try {
      // stop without re-resetting twice
      if (isRunning) stopPlayback(true);
    } catch {}

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
      showMetronome: ui.showMetronome !== false,
      showBpm: ui.showBpm !== false,
      showNotes: ui.showNotes !== false,
      loop: !!ui.loop
    },
    transport: { bpm, bars, stepsPerBar, timeSig },
    patternBars
  };
}

function isQuarterStep(stepIndex, stepsPerBar) {
  // Beginner friendly:
  // stepsPerBar=4  => every step is a quarter
  // stepsPerBar=8  => 0,2,4,6
  // stepsPerBar=16 => 0,4,8,12
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

  // Fallback: set playhead “nowhere”
  if (typeof timeline.setPlayhead === "function") {
    timeline.setPlayhead(0, -1);
  } else if (typeof timeline.setActiveStep === "function") {
    timeline.setActiveStep(0, -1);
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

function setPressed(btn, pressed) {
  if (!btn) return;
  btn.setAttribute("aria-pressed", pressed ? "true" : "false");
  btn.classList.toggle("isOn", !!pressed);
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

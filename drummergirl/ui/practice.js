// practice.js
// Drum exercise screen

export function mountPractice({
  container,
  worldName = "Wereld",
  levelName = "Level",
  onExit = null,       // should navigate back to levels
  onEnter = null       // optional: called once when practice mounts (set route)
}) {
  if (typeof onEnter === "function") onEnter();

  const root = document.createElement("div");
  root.className = "practiceScreen";
  container.appendChild(root);

  root.innerHTML = `
    <div class="practiceApp">
      <div class="practiceHeader">
        <div class="practiceHeaderCenter">
          <h1 class="practiceWorldTitle">${escapeHtml(worldName)}</h1>
          <p class="practiceLevelTitle">${escapeHtml(levelName)}</p>
        </div>

        <div class="practiceStopWrap">
          <button class="btn ghost" type="button" data-stop>Stoppen</button>
        </div>
      </div>

      <div class="practicePanel">
        <div class="practiceRow">
          <div class="practiceIcon">🎵</div>
          <div class="practiceLabel">
            <span class="small">BPM:</span>
            <span class="value" id="bpmValue">120</span>
          </div>
          <input id="bpmSlider" type="range" min="50" max="200" value="120" />
          <button id="metroMuteBtn" class="practiceMuteBtn" title="Mute metronome">🔊</button>
        </div>

        <div class="practiceRow">
          <div class="practiceIcon">🥁</div>
          <div class="practiceLabel">
            <span class="small">HITS:</span>
            <span class="value"><span id="hitsValue">4</span>/<span>8</span></span>
          </div>
          <input id="hitsSlider" type="range" min="1" max="8" value="4" />
          <button id="hitsMuteBtn" class="practiceMuteBtn" title="Mute hits">🔊</button>
        </div>

        <div class="practiceRow" style="opacity:0.9;">
          <div class="practiceIcon">✋</div>
          <div class="practiceLabel">
            <span class="small">HANDS:</span>
            <span class="value" style="font-size:18px;">SHOW</span>
          </div>
          <input id="handsStrength" type="range" min="0" max="100" value="100" />
          <button id="handsToggleBtn" class="practiceMuteBtn" title="Toggle hands row">👀</button>
        </div>

        <div class="practiceActions">
          <button id="playBtn" class="btn primary" type="button">Play</button>
          <button id="stopBtn" class="btn" type="button" disabled>Stop</button>
        </div>
      </div>

      <div class="practiceStage">
        <div class="practiceSeqWrap">
          <div class="practiceLeftStack">
            <div class="practiceSequencer" id="sequencer">
              <div class="practiceLine"></div>
            </div>
            <div class="practiceHandRow hidden" id="handRow"></div>
          </div>

          <div class="practiceMultiplierWrap">
            <div class="practiceMultiplier" id="multiplier">
              <span id="barText">X0</span>
            </div>
            <div class="practiceSparkleLayer" id="sparkleLayer"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const stopPracticeBtn = root.querySelector("[data-stop]");

  const STEPS = 8;

  const sequencer = root.querySelector("#sequencer");
  const handRow = root.querySelector("#handRow");

  const multiplier = root.querySelector("#multiplier");
  const barText = root.querySelector("#barText");
  const sparkleLayer = root.querySelector("#sparkleLayer");

  const bpmSlider = root.querySelector("#bpmSlider");
  const bpmValue = root.querySelector("#bpmValue");

  const hitsSlider = root.querySelector("#hitsSlider");
  const hitsValue = root.querySelector("#hitsValue");

  const playBtn = root.querySelector("#playBtn");
  const stopBtn = root.querySelector("#stopBtn");

  const metroMuteBtn = root.querySelector("#metroMuteBtn");
  const hitsMuteBtn = root.querySelector("#hitsMuteBtn");

  const handsToggleBtn = root.querySelector("#handsToggleBtn");
  const handsStrength = root.querySelector("#handsStrength");

  // Audio created lazily (mobile friendly)
  let audioCtx = null;

  let metronomeMuted = false;
  let hitsMuted = false;

  let barStartFlip = false;

  function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function isQuarterStep(stepIndex) {
    return stepIndex === 0 || stepIndex === 2 || stepIndex === 4 || stepIndex === 6;
  }

  function metroTick(stepIndex, force = false) {
    if (metronomeMuted && !force) return;
    if (!isQuarterStep(stepIndex)) return;

    const ctx = ensureAudio();
    const isBarStart = stepIndex === 0;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";

    const barStartFreqA = 1600;
    const barStartFreqB = 1900;
    const quarterSoftFreq = 850;

    const freq = isBarStart ? (barStartFlip ? barStartFreqA : barStartFreqB) : quarterSoftFreq;
    osc.frequency.value = freq;

    const now = ctx.currentTime;
    const peak = isBarStart ? 0.22 : 0.09;
    const dur = isBarStart ? 0.055 : 0.045;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + dur + 0.01);
  }

  function hitTick() {
    if (hitsMuted) return;

    const ctx = ensureAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.value = 620;

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  function updateMuteButton(btn, muted) {
    btn.textContent = muted ? "🔇" : "🔊";
    btn.classList.toggle("isMuted", muted);
  }

  function euclidean(steps, pulses) {
    const pattern = new Array(steps).fill(0);
    for (let i = 0; i < steps; i++) {
      const v =
        Math.floor((i * pulses) / steps) !== Math.floor(((i - 1) * pulses) / steps);
      pattern[i] = v ? 1 : 0;
    }
    const count = pattern.reduce((a, b) => a + b, 0);
    if (count !== pulses) {
      pattern.fill(0);
      for (let k = 0; k < pulses; k++) pattern[k] = 1;
    }
    return pattern;
  }

  function handsAlternateFromR(hitsArr) {
    const hands = new Array(STEPS).fill(null);
    let next = "R";
    for (let i = 0; i < STEPS; i++) {
      if (hitsArr[i]) {
        hands[i] = next;
        next = next === "R" ? "L" : "R";
      }
    }
    return hands;
  }

  let stepEls = [];
  let currentHits = new Array(STEPS).fill(0);
  let currentHands = new Array(STEPS).fill(null);
  let currentStepIndex = -1;

  function setCurrentStep(i) {
    if (currentStepIndex >= 0 && stepEls[currentStepIndex]) {
      stepEls[currentStepIndex].classList.remove("current");
    }
    currentStepIndex = i;
    if (currentStepIndex >= 0 && stepEls[currentStepIndex]) {
      stepEls[currentStepIndex].classList.add("current");
    }
  }

  function popStep(i) {
    const el = stepEls[i];
    if (!el) return;
    if (!el.classList.contains("active")) return;

    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }

  function buildSequencer() {
    const keep = Array.from(sequencer.querySelectorAll(".practiceLine"));
    sequencer.innerHTML = "";
    keep.forEach((el) => sequencer.appendChild(el));

    stepEls = [];

    const pulses = Number(hitsSlider.value);
    currentHits = euclidean(STEPS, pulses);
    currentHands = handsAlternateFromR(currentHits);

    const width = sequencer.clientWidth;
    if (!width || width < 50) return;

    const leftPad = width * 0.05;
    const rightPad = width * 0.95;
    const usable = rightPad - leftPad;

    for (let i = 0; i < STEPS; i++) {
      const isActive = currentHits[i] === 1;
      const hand = currentHands[i];

      const step = document.createElement("div");
      step.classList.add("practiceStep");

      if (isActive) {
        step.classList.add("active");
        step.classList.add(hand === "R" ? "handR" : "handL");
      } else {
        step.classList.add("inactive");
      }

      const norm = i / STEPS;
      const x = leftPad + norm * usable;
      step.style.left = `${x}px`;

      sequencer.appendChild(step);
      stepEls.push(step);
    }

    buildHandRow();
    setCurrentStep(-1);
  }

  function buildHandRow() {
    handRow.innerHTML = "";

    for (let i = 0; i < STEPS; i++) {
      const cell = document.createElement("div");
      cell.classList.add("practiceHandCell");

      const isActive = currentHits[i] === 1;
      const h = currentHands[i];

      if (!isActive || !h) {
        cell.innerHTML = `<div style="height:22px;"></div><div style="height:30px;"></div>`;
      } else {
        cell.classList.add(h);
        cell.innerHTML = `<div>${h}</div><div class="handIcon">✋</div>`;
      }

      handRow.appendChild(cell);
    }

    const strength = Number(handsStrength.value) / 100;
    handRow.style.opacity = String(strength);
  }

  let handsVisible = false;
  function setHandsVisible(visible) {
    handsVisible = visible;
    handRow.classList.toggle("hidden", !visible);
  }

  function sparkleBurst() {
    multiplier.classList.remove("sparklePulse");
    void multiplier.offsetWidth;
    multiplier.classList.add("sparklePulse");

    const count = 18;
    for (let i = 0; i < count; i++) {
      const s = document.createElement("div");
      s.className = "practiceSpark";
      s.textContent = "⭐";

      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 70;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;

      s.style.setProperty("--dx", dx.toFixed(1) + "px");
      s.style.setProperty("--dy", dy.toFixed(1) + "px");
      s.style.fontSize = (18 + Math.random() * 14).toFixed(0) + "px";

      sparkleLayer.appendChild(s);
      setTimeout(() => s.remove(), 1000);
    }
  }

  // Playback
  let bpm = Number(bpmSlider.value);
  let isPlaying = false;
  let rafId = null;

  let barCount = 0;
  let grooveStartPerf = null;
  let lastStepCount = -1;
  let grooveStarted = false;

  let countInActive = false;
  let countInTimeouts = [];

  function beatMs() { return 60000 / bpm; }
  function barMs() { return beatMs() * 4; }
  function stepDurMs() { return barMs() / STEPS; }

  function updateBarText() {
    barText.textContent = `X${barCount}`;
  }

  function resetPlaybackState() {
    grooveStartPerf = null;
    lastStepCount = -1;
    grooveStarted = false;

    barCount = 0;
    updateBarText();
    setCurrentStep(-1);
  }

  function clearCountIn() {
    countInTimeouts.forEach((id) => clearTimeout(id));
    countInTimeouts = [];
    countInActive = false;
  }

  function scheduleCountInAndGrooveStart() {
    countInActive = true;

    const now = performance.now();
    const offset = 80;
    const start = now + offset;
    const ms = beatMs();

    clearCountIn();
    countInActive = true;

    for (let n = 0; n < 4; n++) {
      const tClick = start + n * ms;
      const delay = Math.max(0, tClick - performance.now());
      const id = setTimeout(() => {
        if (n === 0) metroTick(0, true);
        else metroTick(2, true);
      }, delay);
      countInTimeouts.push(id);
    }

    grooveStartPerf = start + 4 * ms;

    const doneDelay = Math.max(0, grooveStartPerf - performance.now());
    const doneId = setTimeout(() => { countInActive = false; }, doneDelay);
    countInTimeouts.push(doneId);
  }

  function triggerStep(stepIndex) {
    setCurrentStep(stepIndex);
    metroTick(stepIndex, false);

    if (currentHits[stepIndex] === 1) {
      popStep(stepIndex);
      hitTick();
    }
  }

  function frame(t) {
    if (!isPlaying) return;

    if (!grooveStarted) {
      if (grooveStartPerf !== null && t >= grooveStartPerf) {
        grooveStarted = true;
        lastStepCount = -1;

        triggerStep(0);
        lastStepCount = 0;
      }

      rafId = requestAnimationFrame(frame);
      return;
    }

    const elapsed = t - grooveStartPerf;
    const sDur = stepDurMs();
    const stepCount = Math.floor(elapsed / sDur);

    if (stepCount > lastStepCount) {
      for (let sc = lastStepCount + 1; sc <= stepCount; sc++) {
        const stepIndex = ((sc % STEPS) + STEPS) % STEPS;

        if (sc > 0 && sc % STEPS === 0) {
          barCount += 1;
          updateBarText();
          barStartFlip = !barStartFlip;
          if (barCount % 8 === 0) sparkleBurst();
        }

        if (sc === 0) continue;
        triggerStep(stepIndex);
      }
      lastStepCount = stepCount;
    }

    rafId = requestAnimationFrame(frame);
  }

  function setBpm(newBpm) { bpm = newBpm; }

  async function play() {
    if (isPlaying || countInActive) return;
    isPlaying = true;

    const ctx = ensureAudio();
    await ctx.resume();

    playBtn.disabled = true;
    stopBtn.disabled = false;

    resetPlaybackState();
    scheduleCountInAndGrooveStart();

    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    clearCountIn();

    isPlaying = false;

    playBtn.disabled = false;
    stopBtn.disabled = true;

    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;

    resetPlaybackState();
  }

  // UI wiring
  bpmValue.textContent = bpmSlider.value;
  hitsValue.textContent = hitsSlider.value;

  bpmSlider.addEventListener("input", (e) => {
    const val = Number(e.target.value);
    bpmValue.textContent = String(val);
    setBpm(val);
  });

  hitsSlider.addEventListener("input", (e) => {
    hitsValue.textContent = e.target.value;
    buildSequencer();
  });

  playBtn.addEventListener("click", play);
  stopBtn.addEventListener("click", stop);

  metroMuteBtn.addEventListener("click", () => {
    metronomeMuted = !metronomeMuted;
    updateMuteButton(metroMuteBtn, metronomeMuted);
  });

  hitsMuteBtn.addEventListener("click", () => {
    hitsMuted = !hitsMuted;
    updateMuteButton(hitsMuteBtn, hitsMuted);
  });

  handsToggleBtn.addEventListener("click", () => {
    setHandsVisible(!handsVisible);
  });

  handsStrength.addEventListener("input", buildHandRow);

  const onResize = () => buildSequencer();
  window.addEventListener("resize", onResize);

  stopPracticeBtn.addEventListener("click", () => {
    exitToLevels();
  });

  // Init
  updateMuteButton(metroMuteBtn, metronomeMuted);
  updateMuteButton(hitsMuteBtn, hitsMuted);
  setHandsVisible(false);

  buildSequencer();
  requestAnimationFrame(buildSequencer);

  function exitToLevels() {
    stop();

    // Preferred: your app handles navigation
    if (typeof onExit === "function") {
      onExit();
      return;
    }

    // Fallback: hash route to "levels" (update if your actual route name differs)
    window.location.hash = "#levels";
  }

  function unmount() {
    stop();
    window.removeEventListener("resize", onResize);

    try {
      if (audioCtx && audioCtx.state !== "closed") audioCtx.close();
    } catch {}

    root.remove();
  }

  return { unmount };
}

export default mountPractice;

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

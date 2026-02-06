// ui/lesson/modules/metronome.js

export function createMetronome({ enabled = true } = {}) {
  let _enabled = !!enabled;
  let ctx = null;

  function ensureCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  async function ensureStarted() {
    const c = ensureCtx();
    if (c.state === "suspended") {
      try {
        await c.resume();
      } catch {}
    }
  }

  function setEnabled(v) {
    _enabled = !!v;
  }

  function getEnabled() {
    return _enabled;
  }

  // What counts as a quarter depends on stepsPerBar:
  // - 4 steps => every step is quarter
  // - 8 steps => 0,2,4,6
  // - 16 steps => 0,4,8,12
  function isQuarterStep(stepIndex, stepsPerBar) {
    const spb = Math.max(1, Number(stepsPerBar) || 4);
    const i = Math.max(0, Number(stepIndex) || 0);

    if (spb <= 4) return true;

    if (spb % 4 === 0) {
      const stride = spb / 4;
      return i % stride === 0;
    }

    // odd grids fallback (keeps usable for future 6/8 etc)
    const t = (i / spb) * 4;
    return Math.abs(t - Math.round(t)) < 0.0001;
  }

  /**
   * tick()
   * Preferred: tick({ stepIndex, stepsPerBar, isBarStart, force })
   * Legacy:    tick({ isQuarter, isBarStart, force })
   */
  function tick({
    isBarStart = false,
    isQuarter = null,      // if boolean => legacy
    stepIndex = null,      // if provided => compute quarter from grid
    stepsPerBar = 4,
    force = false
  } = {}) {
    if (!_enabled && !force) return;

    let quarter = false;

    if (typeof isQuarter === "boolean") {
      quarter = isQuarter;
    } else if (stepIndex !== null && stepIndex !== undefined) {
      quarter = isQuarterStep(stepIndex, stepsPerBar);
    } else {
      // safest default: tick (beginner friendly)
      quarter = true;
    }

    if (!quarter) return;

    const c = ensureCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = "square";

    const barStartFreqA = 1600;
    const barStartFreqB = 1900;
    const quarterSoftFreq = 850;

    const freq = isBarStart
      ? (Math.random() > 0.5 ? barStartFreqA : barStartFreqB)
      : quarterSoftFreq;

    osc.frequency.value = freq;

    const now = c.currentTime;
    const peak = isBarStart ? 0.20 : 0.08;
    const dur = isBarStart ? 0.055 : 0.045;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    gain.connect(c.destination);

    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  // Optional: tiny hit blip (cue for "drum hit")
  function hitBlip() {
    const c = ensureCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = "triangle";
    osc.frequency.value = 620;

    const now = c.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    osc.connect(gain);
    gain.connect(c.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  function destroy() {
    try {
      if (ctx && ctx.state !== "closed") ctx.close();
    } catch {}
    ctx = null;
  }

  return {
    ensureStarted,
    setEnabled,
    getEnabled,
    tick,
    hitBlip,
    destroy
  };
}

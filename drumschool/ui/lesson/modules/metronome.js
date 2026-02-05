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

  // ✅ Central truth: what counts as a quarter note depends on stepsPerBar.
  // - 4  steps => every step is a quarter
  // - 8  steps => every 2 steps is a quarter (0,2,4,6)
  // - 16 steps => every 4 steps is a quarter (0,4,8,12)
  function isQuarterStep(stepIndex, stepsPerBar) {
    const spb = Math.max(1, Number(stepsPerBar) || 4);
    const i = Math.max(0, Number(stepIndex) || 0);

    if (spb <= 4) return true;

    // If spb is divisible by 4, quarters are evenly spaced.
    if (spb % 4 === 0) {
      const quarterStride = spb / 4;
      return i % quarterStride === 0;
    }

    // Fallback for odd grids: approximate 4 quarters over the bar.
    // (Keeps it usable if you ever do 6/8 etc.)
    const t = (i / spb) * 4;
    return Math.abs(t - Math.round(t)) < 0.0001;
  }

  /**
   * tick()
   * Preferred call signature from transport:
   * tick({ stepIndex, stepsPerBar, isBarStart })
   *
   * Backward compatible:
   * tick({ isBarStart, isQuarter })
   */
  function tick({
    isBarStart = false,
    isQuarter = null,
    stepIndex = null,
    stepsPerBar = 4
  } = {}) {
    if (!_enabled) return;

    // ✅ Determine quarter-ness
    let quarter = false;

    if (typeof isQuarter === "boolean") {
      // old behavior
      quarter = isQuarter;
    } else if (stepIndex !== null && stepIndex !== undefined) {
      quarter = isQuarterStep(stepIndex, stepsPerBar);
    } else {
      // safest default: tick (so beginners hear something)
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
    const peak = isBarStart ? 0.2 : 0.08;
    const dur = isBarStart ? 0.055 : 0.045;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    gain.connect(c.destination);

    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  // Optional: tiny hit blip (so kids horen een "drum hit" cue)
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

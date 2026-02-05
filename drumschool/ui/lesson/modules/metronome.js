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
      try { await c.resume(); } catch {}
    }
  }

  function setEnabled(v) {
    _enabled = !!v;
  }

  function getEnabled() {
    return _enabled;
  }

  function tick({ isBarStart = false, isQuarter = false } = {}) {
    if (!_enabled) return;
    if (!isQuarter) return;

    const c = ensureCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = "square";

    const barStartFreqA = 1600;
    const barStartFreqB = 1900;
    const quarterSoftFreq = 850;

    const freq = isBarStart ? (Math.random() > 0.5 ? barStartFreqA : barStartFreqB) : quarterSoftFreq;
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

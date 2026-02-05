// ui/lesson/modules/transport.js

export function createTransport({
  bpm = 90,
  stepsPerBar = 4,
  bars = 1,
  beatsPerBar = 4, // voorbereidend; nu default 4/4
  onStep = () => {},
  onDone = () => {}
} = {}) {
  let _bpm = Number(bpm) || 90;
  let _stepsPerBar = Math.max(1, Number(stepsPerBar) || 4);
  let _bars = Math.max(1, Number(bars) || 1);
  let _beatsPerBar = Math.max(1, Number(beatsPerBar) || 4);

  let isPlaying = false;
  let rafId = null;

  // performance.now() time when timeline started
  let startPerf = null;

  // total step counter since start (0..totalSteps-1)
  let lastStep = -1;

  function beatMs() {
    return 60000 / _bpm;
  }

  function barMs() {
    // still fixed to beatsPerBar (so later you can do 3/4 etc)
    return beatMs() * _beatsPerBar;
  }

  function stepMs() {
    return barMs() / _stepsPerBar;
  }

  function totalSteps() {
    return _bars * _stepsPerBar;
  }

  function start() {
    if (isPlaying) return;
    isPlaying = true;

    startPerf = performance.now();
    lastStep = -1;

    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    isPlaying = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;

    startPerf = null;
    lastStep = -1;
  }

  function frame(t) {
    if (!isPlaying || startPerf == null) return;

    const elapsed = t - startPerf;
    const sMs = stepMs();

    // Which step are we at now?
    const stepCount = Math.floor(elapsed / sMs);

    if (stepCount > lastStep) {
      for (let sc = lastStep + 1; sc <= stepCount; sc++) {
        const max = totalSteps();

        if (sc >= max) {
          stop();
          onDone();
          return;
        }

        const barIndex = Math.floor(sc / _stepsPerBar);
        const stepIndex = sc % _stepsPerBar;
        const isBarStart = stepIndex === 0;

        onStep({
          barIndex,
          stepIndex,
          globalStepIndex: sc,
          stepsPerBar: _stepsPerBar,
          bars: _bars,
          bpm: _bpm,
          isBarStart
        });
      }
      lastStep = stepCount;
    }

    rafId = requestAnimationFrame(frame);
  }

  // ✅ Keep phase stable when BPM changes (no jump back to step 0)
  function setBpm(nextBpm) {
    const nb = Number(nextBpm);
    if (!Number.isFinite(nb) || nb <= 0) return;

    if (!isPlaying || startPerf == null) {
      _bpm = nb;
      return;
    }

    // Compute current elapsed in old tempo
    const now = performance.now();
    const elapsedOld = now - startPerf;

    // Determine fractional step position (old)
    const oldStepMs = stepMs();
    const stepPos = elapsedOld / oldStepMs; // e.g. 3.42 steps in

    // Update BPM
    _bpm = nb;

    // Recompute startPerf so that stepPos remains identical under new stepMs
    const newStepMs = stepMs();
    const elapsedNew = stepPos * newStepMs;
    startPerf = now - elapsedNew;

    // lastStep stays the same so we don't double-fire steps
  }

  function setStepsPerBar(nextSteps) {
    const ns = Math.max(1, Number(nextSteps) || 4);

    if (!isPlaying || startPerf == null) {
      _stepsPerBar = ns;
      return;
    }

    // Similar phase-preserving update:
    const now = performance.now();
    const elapsedOld = now - startPerf;

    const oldStepMs = stepMs();
    const stepPos = elapsedOld / oldStepMs;

    _stepsPerBar = ns;

    const newStepMs = stepMs();
    const elapsedNew = stepPos * newStepMs;
    startPerf = now - elapsedNew;

    // Recompute lastStep based on new grid to avoid skipping or repeating wildly:
    lastStep = Math.floor(stepPos) - 1;
    if (lastStep < -1) lastStep = -1;
  }

  function setBars(nextBars) {
    _bars = Math.max(1, Number(nextBars) || 1);
  }

  function setTimeSignature({ beatsPerBar } = {}) {
    const bpb = Math.max(1, Number(beatsPerBar) || 4);
    if (!isPlaying || startPerf == null) {
      _beatsPerBar = bpb;
      return;
    }

    // phase preserve
    const now = performance.now();
    const elapsedOld = now - startPerf;

    const oldStepMs = stepMs();
    const stepPos = elapsedOld / oldStepMs;

    _beatsPerBar = bpb;

    const newStepMs = stepMs();
    const elapsedNew = stepPos * newStepMs;
    startPerf = now - elapsedNew;

    lastStep = Math.floor(stepPos) - 1;
    if (lastStep < -1) lastStep = -1;
  }

  function getState() {
    return {
      bpm: _bpm,
      stepsPerBar: _stepsPerBar,
      bars: _bars,
      beatsPerBar: _beatsPerBar,
      isPlaying
    };
  }

  function destroy() {
    stop();
  }

  return {
    start,
    stop,
    setBpm,
    setStepsPerBar,
    setBars,
    setTimeSignature,
    getState,
    destroy
  };
}

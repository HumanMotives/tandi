// ui/lesson/modules/transport.js
export function createTransport({
  bpm = 90,
  stepsPerBar = 4,     // 4, 8, 16...
  beatsPerBar = 4,     // usually 4 for 4/4
  bars = 1,
  onStep = () => {},
  onDone = () => {}
}) {
  let _bpm = Number(bpm) || 90;
  let _stepsPerBar = Math.max(1, Math.round(Number(stepsPerBar) || 4));
  let _beatsPerBar = Math.max(1, Math.round(Number(beatsPerBar) || 4));
  let _bars = Math.max(1, Math.round(Number(bars) || 1));

  let isPlaying = false;
  let rafId = null;

  let startPerf = null;
  let lastStep = -1;

  function beatMs() {
    return 60000 / _bpm;
  }

  function barMs() {
    return beatMs() * _beatsPerBar;
  }

  function stepMs() {
    return barMs() / _stepsPerBar;
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
    if (!isPlaying) return;

    const elapsed = t - startPerf;
    const sMs = stepMs();
    const stepCount = Math.floor(elapsed / sMs);

    if (stepCount > lastStep) {
      for (let sc = lastStep + 1; sc <= stepCount; sc++) {
        const totalSteps = _bars * _stepsPerBar;
        if (sc >= totalSteps) {
          stop();
          onDone();
          return;
        }

        const barIndex = Math.floor(sc / _stepsPerBar);
        const stepIndex = sc % _stepsPerBar;

        onStep({
          barIndex,
          stepIndex,
          globalStepIndex: sc,
          stepsPerBar: _stepsPerBar,
          beatsPerBar: _beatsPerBar
        });
      }
      lastStep = stepCount;
    }

    rafId = requestAnimationFrame(frame);
  }

  function setBpm(nextBpm) {
    const n = Math.max(30, Math.min(260, Math.round(Number(nextBpm) || _bpm)));
    _bpm = n;

    // simplest stable behavior for now: restart if playing
    if (isPlaying) {
      stop();
      start();
    }
  }

  function destroy() {
    stop();
  }

  return {
    start,
    stop,
    setBpm,
    destroy
  };
}

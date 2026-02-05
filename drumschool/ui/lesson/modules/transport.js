// ui/lesson/modules/transport.js

export function createTransport({
  bpm = 90,
  stepsPerBar = 8,
  bars = 4,
  onStep = () => {},
  onDone = () => {}
}) {
  let _bpm = bpm;
  let _stepsPerBar = stepsPerBar;
  let _bars = bars;

  let isPlaying = false;
  let rafId = null;

  let startPerf = null;
  let lastStep = -1;

  function beatMs() {
    return 60000 / _bpm;
  }

  function barMs() {
    return beatMs() * 4; // 4/4 fixed for now
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
          globalStepIndex: sc
        });
      }
      lastStep = stepCount;
    }

    rafId = requestAnimationFrame(frame);
  }

  function setBpm(nextBpm) {
    _bpm = nextBpm;
    // keep phase stable: restart with same visual reset
    if (isPlaying) {
      // simplest robust: restart transport at current moment
      const wasPlaying = isPlaying;
      stop();
      if (wasPlaying) start();
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

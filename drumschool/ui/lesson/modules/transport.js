// ui/lesson/modules/transport.js

export function createTransport({
  bpm = 90,
  stepsPerBar = 4,     // 4 = kwartnoten, 8 = 8sten, 16 = 16den
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
    return 60000 / _bpm; // kwartnoot
  }

  function barMs() {
    return beatMs() * 4; // 4/4 basis
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
          stepsPerBar: _stepsPerBar
        });
      }
      lastStep = stepCount;
    }

    rafId = requestAnimationFrame(frame);
  }

  function setBpm(nextBpm) {
    _bpm = Number(nextBpm) || _bpm;
    if (isPlaying) {
      // simpel en stabiel: restart
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

// ui/lesson/modules/transport.js

export function createTransport({
  bpm = 90,
  stepsPerBar = 4,
  bars = 4,
  countInBars = 1, // ALWAYS count-in (default 1 bar = 4 beats)
  onStep = () => {},
  onDone = () => {}
}) {
  let _bpm = bpm;
  let _stepsPerBar = stepsPerBar;
  let _bars = bars;
  let _countInBars = countInBars;

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

  function totalStepsMain() {
    return _bars * _stepsPerBar;
  }

  function totalStepsCountIn() {
    return Math.max(0, _countInBars) * _stepsPerBar;
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
        const countInSteps = totalStepsCountIn();
        const mainSteps = totalStepsMain();

        // Phase: count-in first
        if (sc < countInSteps) {
          const barIndex = Math.floor(sc / _stepsPerBar);
          const stepIndex = sc % _stepsPerBar;

          onStep({
            phase: "countin",
            barIndex,
            stepIndex,
            stepsPerBar: _stepsPerBar,
            globalStepIndex: sc
          });
          continue;
        }

        // Main lesson after count-in
        const mainIndex = sc - countInSteps;

        if (mainIndex >= mainSteps) {
          stop();
          onDone();
          return;
        }

        const barIndex = Math.floor(mainIndex / _stepsPerBar);
        const stepIndex = mainIndex % _stepsPerBar;

        onStep({
          phase: "lesson",
          barIndex,
          stepIndex,
          stepsPerBar: _stepsPerBar,
          globalStepIndex: mainIndex
        });
      }

      lastStep = stepCount;
    }

    rafId = requestAnimationFrame(frame);
  }

  function setBpm(nextBpm) {
    _bpm = nextBpm;
    if (isPlaying) {
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

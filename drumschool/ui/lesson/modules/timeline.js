// ui/lesson/modules/timeline.js

export function createTimeline({
  container,
  stepsPerBar,
  bars,
  patternBars = []
}) {
  if (!container) {
    throw new Error("createTimeline: container ontbreekt");
  }

  const root = document.createElement("div");
  root.className = "timeline";
  container.appendChild(root);

  const stepEls = []; // [bar][step]
  const barEls = [];

  // Build DOM
  for (let b = 0; b < bars; b++) {
    const barEl = document.createElement("div");
    barEl.className = "timelineBar";

    // IMPORTANT: match grid to the lesson (4, 8, 16, ...)
    // (CSS provides default grid; this overrides it per lesson)
    barEl.style.gridTemplateColumns = `repeat(${stepsPerBar}, minmax(0, 1fr))`;

    // Arrow indicator that jumps to the currently active bar
    const arrowEl = document.createElement("div");
    arrowEl.className = "timelineArrow";
    arrowEl.setAttribute("aria-hidden", "true");
    barEl.appendChild(arrowEl);

    stepEls[b] = [];

    for (let s = 0; s < stepsPerBar; s++) {
      const step = document.createElement("div");
      step.className = "timelineStep";

      if (patternBars[b]?.hits?.has(s)) {
        step.classList.add("isHit");
      } else {
        step.classList.add("isEmpty");
      }

      barEl.appendChild(step);
      stepEls[b][s] = step;
    }

    root.appendChild(barEl);
    barEls[b] = barEl;
  }

  let current = { bar: -1, step: -1 };

  function clearCurrent() {
    if (
      current.bar >= 0 &&
      stepEls[current.bar]?.[current.step]
    ) {
      stepEls[current.bar][current.step].classList.remove("isCurrent");
    }
  }

  function setPlayhead(barIndex, stepIndex) {
    clearCurrent();

    // Mark active bar (for arrow indicator)
    for (let b = 0; b < barEls.length; b++) {
      barEls[b]?.classList.toggle("isActiveBar", b === barIndex);
    }

    const step = stepEls[barIndex]?.[stepIndex];
    if (!step) return;

    step.classList.add("isCurrent");
    current = { bar: barIndex, step: stepIndex };
  }

  function resetPlayhead() {
    clearCurrent();
    for (let b = 0; b < barEls.length; b++) {
      barEls[b]?.classList.remove("isActiveBar");
    }
    current = { bar: -1, step: -1 };
  }

  function isHit(barIndex, stepIndex) {
    return patternBars[barIndex]?.hits?.has(stepIndex) === true;
  }

  function pulseStep(barIndex, stepIndex) {
    const step = stepEls[barIndex]?.[stepIndex];
    if (!step) return;

    step.classList.remove("pulse");
    void step.offsetWidth;
    step.classList.add("pulse");
  }

  function destroy() {
    root.remove();
  }

  function getBarEl(index) {
    return barEls[index] || null;
  }

  return {
    setPlayhead,
    resetPlayhead,
    isHit,
    pulseStep,
    getBarEl,
    destroy
  };
}

// ui/lesson/modules/timeline.js

export function createTimeline({
  container,
  stepsPerBar = 8,
  bars = 4,
  patternBars = [] // array length bars: { hits:Set<number> }
}) {
  const root = document.createElement("div");
  root.className = "tlRoot";
  container.appendChild(root);

  // Build DOM
  const barEls = [];
  const stepEls = []; // [bar][step] => element

  for (let b = 0; b < bars; b++) {
    const bar = document.createElement("div");
    bar.className = "tlBar";

    const label = document.createElement("div");
    label.className = "tlBarLabel";
    label.textContent = `Bar ${b + 1}`;

    const track = document.createElement("div");
    track.className = "tlTrack";

    const line = document.createElement("div");
    line.className = "tlLine";
    track.appendChild(line);

    const stepRow = [];
    for (let s = 0; s < stepsPerBar; s++) {
      const dot = document.createElement("div");
      dot.className = "tlStep";

      const isHit = !!patternBars[b]?.hits?.has(s);
      dot.classList.toggle("isHit", isHit);

      // position by CSS grid, no absolute math needed
      track.appendChild(dot);
      stepRow.push(dot);
    }

    bar.appendChild(label);
    bar.appendChild(track);

    root.appendChild(bar);
    barEls.push(bar);
    stepEls.push(stepRow);
  }

  let current = { bar: -1, step: -1 };

  function setPlayhead(barIndex, stepIndex) {
    // clear old
    if (current.bar >= 0 && current.step >= 0) {
      const prev = stepEls[current.bar]?.[current.step];
      if (prev) prev.classList.remove("isCurrent");
    }

    current = { bar: barIndex, step: stepIndex };

    const next = stepEls[barIndex]?.[stepIndex];
    if (next) next.classList.add("isCurrent");
  }

  function resetPlayhead() {
    if (current.bar >= 0 && current.step >= 0) {
      const prev = stepEls[current.bar]?.[current.step];
      if (prev) prev.classList.remove("isCurrent");
    }
    current = { bar: -1, step: -1 };
  }

  function isHit(barIndex, stepIndex) {
    return !!patternBars[barIndex]?.hits?.has(stepIndex);
  }

  function pulseStep(barIndex, stepIndex) {
    const el = stepEls[barIndex]?.[stepIndex];
    if (!el) return;
    el.classList.remove("isPulse");
    void el.offsetWidth;
    el.classList.add("isPulse");
  }

  function destroy() {
    root.remove();
  }

  return {
    setPlayhead,
    resetPlayhead,
    isHit,
    pulseStep,
    destroy
  };
}

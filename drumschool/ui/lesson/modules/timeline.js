// ui/lesson/modules/timeline.js

export function createTimeline({
  container,
  stepsPerBar = 4,
  bars = 4,
  patternBars = []
}) {
  if (!container) throw new Error("createTimeline: container ontbreekt.");

  let _stepsPerBar = stepsPerBar;
  let _bars = bars;

  const root = document.createElement("div");
  root.className = "tlRoot";
  container.appendChild(root);

  // One global playhead (overlay)
  const playhead = document.createElement("div");
  playhead.className = "tlPlayheadGlobal";
  root.appendChild(playhead);

  function normX(i) {
    if (_stepsPerBar <= 1) return 0;
    return i / (_stepsPerBar - 1);
  }

  function render() {
    // Keep playhead node, clear the rest
    const keep = playhead;
    root.innerHTML = "";
    root.appendChild(keep);

    for (let b = 0; b < _bars; b++) {
      const bar = document.createElement("div");
      bar.className = "tlBar";

      const label = document.createElement("div");
      label.className = "tlBarLabel";
      label.textContent = String(b + 1);

      const lane = document.createElement("div");
      lane.className = "tlLane";

      const line = document.createElement("div");
      line.className = "tlLine";
      lane.appendChild(line);

      const hits = patternBars[b]?.hits || new Set();

      for (let i = 0; i < _stepsPerBar; i++) {
        const dot = document.createElement("div");
        dot.className = "tlDot";
        dot.style.left = `${normX(i) * 100}%`;
        if (hits.has(i)) dot.classList.add("isHit");
        lane.appendChild(dot);
      }

      bar.appendChild(label);
      bar.appendChild(lane);
      root.appendChild(bar);
    }

    resetPlayhead();
  }

  function isHit(barIndex, stepIndex) {
    const hits = patternBars?.[barIndex]?.hits;
    return !!hits && hits.has(stepIndex);
  }

  function setPlayhead(barIndex, stepIndex) {
    const barsEls = root.querySelectorAll(".tlBar");
    barsEls.forEach((barEl, idx) => {
      barEl.classList.toggle("isActive", idx === barIndex);
    });

    const barEl = barsEls[barIndex];
    if (!barEl) return;

    const lane = barEl.querySelector(".tlLane");
    if (!lane) return;

    const laneRect = lane.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();

    const xPct = normX(stepIndex);
    const xPx = xPct * laneRect.width;

    // place playhead inside root overlay coordinates
    const left = (laneRect.left - rootRect.left) + xPx;
    const top = (laneRect.top - rootRect.top);

    playhead.style.display = "block";
    playhead.style.left = `${left}px`;
    playhead.style.top = `${top}px`;
    playhead.style.height = `${laneRect.height}px`;
  }

  function resetPlayhead() {
    root.querySelectorAll(".tlBar").forEach((b) => b.classList.remove("isActive"));
    playhead.style.display = "none";
    playhead.style.left = "0px";
    playhead.style.top = "0px";
    playhead.style.height = "0px";
  }

  function pulseStep(barIndex, stepIndex) {
    const barEls = root.querySelectorAll(".tlBar");
    const barEl = barEls[barIndex];
    if (!barEl) return;

    const dots = barEl.querySelectorAll(".tlDot");
    const dot = dots[stepIndex];
    if (!dot) return;

    dot.classList.remove("pulse");
    void dot.offsetWidth;
    dot.classList.add("pulse");
  }

  function destroy() {
    root.remove();
  }

  render();

  return {
    setPlayhead,
    resetPlayhead,
    pulseStep,
    isHit,
    destroy
  };
}

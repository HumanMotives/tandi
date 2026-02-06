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

  function normX(i) {
    if (_stepsPerBar <= 1) return 0;
    return i / (_stepsPerBar - 1);
  }

  function render() {
    root.innerHTML = "";

    for (let b = 0; b < _bars; b++) {
      const bar = document.createElement("div");
      bar.className = "tlBar";

      const label = document.createElement("div");
      label.className = "tlBarLabel";
      label.textContent = `Bar ${b + 1}`;

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

      const playhead = document.createElement("div");
      playhead.className = "tlPlayhead";
      playhead.style.left = "0%";
      lane.appendChild(playhead);

      bar.appendChild(label);
      bar.appendChild(lane);
      root.appendChild(bar);
    }
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

    const ph = barEl.querySelector(".tlPlayhead");
    if (!ph) return;

    ph.style.left = `${normX(stepIndex) * 100}%`;
  }

  function resetPlayhead() {
    root.querySelectorAll(".tlPlayhead").forEach((ph) => (ph.style.left = "0%"));
    root.querySelectorAll(".tlBar").forEach((b) => b.classList.remove("isActive"));
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

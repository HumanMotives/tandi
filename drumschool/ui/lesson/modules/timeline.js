// ui/lesson/modules/timeline.js
export function createTimeline({
  container,
  stepsPerBar = 4,
  bars = 1,
  patternBars = [] // [{hits:Set<number>}, ...] length = bars
}) {
  if (!container) throw new Error("createTimeline: container ontbreekt");

  const root = document.createElement("div");
  root.className = "tlRoot";
  container.appendChild(root);

  const safeBars = Math.max(1, Number(bars) || 1);
  const safeSteps = Math.max(1, Number(stepsPerBar) || 4);

  // Build structure
  root.innerHTML = `
    <div class="tlBars">
      ${Array.from({ length: safeBars })
        .map((_, b) => renderBar(b))
        .join("")}
    </div>
  `;

  function renderBar(barIndex) {
    return `
      <div class="tlBar" data-bar="${barIndex}">
        <div class="tlLine"></div>
        ${Array.from({ length: safeSteps })
          .map((_, s) => `<div class="tlStep tlInactive" data-step="${s}" style="left:${(s / safeSteps) * 100}%"></div>`)
          .join("")}
      </div>
    `;
  }

  const barEls = Array.from(root.querySelectorAll(".tlBar"));

  // Apply hits
  for (let b = 0; b < safeBars; b++) {
    const hits = patternBars?.[b]?.hits;
    if (!hits || !(hits instanceof Set)) continue;
    const barEl = barEls[b];
    if (!barEl) continue;

    hits.forEach((stepIndex) => {
      const s = Number(stepIndex);
      if (!Number.isFinite(s)) return;
      if (s < 0 || s >= safeSteps) return;

      const stepEl = barEl.querySelector(`.tlStep[data-step="${s}"]`);
      if (stepEl) {
        stepEl.classList.remove("tlInactive");
        stepEl.classList.add("tlActive");
      }
    });
  }

  let current = { barIndex: -1, stepIndex: -1 };

  function setPlayhead(barIndex, stepIndex) {
    // remove previous
    if (current.barIndex >= 0) {
      const prevBar = barEls[current.barIndex];
      const prevStep = prevBar?.querySelector(`.tlStep[data-step="${current.stepIndex}"]`);
      prevStep?.classList.remove("tlCurrent");
    }

    current = { barIndex, stepIndex };
    const barEl = barEls[barIndex];
    const stepEl = barEl?.querySelector(`.tlStep[data-step="${stepIndex}"]`);
    stepEl?.classList.add("tlCurrent");
  }

  function resetPlayhead() {
    if (current.barIndex >= 0) {
      const prevBar = barEls[current.barIndex];
      const prevStep = prevBar?.querySelector(`.tlStep[data-step="${current.stepIndex}"]`);
      prevStep?.classList.remove("tlCurrent");
    }
    current = { barIndex: -1, stepIndex: -1 };
  }

  function isHit(barIndex, stepIndex) {
    const hits = patternBars?.[barIndex]?.hits;
    if (!(hits instanceof Set)) return false;
    return hits.has(stepIndex);
  }

  function pulseStep(barIndex, stepIndex) {
    const barEl = barEls[barIndex];
    const stepEl = barEl?.querySelector(`.tlStep[data-step="${stepIndex}"]`);
    if (!stepEl) return;

    stepEl.classList.remove("tlPop");
    void stepEl.offsetWidth;
    stepEl.classList.add("tlPop");
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

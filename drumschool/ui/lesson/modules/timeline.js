// ui/lesson/modules/timeline.js
import { getStepsPerBar, getBars, normalizeHits } from "../lessonConfig.js";

/**
 * createTimeline()
 * Expected by lessonPractice.js
 * Returns an object with:
 * - el: root element
 * - stepsPerBar
 * - setCurrent(stepIndex, barIndex) (optional highlight hook)
 * - destroy()
 */
export function createTimeline({ lesson }) {
  const stepsPerBar = getStepsPerBar(lesson);
  const bars = getBars(lesson);

  const el = document.createElement("div");
  el.className = "dsTimeline";

  el.innerHTML = `
    <div class="dsBars">
      ${bars.map((_, idx) => renderBarShell(idx + 1)).join("")}
    </div>
  `;

  const barEls = Array.from(el.querySelectorAll("[data-bar]"));

  barEls.forEach((barEl, barIndex) => {
    const barData = bars[barIndex] || {};
    const hitsRaw =
      barData.hits ||
      barData.steps ||
      barData.pattern ||
      barData.notes ||
      [];

    const hits = normalizeHits(hitsRaw, stepsPerBar);

    const dotsEl = barEl.querySelector(".dsDots");
    dotsEl.innerHTML = renderDots(hits);

    // store references for highlighting
    barEl._dotEls = Array.from(dotsEl.querySelectorAll(".dsDot"));
  });

  function setCurrent(stepIndex, barIndex) {
    // Clear previous highlights
    barEls.forEach((b) => {
      const dots = b._dotEls || [];
      dots.forEach((d) => d.classList.remove("isCurrent"));
    });

    // Apply current highlight if valid
    const b = barEls[barIndex];
    if (!b) return;

    const dots = b._dotEls || [];
    const d = dots[stepIndex];
    if (d) d.classList.add("isCurrent");
  }

  function destroy() {
    el.remove();
  }

  return { el, stepsPerBar, setCurrent, destroy };
}

function renderBarShell(labelNum) {
  return `
    <div class="dsBar" data-bar>
      <div class="dsBarLabel">Bar ${labelNum}</div>
      <div class="dsTrack">
        <div class="dsTrackLine"></div>
        <div class="dsDots"></div>
      </div>
    </div>
  `;
}

function renderDots(hits) {
  return hits
    .map((isOn) => `<div class="dsDot ${isOn ? "isOn" : "isOff"}"></div>`)
    .join("");
}

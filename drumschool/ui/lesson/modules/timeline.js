// ui/lesson/components/timeline.js
import { getStepsPerBar, getBars, normalizeHits } from "../lessonConfig.js";

export function mountTimeline({
  container,
  lesson,
  onReady = () => {}
}) {
  const stepsPerBar = getStepsPerBar(lesson);
  const bars = getBars(lesson);

  const root = document.createElement("div");
  root.className = "dsTimeline";
  container.appendChild(root);

  // Build UI
  root.innerHTML = `
    <div class="dsBars">
      ${bars.map((_, idx) => renderBarShell(idx + 1)).join("")}
    </div>
  `;

  // Fill each bar with dots based on stepsPerBar + active notes
  const barEls = Array.from(root.querySelectorAll("[data-bar]"));

  barEls.forEach((barEl, barIndex) => {
    const barData = bars[barIndex] || {};
    const hitsRaw =
      barData.hits ||
      barData.steps ||
      barData.pattern ||
      barData.notes ||
      [];

    const hits = normalizeHits(hitsRaw, stepsPerBar);
    barEl.querySelector(".dsDots").innerHTML = renderDots(hits);
  });

  onReady({ stepsPerBar });

  function unmount() {
    root.remove();
  }

  return { unmount, stepsPerBar };
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
  // Each entry is exactly one grid position.
  return hits
    .map((isOn) => {
      return `<div class="dsDot ${isOn ? "isOn" : "isOff"}"></div>`;
    })
    .join("");
}

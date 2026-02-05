// ui/lesson/lessonConfig.js
export function getStepsPerBar(lesson) {
  // Try multiple possible keys (editor variations)
  const candidates = [
    lesson?.gridSteps,
    lesson?.stepsPerBar,
    lesson?.timeline?.stepsPerBar,
    lesson?.timeline?.grid,
    lesson?.time?.stepsPerBar,
    lesson?.time?.grid,
    lesson?.metronome?.stepsPerBar
  ];

  const n = candidates.find((v) => Number.isFinite(Number(v)) && Number(v) > 0);
  const val = n ? Number(n) : 8;

  // clamp to sane values
  if (val <= 1) return 1;
  if (val > 64) return 64;
  return Math.round(val);
}

export function getBars(lesson) {
  const bars = lesson?.bars || lesson?.timeline?.bars || lesson?.pattern?.bars;
  if (Array.isArray(bars) && bars.length) return bars;
  return [];
}

// Normalize a bar’s hit array to exactly stepsPerBar length
export function normalizeHits(hits, stepsPerBar) {
  const arr = Array.isArray(hits) ? hits.slice(0) : [];
  const out = new Array(stepsPerBar).fill(0);

  for (let i = 0; i < stepsPerBar; i++) {
    const v = arr[i];
    out[i] = v === 1 || v === true || v === "1" ? 1 : 0;
  }
  return out;
}

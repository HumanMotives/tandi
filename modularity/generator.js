const svgNs = "http://www.w3.org/2000/svg";

const HP_MM = 5.08;
const PANEL_HEIGHT_MM = 128.5;

const panelColors = [
  "#f1d54a",
  "#cfe870",
  "#8fd8cf",
  "#b8e3d1",
  "#cfd8e3",
  "#efd2c6",
  "#e8ded1",
  "#ddd4ee"
];

const inkColors = ["#111111", "#1c1c1c", "#222222"];
const brandMarks = ["CV", "VX", "MØ", "IO", "MM", "XR", "NQ"];

const wordA = [
  "Axiom", "Vector", "Mono", "Drift", "Flux", "Tetra", "Nova", "Phase", "Pulse", "Orbit",
  "Motive", "Signal", "Prism", "Scalar", "Void", "Ribbon", "Frame", "Contour", "Helio", "Luma"
];

const families = {
  oscillator: {
    label: "Oscillator",
    wordB: ["Core", "Tone", "Fold", "Field", "Voice", "Phase"],
    headers: ["PITCH", "FM", "WAVE", "SYNC"]
  },
  filter: {
    label: "Filter",
    wordB: ["Filter", "Span", "Color", "Trace", "Field", "Kernel"],
    headers: ["FREQ", "Q", "DRIVE", "MIX"]
  },
  modulation: {
    label: "Modulation",
    wordB: ["Drift", "Orbit", "Bloom", "Atlas", "Flow", "Frame"],
    headers: ["RATE", "SHAPE", "DEPTH", "CV"]
  },
  sequencer: {
    label: "Sequencer",
    wordB: ["Step", "Array", "Matrix", "Gate", "Dial", "Span"],
    headers: ["STEP", "CLK", "GATE", "RESET"]
  },
  utility: {
    label: "Utility",
    wordB: ["Merge", "Patch", "Line", "Atlas", "Vector", "Field"],
    headers: ["IN", "OUT", "CV", "MIX"]
  },
  mixer: {
    label: "Mixer",
    wordB: ["Mix", "Sum", "Merge", "Span", "Field", "Matrix"],
    headers: ["CH", "LEVEL", "PAN", "OUT"]
  }
};

const academicLabels = {
  knobLarge: ["FREQ", "RATE", "SHAPE", "SPAN", "COLOR", "DRIVE", "TIME", "SCAN", "INDEX"],
  knobMedium: ["MIX", "BIAS", "WIDTH", "FM", "Q", "DEPTH", "FOLD", "TILT", "SKEW", "LEVEL"],
  knobShaft: ["ATTN", "CV", "MOD", "A", "B", "X", "Y", "ODD", "EVN", "TRIM", "AUX"],
  input: ["IN", "CV", "FM", "CLK", "RST", "SYNC", "MOD", "TRIG", "LEFT", "RIGHT"],
  output: ["OUT", "ENV", "GATE", "SUM", "ODD", "EVN", "A", "B", "MIX", "AUX"],
  slider: ["STEP", "FADE", "LEVEL", "TIME", "SCAN", "WIDTH"]
};

const artisticLabels = {
  knobLarge: ["DISTANCE", "DESPAIR", "UNRAVEL", "COSMOS", "TIDE", "GHOST", "RITUAL", "VAST", "MIRROR"],
  knobMedium: ["ASH", "EMBER", "VEIL", "HOLLOW", "GLASS", "THREAD", "ECHO", "SHIFT", "RED A", "RED B"],
  knobShaft: ["RED C", "LOSS", "A", "B", "C", "SIGNAL", "DUST", "RUST", "TRACE", "NULL"],
  input: ["ENTRY", "DISTANCE", "SUMMON", "TIDE", "GHOST", "MEMORY", "LEFT", "RIGHT", "CALL", "LOW"],
  output: ["EXIT", "RESPONSE", "COSMOS", "OUT LEFT", "OUT RIGHT", "RETURN", "FIELD", "GLARE", "WAKE", "BLOOM"],
  slider: ["FADE", "DESCENT", "ASCENT", "DRIFT", "SHIFT", "WIDTH"]
};

const statName = document.getElementById("statName");
const statHp = document.getElementById("statHp");
const statSeed = document.getElementById("statSeed");
const statElements = document.getElementById("statElements");
const statFamily = document.getElementById("statFamily");
const statMode = document.getElementById("statMode");
const stageCode = document.getElementById("stageCode");
const moduleTarget = document.getElementById("moduleTarget");
const generateButton = document.getElementById("generateButton");
const exportSvgButton = document.getElementById("exportSvgButton");
const exportPngButton = document.getElementById("exportPngButton");
const modeSelect = document.getElementById("modeSelect");
const densitySelect = document.getElementById("densitySelect");
const showGridToggle = document.getElementById("showGridToggle");

let currentModule = null;

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rand, array) {
  return array[Math.floor(rand() * array.length)];
}

function int(rand, min, max) {
  return Math.floor(min + rand() * (max - min + 1));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createSvgElement(tag, attributes) {
  const el = document.createElementNS(svgNs, tag);
  Object.keys(attributes).forEach((key) => {
    el.setAttribute(key, attributes[key]);
  });
  return el;
}

function addLabel(parent, x, y, text, options = {}) {
  const settings = Object.assign(
    {
      anchor: "middle",
      size: 2.3,
      weight: 600,
      fill: "#111111"
    },
    options
  );

  const label = createSvgElement("text", {
    x,
    y,
    "text-anchor": settings.anchor,
    "font-size": settings.size,
    "font-weight": settings.weight,
    fill: settings.fill,
    style: "letter-spacing:0.12em;font-family:Inter, sans-serif"
  });

  label.textContent = text;
  parent.appendChild(label);
}

function getDensityConfig(density) {
  if (density === "extreme") {
    return {
      sectionPacking: 1.35,
      jackRows: 7,
      extraMediumRow: true,
      extraShaftRow: true,
      sliderChance: 1
    };
  }

  if (density === "dense") {
    return {
      sectionPacking: 1.15,
      jackRows: 5,
      extraMediumRow: true,
      extraShaftRow: false,
      sliderChance: 0.75
    };
  }

  return {
    sectionPacking: 1,
    jackRows: 3,
    extraMediumRow: false,
    extraShaftRow: false,
    sliderChance: 0.35
  };
}

function splitNameWords(name) {
  return name.toUpperCase().split(/\s+/).filter(Boolean);
}

function buildNameAwarePools(nameWords, mode) {
  const first = nameWords[0] || "SIGNAL";
  const second = nameWords[1] || first;
  const poetic = mode === "artistic";

  return {
    knobLarge: [
      first,
      second,
      `${first} A`,
      `${second} A`,
      `${first} DEPTH`,
      `${second} WIDTH`
    ],
    knobMedium: [
      `${first} B`,
      `${second} B`,
      `${first} MIX`,
      `${second} CV`,
      `${first} AMT`,
      `${second} SHIFT`
    ],
    knobShaft: [
      `${first} C`,
      `${second} C`,
      `${first} X`,
      `${second} Y`,
      `${first} AUX`,
      `${second} AUX`
    ],
    input: [
      `${first} IN`,
      `${second} IN`,
      `${first} CV`,
      `${second} CV`,
      `${first} LEFT`,
      `${second} RIGHT`
    ],
    output: [
      `${first} OUT`,
      `${second} OUT`,
      `${first} LEFT`,
      `${second} RIGHT`,
      `${first} ENV`,
      `${second} GATE`
    ],
    slider: poetic
      ? [`${first} DRIFT`, `${second} DRIFT`, `${first} FADE`, `${second} ASCENT`]
      : [`${first} STEP`, `${second} STEP`, `${first} SCAN`, `${second} TIME`]
  };
}

function getLabelBank(mode, nameWords) {
  const base = mode === "artistic" ? artisticLabels : academicLabels;
  const derived = buildNameAwarePools(nameWords, mode);

  return {
    knobLarge: [...derived.knobLarge, ...base.knobLarge],
    knobMedium: [...derived.knobMedium, ...base.knobMedium],
    knobShaft: [...derived.knobShaft, ...base.knobShaft],
    input: [...derived.input, ...base.input],
    output: [...derived.output, ...base.output],
    slider: [...derived.slider, ...base.slider]
  };
}

function buildPanelGrid(hp) {
  const cols = hp;
  const rows = 28;
  const cellW = HP_MM;
  const cellH = PANEL_HEIGHT_MM / rows;

  return {
    cols,
    rows,
    cellW,
    cellH,
    widthMm: hp * HP_MM,
    heightMm: PANEL_HEIGHT_MM
  };
}

function getUsableBounds(grid) {
  return {
    colMin: 0,
    colMax: grid.cols - 1,
    rowMin: 2,
    rowMax: grid.rows - 3
  };
}

function getFootprints() {
  return {
    jack: { w: 1, h: 2, radiusMm: 1.65 },
    shaft: { w: 1, h: 2, radiusMm: 1.45 },
    knobMd: { w: 2, h: 3, radiusMm: 2.6 },
    knobLg: { w: 3, h: 4, radiusMm: 3.9 },
    slider: { w: 1, h: 5, radiusMm: 0 }
  };
}

function mmX(grid, col) {
  return col * grid.cellW;
}

function mmY(grid, row) {
  return row * grid.cellH;
}

function cellCenterX(grid, colStart, widthCells) {
  return mmX(grid, colStart) + (widthCells * grid.cellW) / 2;
}

function cellCenterY(grid, rowStart, heightCells) {
  return mmY(grid, rowStart) + (heightCells * grid.cellH) / 2;
}

function makeOccupancy(grid) {
  return Array.from({ length: grid.rows }, () =>
    Array.from({ length: grid.cols }, () => false)
  );
}

function canPlace(occ, bounds, col, row, w, h) {
  if (col < bounds.colMin || row < bounds.rowMin) return false;
  if (col + w - 1 > bounds.colMax) return false;
  if (row + h - 1 > bounds.rowMax) return false;

  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) {
      if (occ[r][c]) return false;
    }
  }
  return true;
}

function occupy(occ, col, row, w, h) {
  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) {
      occ[r][c] = true;
    }
  }
}

function centeredStarts(bounds, usableCols, widthCells, count, gapCols) {
  const starts = [];
  const totalWidth = count * widthCells + (count - 1) * gapCols;
  if (totalWidth > usableCols) return starts;

  const free = usableCols - totalWidth;
  const offset = Math.floor(free / 2);
  const startBase = bounds.colMin + offset;

  for (let i = 0; i < count; i++) {
    starts.push(startBase + i * (widthCells + gapCols));
  }

  return starts;
}

function denseStarts(bounds, usableCols, widthCells, count, gapCols) {
  const starts = [];
  const totalWidth = count * widthCells + (count - 1) * gapCols;
  if (totalWidth > usableCols) return starts;

  let col = bounds.colMin;
  for (let i = 0; i < count; i++) {
    starts.push(col);
    col += widthCells + gapCols;
  }

  return starts;
}

function placeRow(elements, occ, grid, bounds, rowStart, footprint, count, labels, type, density, isOutput = false) {
  const usableCols = bounds.colMax - bounds.colMin + 1;
  const gapCols =
    type === "knobLg" ? 1 :
    type === "knobMd" ? 1 :
    type === "shaft" ? 0 :
    type === "slider" ? 0 :
    0;

  const starts =
    density === "extreme" && (type === "jack" || type === "shaft")
      ? denseStarts(bounds, usableCols, footprint.w, Math.min(count, 99), gapCols)
      : centeredStarts(bounds, usableCols, footprint.w, Math.min(count, 99), gapCols);

  for (let i = 0; i < starts.length; i++) {
    const col = starts[i];
    if (!canPlace(occ, bounds, col, rowStart, footprint.w, footprint.h)) continue;

    occupy(occ, col, rowStart, footprint.w, footprint.h);

    elements.push({
      type,
      col,
      row: rowStart,
      w: footprint.w,
      h: footprint.h,
      x: cellCenterX(grid, col, footprint.w),
      y: cellCenterY(grid, rowStart, footprint.h),
      radiusMm: footprint.radiusMm,
      label: labels[i % labels.length],
      isOutput
    });
  }
}

function placeJackMatrix(elements, occ, grid, bounds, rowStart, rowCount, perRow, labels, density, isOutput = false) {
  const fp = getFootprints().jack;
  let labelIndex = 0;

  for (let r = 0; r < rowCount; r++) {
    const row = rowStart + r * 2;
    const usableCols = bounds.colMax - bounds.colMin + 1;
    const maxPerRow = Math.floor(usableCols / fp.w);
    const count = Math.min(perRow, maxPerRow);

    const starts =
      density === "extreme"
        ? denseStarts(bounds, usableCols, fp.w, count, 0)
        : centeredStarts(bounds, usableCols, fp.w, count, 0);

    starts.forEach((col) => {
      if (!canPlace(occ, bounds, col, row, fp.w, fp.h)) return;
      occupy(occ, col, row, fp.w, fp.h);

      elements.push({
        type: "jack",
        col,
        row,
        w: fp.w,
        h: fp.h,
        x: cellCenterX(grid, col, fp.w),
        y: cellCenterY(grid, row, fp.h),
        radiusMm: fp.radiusMm,
        label: labels[labelIndex % labels.length],
        isOutput
      });

      labelIndex++;
    });
  }
}

function drawGridOverlay(svg, grid, bounds, showCoords = false) {
  const g = createSvgElement("g", { opacity: 0.35 });

  for (let c = 0; c <= grid.cols; c++) {
    const x = c * grid.cellW;
    g.appendChild(createSvgElement("line", {
      x1: x,
      y1: 0,
      x2: x,
      y2: grid.heightMm,
      stroke: "#111111",
      "stroke-width": c % 2 === 0 ? 0.08 : 0.05
    }));
  }

  for (let r = 0; r <= grid.rows; r++) {
    const y = r * grid.cellH;
    g.appendChild(createSvgElement("line", {
      x1: 0,
      y1: y,
      x2: grid.widthMm,
      y2: y,
      stroke: "#111111",
      "stroke-width": r % 2 === 0 ? 0.08 : 0.05
    }));
  }

  const usableX = bounds.colMin * grid.cellW;
  const usableY = bounds.rowMin * grid.cellH;
  const usableW = (bounds.colMax - bounds.colMin + 1) * grid.cellW;
  const usableH = (bounds.rowMax - bounds.rowMin + 1) * grid.cellH;

  g.appendChild(createSvgElement("rect", {
    x: usableX,
    y: usableY,
    width: usableW,
    height: usableH,
    fill: "none",
    stroke: "#111111",
    "stroke-width": 0.16,
    "stroke-dasharray": "0.5 0.4"
  }));

  if (showCoords) {
    for (let c = 0; c < grid.cols; c++) {
      addLabel(g, c * grid.cellW + grid.cellW / 2, 1.5, String(c), {
        size: 1.0,
        weight: 500
      });
    }
  }

  svg.appendChild(g);
}

function drawLargeKnob(parent, x, y, radius, ink, panel) {
  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: radius + 0.28,
    fill: "none",
    stroke: ink,
    "stroke-width": 0.24
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: radius,
    fill: panel,
    stroke: ink,
    "stroke-width": 0.24
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: radius * 0.6,
    fill: panel,
    stroke: ink,
    "stroke-width": 0.18
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: radius * 0.16,
    fill: ink
  }));

  const notchX = x + Math.cos(-Math.PI / 3) * (radius - 0.7);
  const notchY = y + Math.sin(-Math.PI / 3) * (radius - 0.7);

  parent.appendChild(createSvgElement("line", {
    x1: x,
    y1: y,
    x2: notchX,
    y2: notchY,
    stroke: ink,
    "stroke-width": 0.34,
    "stroke-linecap": "round"
  }));
}

function drawMediumKnob(parent, x, y, radius, ink, panel) {
  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: radius + 0.2,
    fill: "none",
    stroke: ink,
    "stroke-width": 0.2
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: radius,
    fill: panel,
    stroke: ink,
    "stroke-width": 0.2
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: radius * 0.52,
    fill: panel,
    stroke: ink,
    "stroke-width": 0.16
  }));

  const notchX = x + Math.cos(-Math.PI / 3) * (radius - 0.45);
  const notchY = y + Math.sin(-Math.PI / 3) * (radius - 0.45);

  parent.appendChild(createSvgElement("line", {
    x1: x,
    y1: y,
    x2: notchX,
    y2: notchY,
    stroke: ink,
    "stroke-width": 0.28,
    "stroke-linecap": "round"
  }));
}

function drawShaftKnob(parent, x, y, radius, ink) {
  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: radius * 0.78,
    fill: ink
  }));

  parent.appendChild(createSvgElement("line", {
    x1: x,
    y1: y,
    x2: x,
    y2: y - radius + 0.35,
    stroke: "#ffffff",
    "stroke-width": 0.16,
    "stroke-linecap": "round"
  }));
}

function drawInputJack(parent, x, y, ink) {
  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: 1.7,
    fill: "#d7d7d7",
    stroke: ink,
    "stroke-width": 0.18
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: 1.35,
    fill: "#efefef",
    stroke: "#999999",
    "stroke-width": 0.12
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: 0.95,
    fill: "#3a3a3a"
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: 0.34,
    fill: "#000000"
  }));
}

function drawOutputJack(parent, x, y, ink) {
  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: 1.95,
    fill: "none",
    stroke: ink,
    "stroke-width": 0.34
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: 1.65,
    fill: "#d7d7d7",
    stroke: ink,
    "stroke-width": 0.18
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: 1.3,
    fill: "#efefef",
    stroke: "#999999",
    "stroke-width": 0.12
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: 0.95,
    fill: "#3a3a3a"
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: 0.34,
    fill: "#000000"
  }));
}

function drawSlider(parent, x, y, ink, panel) {
  parent.appendChild(createSvgElement("rect", {
    x: x - 0.32,
    y: y - 3.0,
    width: 0.64,
    height: 6.0,
    rx: 0.25,
    fill: "none",
    stroke: ink,
    "stroke-width": 0.18
  }));

  parent.appendChild(createSvgElement("rect", {
    x: x - 0.85,
    y: y - 0.42,
    width: 1.7,
    height: 0.84,
    rx: 0.28,
    fill: panel,
    stroke: ink,
    "stroke-width": 0.18
  }));
}

function createModule(seed) {
  const rand = mulberry32(seed);
  const density = densitySelect ? densitySelect.value : "dense";
  const mode = modeSelect ? modeSelect.value : "academic";
  const densityCfg = getDensityConfig(density);

  const hpOptions = [2];
  const hp = pick(rand, hpOptions);
  const familyKey = pick(rand, Object.keys(families));
  const family = families[familyKey];

  const grid = buildPanelGrid(hp);
  const bounds = getUsableBounds(grid);
  const occ = makeOccupancy(grid);
  const fps = getFootprints();

  const color = pick(rand, panelColors);
  const ink = pick(rand, inkColors);
  const name = `${pick(rand, wordA)} ${pick(rand, family.wordB)}`.toUpperCase();
  const sub = `${pick(rand, brandMarks)}-${int(rand, 1, 9)}${String.fromCharCode(65 + int(rand, 0, 25))}`;
  const nameWords = splitNameWords(name);
  const labelBank = getLabelBank(mode, nameWords);

  const usableCols = bounds.colMax - bounds.colMin + 1;
  const compact = hp <= 4;
  const narrow = hp <= 8;
  const wide = hp >= 16;

  const elements = [];

  for (let r = 0; r <= 2; r++) {
    occupy(occ, 0, r, grid.cols, 1);
  }

  if (compact) {
    placeJackMatrix(elements, occ, grid, bounds, 6, Math.min(7, densityCfg.jackRows + 1), 1, labelBank.input, density, false);
    placeJackMatrix(elements, occ, grid, bounds, 6, Math.min(3, densityCfg.jackRows - 1), 1, labelBank.output, density, true);
  } else {
    const largeCount = clamp(Math.round((wide ? 2 : 1) * densityCfg.sectionPacking), 1, wide ? 3 : 2);
    const mediumCount = clamp(Math.round((narrow ? 2 : 3) * densityCfg.sectionPacking), 1, wide ? 5 : 4);
    const shaftCount = clamp(Math.round((narrow ? 2 : 4) * densityCfg.sectionPacking), 1, usableCols);
    const inputPerRow = clamp(Math.round((narrow ? 2 : 4) * densityCfg.sectionPacking), 1, usableCols);
    const outputPerRow = clamp(Math.round((narrow ? 1 : 2) * densityCfg.sectionPacking), 1, usableCols);

    placeRow(elements, occ, grid, bounds, 5, fps.knobLg, largeCount, labelBank.knobLarge, "knobLg", density, false);
    placeRow(elements, occ, grid, bounds, 10, fps.knobMd, mediumCount, labelBank.knobMedium, "knobMd", density, false);

    if (densityCfg.extraMediumRow && hp >= 10) {
      placeRow(elements, occ, grid, bounds, 14, fps.knobMd, Math.max(2, mediumCount - 1), labelBank.knobMedium, "knobMd", density, false);
    }

    placeRow(elements, occ, grid, bounds, 18, fps.shaft, shaftCount, labelBank.knobShaft, "shaft", density, false);

    if (densityCfg.extraShaftRow && hp >= 14) {
      placeRow(elements, occ, grid, bounds, 20, fps.shaft, Math.max(2, shaftCount - 1), labelBank.knobShaft, "shaft", density, false);
    }

    const wantSliders =
      family.label === "Sequencer" ||
      family.label === "Mixer" ||
      Math.random() < densityCfg.sliderChance;

    if (wantSliders && hp >= 8) {
      const sliderCount = clamp(narrow ? 2 : wide ? 4 : 3, 2, usableCols);
      placeRow(elements, occ, grid, bounds, 12, fps.slider, sliderCount, labelBank.slider, "slider", density, false);
    }

    placeJackMatrix(elements, occ, grid, bounds, 22, densityCfg.jackRows, inputPerRow, labelBank.input, density, false);
    placeJackMatrix(elements, occ, grid, bounds, 22, Math.max(2, densityCfg.jackRows - 2), outputPerRow, labelBank.output, density, true);
  }

  return {
    seed,
    familyLabel: family.label,
    hp,
    width: grid.widthMm,
    height: grid.heightMm,
    color,
    ink,
    name,
    sub,
    mode,
    density,
    headers: family.headers.slice(0, compact ? 2 : narrow ? 3 : 4),
    elements,
    grid,
    bounds
  };
}

function renderModule(module) {
  moduleTarget.innerHTML = "";

  const svg = createSvgElement("svg", {
    id: "moduleSvg",
    viewBox: `0 0 ${module.width} ${module.height}`,
    width: module.width,
    height: module.height,
    xmlns: svgNs,
    role: "img",
    "aria-label": `${module.name} Eurorack module illustration`,
    preserveAspectRatio: "xMidYMid meet"
  });

  svg.appendChild(createSvgElement("rect", {
    x: 0,
    y: 0,
    width: module.width,
    height: module.height,
    fill: module.color,
    stroke: module.ink,
    "stroke-width": 0.4
  }));

  if (showGridToggle && showGridToggle.value === "on") {
    drawGridOverlay(svg, module.grid, module.bounds, false);
  }

  svg.appendChild(createSvgElement("line", {
    x1: 2.4,
    y1: 15,
    x2: module.width - 2.4,
    y2: 15,
    stroke: module.ink,
    "stroke-width": 0.24
  }));

  svg.appendChild(createSvgElement("line", {
    x1: 2.4,
    y1: module.height - 4.2,
    x2: module.width - 2.4,
    y2: module.height - 4.2,
    stroke: module.ink,
    "stroke-width": 0.24
  }));

  addLabel(svg, 2.8, 5.8, module.name, {
    anchor: "start",
    size: module.hp <= 4 ? 3.1 : module.hp <= 8 ? 4.0 : 5.0,
    weight: 700,
    fill: module.ink
  });

  addLabel(svg, 2.8, 9.5, module.sub, {
    anchor: "start",
    size: module.hp <= 4 ? 2.0 : 2.6,
    weight: 600,
    fill: module.ink
  });

  addLabel(svg, module.width - 2.8, 5.8, `${module.hp}HP`, {
    anchor: "end",
    size: module.hp <= 4 ? 2.2 : 2.8,
    weight: 700,
    fill: module.ink
  });

  module.headers.forEach((head, index) => {
    const maxIndex = Math.max(1, module.headers.length - 1);
    const x = 2.8 + index * ((module.width - 5.6) / maxIndex);
    let anchor = "middle";
    if (index === 0) anchor = "start";
    if (index === module.headers.length - 1) anchor = "end";

    addLabel(svg, x, 12.2, head, {
      anchor,
      size: module.hp <= 4 ? 1.8 : 2.2,
      weight: 600,
      fill: module.ink
    });
  });

  module.elements.forEach((element) => {
    const group = createSvgElement("g", {});

    if (element.type === "knobLg") {
      drawLargeKnob(group, element.x, element.y, element.radiusMm, module.ink, module.color);
      addLabel(group, element.x, element.y - element.radiusMm - 1.4, element.label, {
        size: module.hp <= 4 ? 1.6 : 1.9,
        weight: 600
      });
    } else if (element.type === "knobMd") {
      drawMediumKnob(group, element.x, element.y, element.radiusMm, module.ink, module.color);
      addLabel(group, element.x, element.y - element.radiusMm - 1.2, element.label, {
        size: module.hp <= 4 ? 1.6 : 1.9,
        weight: 600
      });
    } else if (element.type === "shaft") {
      drawShaftKnob(group, element.x, element.y, element.radiusMm, module.ink);
      addLabel(group, element.x, element.y - element.radiusMm - 1.1, element.label, {
        size: module.hp <= 4 ? 1.6 : 1.9,
        weight: 600
      });
    } else if (element.type === "jack") {
      addLabel(group, element.x, element.y - 2.05, element.label, {
        size: module.hp <= 4 ? 1.55 : 1.85,
        weight: 600
      });

      if (element.isOutput) {
        drawOutputJack(group, element.x, element.y, module.ink);
      } else {
        drawInputJack(group, element.x, element.y, module.ink);
      }
    } else if (element.type === "slider") {
      addLabel(group, element.x, element.y - 3.9, element.label, {
        size: module.hp <= 4 ? 1.55 : 1.85,
        weight: 600
      });
      drawSlider(group, element.x, element.y, module.ink, module.color);
    }

    svg.appendChild(group);
  });

  svg.appendChild(createSvgElement("circle", { cx: 1.3, cy: 1.8, r: 0.28, fill: module.ink }));
  svg.appendChild(createSvgElement("circle", { cx: module.width - 1.3, cy: 1.8, r: 0.28, fill: module.ink }));
  svg.appendChild(createSvgElement("circle", { cx: 1.3, cy: module.height - 1.8, r: 0.28, fill: module.ink }));
  svg.appendChild(createSvgElement("circle", { cx: module.width - 1.3, cy: module.height - 1.8, r: 0.28, fill: module.ink }));

  moduleTarget.appendChild(svg);

  if (statName) statName.textContent = module.name;
  if (statHp) statHp.textContent = `${module.hp}HP`;
  if (statSeed) statSeed.textContent = String(module.seed);
  if (statElements) statElements.textContent = String(module.elements.length);
  if (statFamily) statFamily.textContent = module.familyLabel;
  if (statMode) statMode.textContent = `${module.density} / ${module.mode}`;
  if (stageCode) stageCode.textContent = module.sub;
}

function generateModule() {
  const seed = Math.floor(Math.random() * 1000000);
  currentModule = createModule(seed);
  renderModule(currentModule);
}

function exportCurrentSvg() {
  const svg = document.getElementById("moduleSvg");
  if (!svg || !currentModule) return;

  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svg);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = currentModule.name.toLowerCase().replace(/\s+/g, "-") + ".svg";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportCurrentPng() {
  const svg = document.getElementById("moduleSvg");
  if (!svg || !currentModule) return;

  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svg);
  const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();

  img.onload = function () {
    const scale = 10;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(currentModule.width * scale);
    canvas.height = Math.round(currentModule.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = currentModule.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    URL.revokeObjectURL(url);

    canvas.toBlob(function (blob) {
      if (!blob) return;

      const pngUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = currentModule.name.toLowerCase().replace(/\s+/g, "-") + ".png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(pngUrl);
    }, "image/png");
  };

  img.src = url;
}

if (generateButton) generateButton.addEventListener("click", generateModule);
if (exportSvgButton) exportSvgButton.addEventListener("click", exportCurrentSvg);
if (exportPngButton) exportPngButton.addEventListener("click", exportCurrentPng);
if (modeSelect) modeSelect.addEventListener("change", generateModule);
if (densitySelect) densitySelect.addEventListener("change", generateModule);
if (showGridToggle) showGridToggle.addEventListener("change", generateModule);

generateModule();

const svgNs = "http://www.w3.org/2000/svg";

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
      size: 12,
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
    style: "letter-spacing:0.14em;font-family:Inter, sans-serif"
  });

  label.textContent = text;
  parent.appendChild(label);
}

function drawLargeKnob(parent, x, y, radius, ink, panel) {
  parent.appendChild(createSvgElement("circle", { cx: x, cy: y, r: radius + 3, fill: "none", stroke: ink, "stroke-width": 1.4 }));
  parent.appendChild(createSvgElement("circle", { cx: x, cy: y, r: radius, fill: panel, stroke: ink, "stroke-width": 1.4 }));
  parent.appendChild(createSvgElement("circle", { cx: x, cy: y, r: radius * 0.62, fill: panel, stroke: ink, "stroke-width": 1.1 }));
  parent.appendChild(createSvgElement("circle", { cx: x, cy: y, r: radius * 0.18, fill: ink }));
  const notchX = x + Math.cos(-Math.PI / 3) * (radius - 9);
  const notchY = y + Math.sin(-Math.PI / 3) * (radius - 9);
  parent.appendChild(createSvgElement("line", { x1: x, y1: y, x2: notchX, y2: notchY, stroke: ink, "stroke-width": 2.2, "stroke-linecap": "round" }));
}

function drawMediumKnob(parent, x, y, radius, ink, panel) {
  parent.appendChild(createSvgElement("circle", { cx: x, cy: y, r: radius + 2, fill: "none", stroke: ink, "stroke-width": 1.2 }));
  parent.appendChild(createSvgElement("circle", { cx: x, cy: y, r: radius, fill: panel, stroke: ink, "stroke-width": 1.2 }));
  parent.appendChild(createSvgElement("circle", { cx: x, cy: y, r: radius * 0.52, fill: "none", stroke: ink, "stroke-width": 1.0, opacity: 0.7 }));
  const notchX = x + Math.cos(-Math.PI / 3) * (radius - 6);
  const notchY = y + Math.sin(-Math.PI / 3) * (radius - 6);
  parent.appendChild(createSvgElement("line", { x1: x, y1: y, x2: notchX, y2: notchY, stroke: ink, "stroke-width": 1.8, "stroke-linecap": "round" }));
  parent.appendChild(createSvgElement("circle", { cx: x, cy: y, r: 2, fill: ink }));
}

function drawShaftKnob(parent, x, y, radius, ink) {
  parent.appendChild(createSvgElement("circle", { cx: x, cy: y, r: radius * 0.78, fill: ink }));
  parent.appendChild(createSvgElement("line", { x1: x, y1: y, x2: x, y2: y - radius + 4, stroke: "#ffffff", "stroke-width": 1.2, "stroke-linecap": "round" }));
}

function drawInputJack(parent, x, y, ink, panel) {
  parent.appendChild(createSvgElement("circle", { cx: x, cy: y, r: 12, fill: panel, stroke: ink, "stroke-width": 1.2 }));
  parent.appendChild(createSvgElement("circle", { cx: x, cy: y, r: 7, fill: ink }));
  parent.appendChild(createSvgElement("circle", { cx: x, cy: y, r: 2.4, fill: "#000000" }));
}

function drawOutputJack(parent, x, y, ink, panel) {
  parent.appendChild(createSvgElement("circle", { cx: x, cy: y, r: 13.5, fill: "none", stroke: ink, "stroke-width": 3.2 }));
  parent.appendChild(createSvgElement("circle", { cx: x, cy: y, r: 11, fill: panel, stroke: ink, "stroke-width": 1.2 }));
  parent.appendChild(createSvgElement("circle", { cx: x, cy: y, r: 7, fill: ink }));
  parent.appendChild(createSvgElement("circle", { cx: x, cy: y, r: 2.4, fill: "#000000" }));
}

function drawSlider(parent, x, y, ink, panel) {
  parent.appendChild(createSvgElement("rect", { x: x - 4, y: y - 42, width: 8, height: 84, rx: 4, fill: "none", stroke: ink, "stroke-width": 1.2 }));
  parent.appendChild(createSvgElement("rect", { x: x - 11, y: y - 7, width: 22, height: 14, rx: 5, fill: panel, stroke: ink, "stroke-width": 1.2 }));
  parent.appendChild(createSvgElement("circle", { cx: x, cy: y - 34, r: 2, fill: ink, opacity: 0.6 }));
  parent.appendChild(createSvgElement("circle", { cx: x, cy: y + 34, r: 2, fill: ink, opacity: 0.6 }));
}

function getDensityConfig(density) {
  if (density === "extreme") {
    return {
      knobFactor: 1.35,
      jackRows: 4,
      jackFactor: 1.9,
      sliderChance: 1,
      shaftFactor: 1.7
    };
  }

  if (density === "dense") {
    return {
      knobFactor: 1.12,
      jackRows: 3,
      jackFactor: 1.4,
      sliderChance: 0.8,
      shaftFactor: 1.35
    };
  }

  return {
    knobFactor: 1,
    jackRows: 2,
    jackFactor: 1,
    sliderChance: 0.45,
    shaftFactor: 1
  };
}

function buildLayoutGrid(width, density) {
  const sidePadding = width <= 144 ? 24 : 32;
  const contentWidth = width - sidePadding * 2;

  let colCount;
  if (width <= 108) colCount = 2;
  else if (width <= 144) colCount = 3;
  else if (width <= 216) colCount = density === "extreme" ? 5 : 4;
  else if (width <= 288) colCount = density === "extreme" ? 6 : 5;
  else if (width <= 360) colCount = density === "extreme" ? 7 : 6;
  else colCount = density === "extreme" ? 8 : 7;

  const spacing = colCount > 1 ? contentWidth / (colCount - 1) : contentWidth;
  const xPositions = Array.from({ length: colCount }, (_, i) => sidePadding + i * spacing);

  const rowYs = {
    clusterA: 168,
    clusterB: 252,
    shaftA: 336,
    sliderA: 426,
    sliderB: 506,
    jackA: 590,
    jackB: 644,
    jackC: 698,
    jackD: 752
  };

  return { xPositions, rowYs };
}

function getModuleSpec(width, family, density, rand) {
  const densityConfig = getDensityConfig(density);
  const wide = width >= 288;
  const huge = width >= 360;
  const compact = width <= 144;

  let largeBase = compact ? 1 : wide ? 2 : 1;
  let mediumBase = compact ? 2 : wide ? 4 : 3;
  let shaftBase = compact ? 2 : wide ? 5 : 3;
  let inputBase = compact ? 2 : wide ? 6 : 4;
  let outputBase = compact ? 1 : wide ? 3 : 2;

  if (family.label === "Mixer") {
    shaftBase += 2;
    mediumBase += 1;
  }

  if (family.label === "Sequencer") {
    shaftBase += 2;
  }

  if (family.label === "Filter") {
    largeBase += 1;
  }

  const large = Math.max(0, Math.round(largeBase * densityConfig.knobFactor));
  const medium = Math.max(1, Math.round(mediumBase * densityConfig.knobFactor));
  const shaft = Math.max(1, Math.round(shaftBase * densityConfig.shaftFactor));
  const inputs = Math.max(1, Math.round(inputBase * densityConfig.jackFactor));
  const outputs = Math.max(1, Math.round(outputBase * densityConfig.jackFactor));

  let sliderRows = 0;
  if ((family.label === "Sequencer" || family.label === "Mixer") && rand() < densityConfig.sliderChance) {
    sliderRows = huge ? 2 : 1;
  } else if (density === "extreme" && width >= 216 && rand() < 0.35) {
    sliderRows = 1;
  }

  return {
    titleSize: compact ? 13 : width <= 216 ? 16 : 18,
    subSize: compact ? 8 : 10,
    hpSize: compact ? 9 : 11,
    headerCount: compact ? 2 : width <= 216 ? 3 : 4,
    large,
    medium,
    shaft,
    inputs,
    outputs,
    sliderRows,
    densityConfig
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
      `${first}`,
      `${second}`,
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

function getSymmetricSlots(slotCount, fillCount) {
  const center = (slotCount - 1) / 2;
  return Array.from({ length: slotCount }, (_, i) => i)
    .sort((a, b) => Math.abs(a - center) - Math.abs(b - center))
    .slice(0, fillCount)
    .sort((a, b) => a - b);
}

function getExtremeSlots(slotCount, fillCount) {
  return Array.from({ length: Math.min(slotCount, fillCount) }, (_, i) => i);
}

function chooseSlots(slotCount, fillCount, density) {
  if (density === "extreme" && fillCount >= Math.floor(slotCount * 0.65)) {
    return getExtremeSlots(slotCount, fillCount);
  }
  return getSymmetricSlots(slotCount, fillCount);
}

function addElement(elements, occupied, xPositions, rowYs, type, colIndex, rowName, radius, label, isOutput = false) {
  const key = `${colIndex}-${rowName}`;
  if (occupied.has(key)) return false;
  occupied.add(key);
  elements.push({
    type,
    x: xPositions[colIndex],
    y: rowYs[rowName],
    radius,
    label,
    isOutput
  });
  return true;
}

function addRowGroup(elements, occupied, xPositions, rowYs, rowName, type, count, radius, labelPool, rand, density, isOutput = false) {
  const slots = chooseSlots(xPositions.length, Math.min(count, xPositions.length), density);
  slots.forEach((slot) => {
    addElement(elements, occupied, xPositions, rowYs, type, slot, rowName, radius, pick(rand, labelPool), isOutput);
  });
}

function addJackBlock(elements, occupied, xPositions, rowYs, rows, totalCount, labelPool, rand, density, isOutput = false) {
  const rowNames = ["jackA", "jackB", "jackC", "jackD"].slice(0, rows);
  let remaining = totalCount;

  rowNames.forEach((rowName, rowIndex) => {
    if (remaining <= 0) return;
    const rowsLeft = rowNames.length - rowIndex;
    const countThisRow = Math.min(remaining, Math.max(1, Math.ceil(remaining / rowsLeft)), xPositions.length);
    const slots = chooseSlots(xPositions.length, countThisRow, density);

    slots.forEach((slot) => {
      addElement(elements, occupied, xPositions, rowYs, "jack", slot, rowName, 12, pick(rand, labelPool), isOutput);
    });

    remaining -= countThisRow;
  });
}

function createModule(seed) {
  const rand = mulberry32(seed);
  const familyKey = pick(rand, Object.keys(families));
  const family = families[familyKey];
  const mode = modeSelect ? modeSelect.value : "academic";
  const density = densitySelect ? densitySelect.value : "dense";

  const hpOptions = density === "extreme"
    ? [8, 10, 12, 14, 16, 18, 20, 24, 28]
    : [6, 8, 10, 12, 14, 16, 18, 20, 24, 28];

  const hp = pick(rand, hpOptions);
  const width = hp * 18;
  const height = density === "extreme" ? 840 : 780;
  const color = pick(rand, panelColors);
  const ink = pick(rand, inkColors);
  const name = `${pick(rand, wordA)} ${pick(rand, family.wordB)}`.toUpperCase();
  const sub = `${pick(rand, brandMarks)}-${int(rand, 1, 9)}${String.fromCharCode(65 + int(rand, 0, 25))}`;

  const nameWords = splitNameWords(name);
  const labelBank = getLabelBank(mode, nameWords);
  const { xPositions, rowYs } = buildLayoutGrid(width, density);
  const spec = getModuleSpec(width, family, density, rand);

  const elements = [];
  const occupied = new Set();

  addRowGroup(elements, occupied, xPositions, rowYs, "clusterA", "knob-lg", spec.large, 34, labelBank.knobLarge, rand, density, false);
  addRowGroup(elements, occupied, xPositions, rowYs, "clusterB", "knob-md", spec.medium, 22, labelBank.knobMedium, rand, density, false);
  addRowGroup(elements, occupied, xPositions, rowYs, "shaftA", "knob-sm", spec.shaft, 12, labelBank.knobShaft, rand, density, false);

  if (spec.sliderRows > 0) {
    const sliderChoices = [2, 4, 6, 8].filter((n) => n <= xPositions.length);
    const sliderCountA = sliderChoices.length ? pick(rand, sliderChoices) : 0;
    addRowGroup(elements, occupied, xPositions, rowYs, "sliderA", "slider", sliderCountA, 20, labelBank.slider, rand, density, false);
  }

  if (spec.sliderRows > 1) {
    const sliderChoicesB = [2, 4, 6].filter((n) => n <= xPositions.length);
    const sliderCountB = sliderChoicesB.length ? pick(rand, sliderChoicesB) : 0;
    addRowGroup(elements, occupied, xPositions, rowYs, "sliderB", "slider", sliderCountB, 20, labelBank.slider, rand, density, false);
  }

  addJackBlock(elements, occupied, xPositions, rowYs, spec.densityConfig.jackRows, spec.inputs, labelBank.input, rand, density, false);
  addJackBlock(elements, occupied, xPositions, rowYs, spec.densityConfig.jackRows, spec.outputs, labelBank.output, rand, density, true);

  return {
    seed,
    familyKey,
    familyLabel: family.label,
    hp,
    width,
    height,
    color,
    ink,
    name,
    sub,
    mode,
    density,
    headers: family.headers.slice(0, spec.headerCount),
    elements,
    titleSize: spec.titleSize,
    subSize: spec.subSize,
    hpSize: spec.hpSize
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
    "stroke-width": 2
  }));

  svg.appendChild(createSvgElement("line", {
    x1: 18,
    y1: 92,
    x2: module.width - 18,
    y2: 92,
    stroke: module.ink,
    "stroke-width": 1.2
  }));

  svg.appendChild(createSvgElement("line", {
    x1: 18,
    y1: module.height - 28,
    x2: module.width - 18,
    y2: module.height - 28,
    stroke: module.ink,
    "stroke-width": 1.2
  }));

  addLabel(svg, 24, 38, module.name, {
    anchor: "start",
    size: module.titleSize,
    weight: 700,
    fill: module.ink
  });

  addLabel(svg, 24, 58, module.sub, {
    anchor: "start",
    size: module.subSize,
    weight: 600,
    fill: module.ink
  });

  addLabel(svg, module.width - 24, 38, `${module.hp}HP`, {
    anchor: "end",
    size: module.hpSize,
    weight: 700,
    fill: module.ink
  });

  module.headers.forEach((head, index) => {
    const maxIndex = Math.max(1, module.headers.length - 1);
    const x = 24 + index * ((module.width - 48) / maxIndex);
    let anchor = "middle";
    if (index === 0) anchor = "start";
    if (index === module.headers.length - 1) anchor = "end";

    addLabel(svg, x, 78, head, {
      anchor,
      size: module.width <= 144 ? 7 : 9,
      weight: 600,
      fill: module.ink
    });
  });

  module.elements.forEach((element) => {
    const group = createSvgElement("g", {});

    if (element.type === "knob-lg") {
      drawLargeKnob(group, element.x, element.y, element.radius, module.ink, module.color);
      addLabel(group, element.x, element.y - element.radius - 12, element.label, {
        size: module.width <= 144 ? 7 : 8.5,
        weight: 600,
        fill: module.ink
      });
    } else if (element.type === "knob-md") {
      drawMediumKnob(group, element.x, element.y, element.radius, module.ink, module.color);
      addLabel(group, element.x, element.y - element.radius - 12, element.label, {
        size: module.width <= 144 ? 7 : 8.5,
        weight: 600,
        fill: module.ink
      });
    } else if (element.type === "knob-sm") {
      drawShaftKnob(group, element.x, element.y, element.radius, module.ink);
      addLabel(group, element.x, element.y - element.radius - 12, element.label, {
        size: module.width <= 144 ? 7 : 8.5,
        weight: 600,
        fill: module.ink
      });
    } else if (element.type === "jack") {
      addLabel(group, element.x, element.y - 18, element.label, {
        size: module.width <= 144 ? 7 : 8.5,
        weight: 600,
        fill: module.ink
      });

      if (element.isOutput) {
        drawOutputJack(group, element.x, element.y, module.ink, module.color);
      } else {
        drawInputJack(group, element.x, element.y, module.ink, module.color);
      }
    } else if (element.type === "slider") {
      addLabel(group, element.x, element.y - 54, element.label, {
        size: module.width <= 144 ? 7 : 8.5,
        weight: 600,
        fill: module.ink
      });
      drawSlider(group, element.x, element.y, module.ink, module.color);
    }

    svg.appendChild(group);
  });

  svg.appendChild(createSvgElement("circle", { cx: 12, cy: 12, r: 2, fill: module.ink }));
  svg.appendChild(createSvgElement("circle", { cx: module.width - 12, cy: 12, r: 2, fill: module.ink }));
  svg.appendChild(createSvgElement("circle", { cx: 12, cy: module.height - 12, r: 2, fill: module.ink }));
  svg.appendChild(createSvgElement("circle", { cx: module.width - 12, cy: module.height - 12, r: 2, fill: module.ink }));

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
    const canvas = document.createElement("canvas");
    canvas.width = currentModule.width * 2;
    canvas.height = currentModule.height * 2;

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

generateModule();

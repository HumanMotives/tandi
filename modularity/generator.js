const svgNs = "http://www.w3.org/2000/svg";

const panelColors = ["#f4f1ea", "#f7d54a", "#d8d3c8", "#d9e1e8", "#e8ded1", "#d4d7dd", "#efe9df"];
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
    headers: ["PITCH", "FM", "WAVE", "SYNC"],
    topKnobs: { large: [1, 2], medium: [2, 4], shaft: [1, 2] },
    bottomJacks: { inputs: [3, 5], outputs: [2, 3] },
    sliderRows: [0, 1]
  },
  filter: {
    label: "Filter",
    wordB: ["Filter", "Span", "Color", "Trace", "Field", "Kernel"],
    headers: ["FREQ", "Q", "DRIVE", "MIX"],
    topKnobs: { large: [1, 2], medium: [3, 4], shaft: [1, 2] },
    bottomJacks: { inputs: [3, 5], outputs: [1, 2] },
    sliderRows: [0, 1]
  },
  modulation: {
    label: "Modulation",
    wordB: ["Drift", "Orbit", "Bloom", "Atlas", "Flow", "Frame"],
    headers: ["RATE", "SHAPE", "DEPTH", "CV"],
    topKnobs: { large: [1, 2], medium: [3, 5], shaft: [2, 4] },
    bottomJacks: { inputs: [4, 6], outputs: [2, 4] },
    sliderRows: [0, 1]
  },
  sequencer: {
    label: "Sequencer",
    wordB: ["Step", "Array", "Matrix", "Gate", "Dial", "Span"],
    headers: ["STEP", "CLK", "GATE", "RESET"],
    topKnobs: { large: [0, 1], medium: [1, 3], shaft: [4, 8] },
    bottomJacks: { inputs: [3, 5], outputs: [2, 4] },
    sliderRows: [1, 2]
  },
  utility: {
    label: "Utility",
    wordB: ["Merge", "Patch", "Line", "Atlas", "Vector", "Field"],
    headers: ["IN", "OUT", "CV", "MIX"],
    topKnobs: { large: [0, 1], medium: [2, 4], shaft: [3, 6] },
    bottomJacks: { inputs: [4, 6], outputs: [3, 5] },
    sliderRows: [0, 1]
  },
  mixer: {
    label: "Mixer",
    wordB: ["Mix", "Sum", "Merge", "Span", "Field", "Matrix"],
    headers: ["CH", "LEVEL", "PAN", "OUT"],
    topKnobs: { large: [0, 1], medium: [2, 4], shaft: [4, 8] },
    bottomJacks: { inputs: [5, 8], outputs: [2, 4] },
    sliderRows: [1, 2]
  }
};

const labelsByRole = {
  knobLarge: ["FREQ", "RATE", "SHAPE", "SPAN", "COLOR", "DRIVE", "TIME", "SCAN", "INDEX"],
  knobMedium: ["MIX", "BIAS", "WIDTH", "FM", "Q", "DEPTH", "FOLD", "TILT", "SKEW", "LEVEL"],
  knobShaft: ["ATTN", "CV", "MOD", "A", "B", "X", "Y", "ODD", "EVN", "TRIM", "AUX"],
  input: ["IN", "CV", "FM", "CLK", "RST", "SYNC", "MOD", "TRIG", "LEFT", "RIGHT"],
  output: ["OUT", "ENV", "GATE", "SUM", "ODD", "EVN", "A", "B", "MIX", "AUX"],
  slider: ["STEP", "FADE", "LEVEL", "TIME", "SCAN", "WIDTH"]
};

const statName = document.getElementById("statName");
const statHp = document.getElementById("statHp");
const statSeed = document.getElementById("statSeed");
const statElements = document.getElementById("statElements");
const statFamily = document.getElementById("statFamily");
const stageCode = document.getElementById("stageCode");
const moduleTarget = document.getElementById("moduleTarget");
const generateButton = document.getElementById("generateButton");
const exportSvgButton = document.getElementById("exportSvgButton");
const exportPngButton = document.getElementById("exportPngButton");

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
  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: radius + 3,
    fill: "none",
    stroke: ink,
    "stroke-width": 1.4
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: radius,
    fill: panel,
    stroke: ink,
    "stroke-width": 1.4
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: radius * 0.62,
    fill: panel,
    stroke: ink,
    "stroke-width": 1.1
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: radius * 0.18,
    fill: ink
  }));

  const notchX = x + Math.cos(-Math.PI / 3) * (radius - 9);
  const notchY = y + Math.sin(-Math.PI / 3) * (radius - 9);

  parent.appendChild(createSvgElement("line", {
    x1: x,
    y1: y,
    x2: notchX,
    y2: notchY,
    stroke: ink,
    "stroke-width": 2.2,
    "stroke-linecap": "round"
  }));
}

function drawMediumKnob(parent, x, y, radius, ink, panel) {
  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: radius + 2,
    fill: "none",
    stroke: ink,
    "stroke-width": 1.2
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: radius,
    fill: panel,
    stroke: ink,
    "stroke-width": 1.2
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: radius * 0.52,
    fill: "none",
    stroke: ink,
    "stroke-width": 1.0,
    opacity: 0.7
  }));

  const notchX = x + Math.cos(-Math.PI / 3) * (radius - 6);
  const notchY = y + Math.sin(-Math.PI / 3) * (radius - 6);

  parent.appendChild(createSvgElement("line", {
    x1: x,
    y1: y,
    x2: notchX,
    y2: notchY,
    stroke: ink,
    "stroke-width": 1.8,
    "stroke-linecap": "round"
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: 2,
    fill: ink
  }));
}

function drawShaftKnob(parent, x, y, radius, ink) {
  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: radius * 0.75,
    fill: ink
  }));

  parent.appendChild(createSvgElement("line", {
    x1: x,
    y1: y,
    x2: x,
    y2: y - radius + 4,
    stroke: "#ffffff",
    "stroke-width": 1.2,
    "stroke-linecap": "round"
  }));
}

function drawInputJack(parent, x, y, ink, panel) {
  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: 12,
    fill: panel,
    stroke: ink,
    "stroke-width": 1.2
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: 7,
    fill: ink
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: 2.4,
    fill: "#000000"
  }));
}

function drawOutputJack(parent, x, y, ink, panel) {
  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: 13.5,
    fill: "none",
    stroke: ink,
    "stroke-width": 3.2
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: 11,
    fill: panel,
    stroke: ink,
    "stroke-width": 1.2
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: 7,
    fill: ink
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y,
    r: 2.4,
    fill: "#000000"
  }));
}

function drawSlider(parent, x, y, ink, panel) {
  parent.appendChild(createSvgElement("rect", {
    x: x - 4,
    y: y - 42,
    width: 8,
    height: 84,
    rx: 4,
    fill: "none",
    stroke: ink,
    "stroke-width": 1.2
  }));

  parent.appendChild(createSvgElement("rect", {
    x: x - 11,
    y: y - 7,
    width: 22,
    height: 14,
    rx: 5,
    fill: panel,
    stroke: ink,
    "stroke-width": 1.2
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y - 34,
    r: 2,
    fill: ink,
    opacity: 0.6
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x,
    cy: y + 34,
    r: 2,
    fill: ink,
    opacity: 0.6
  }));
}

function buildLayoutGrid(width) {
  const sidePadding = 34;
  const contentWidth = width - sidePadding * 2;
  const colSpacing = 48;
  const rowSpacing = 66;

  const cols = Math.max(2, Math.floor(contentWidth / colSpacing));
  const actualSpacing = cols > 1 ? contentWidth / (cols - 1) : contentWidth;

  const xPositions = Array.from({ length: cols }, (_, i) => sidePadding + i * actualSpacing);

  const rowYs = {
    knobTop: 168,
    knobMid: 258,
    shaftRow: 346,
    sliderRowA: 440,
    sliderRowB: 520,
    jackRowA: 590,
    jackRowB: 662
  };

  return { xPositions, rowYs, sidePadding };
}

function selectAlignedPositions(rand, positions, count, minGap = 1, centered = true) {
  if (count <= 0) return [];

  const indices = Array.from({ length: positions.length }, (_, i) => i);

  if (centered) {
    indices.sort((a, b) => {
      const center = (positions.length - 1) / 2;
      return Math.abs(a - center) - Math.abs(b - center);
    });
  }

  const selected = [];

  for (const idx of indices) {
    if (selected.length >= count) break;
    const ok = selected.every((s) => Math.abs(s - idx) >= minGap);
    if (ok) selected.push(idx);
  }

  return selected.sort((a, b) => a - b).map((i) => positions[i]);
}

function createModule(seed) {
  const rand = mulberry32(seed);
  const familyKey = pick(rand, Object.keys(families));
  const family = families[familyKey];

  const hpOptions = [6, 8, 10, 12, 14, 16, 18, 20, 24, 28];
  const hp = pick(rand, hpOptions);
  const width = hp * 18;
  const height = 740;
  const topPad = 120;
  const bottomPad = 54;
  const color = pick(rand, panelColors);
  const ink = pick(rand, inkColors);
  const name = `${pick(rand, wordA)} ${pick(rand, family.wordB)}`.toUpperCase();
  const sub = `${pick(rand, brandMarks)}-${int(rand, 1, 9)}${String.fromCharCode(65 + int(rand, 0, 25))}`;

  const { xPositions, rowYs } = buildLayoutGrid(width);
  const elements = [];
  const occupied = new Set();

  function cellKey(x, y) {
    return `${Math.round(x)}-${Math.round(y)}`;
  }

  function reserve(x, y) {
    occupied.add(cellKey(x, y));
  }

  function isFree(x, y) {
    return !occupied.has(cellKey(x, y));
  }

  function addElement(type, x, y, radius, label, isOutput = false) {
    if (!isFree(x, y)) return false;
    reserve(x, y);
    elements.push({ type, x, y, radius, label, isOutput });
    return true;
  }

  const largeCount = int(rand, family.topKnobs.large[0], family.topKnobs.large[1]);
  const mediumCount = int(rand, family.topKnobs.medium[0], family.topKnobs.medium[1]);
  const shaftCount = int(rand, family.topKnobs.shaft[0], family.topKnobs.shaft[1]);
  const inputCount = int(rand, family.bottomJacks.inputs[0], family.bottomJacks.inputs[1]);
  const outputCount = int(rand, family.bottomJacks.outputs[0], family.bottomJacks.outputs[1]);
  const sliderRows = int(rand, family.sliderRows[0], family.sliderRows[1]);

  const largeXs = selectAlignedPositions(rand, xPositions, largeCount, 2, true);
  largeXs.forEach((x) => {
    addElement("knob-lg", x, rowYs.knobTop, 34, pick(rand, labelsByRole.knobLarge));
  });

  const mediumXs = selectAlignedPositions(rand, xPositions, mediumCount, 1, true).filter((x) => isFree(x, rowYs.knobMid));
  mediumXs.forEach((x) => {
    addElement("knob-md", x, rowYs.knobMid, 22, pick(rand, labelsByRole.knobMedium));
  });

  const shaftXs = selectAlignedPositions(rand, xPositions, shaftCount, 1, false).filter((x) => isFree(x, rowYs.shaftRow));
  shaftXs.forEach((x) => {
    addElement("knob-sm", x, rowYs.shaftRow, 12, pick(rand, labelsByRole.knobShaft));
  });

  if (sliderRows > 0) {
    const sliderCountA = Math.min(xPositions.length, [2, 4, 4, 6, 8][int(rand, 0, 4)]);
    const sliderXsA = selectAlignedPositions(rand, xPositions, sliderCountA, 1, true);
    sliderXsA.forEach((x) => {
      addElement("slider", x, rowYs.sliderRowA, 20, pick(rand, labelsByRole.slider));
    });
  }

  if (sliderRows > 1) {
    const sliderCountB = Math.min(xPositions.length, [2, 4, 6, 8][int(rand, 0, 3)]);
    const sliderXsB = selectAlignedPositions(rand, xPositions, sliderCountB, 1, true).filter((x) => isFree(x, rowYs.sliderRowB));
    sliderXsB.forEach((x) => {
      addElement("slider", x, rowYs.sliderRowB, 20, pick(rand, labelsByRole.slider));
    });
  }

  const jackPool = xPositions.slice();
  const inputXs = selectAlignedPositions(rand, jackPool, inputCount, 1, false);
  inputXs.forEach((x, i) => {
    const y = i % 2 === 0 ? rowYs.jackRowA : rowYs.jackRowB;
    addElement("jack", x, y, 12, pick(rand, labelsByRole.input), false);
  });

  const outputXs = selectAlignedPositions(rand, jackPool, outputCount, 1, true);
  outputXs.forEach((x, i) => {
    const y = i % 2 === 0 ? rowYs.jackRowA : rowYs.jackRowB;
    if (isFree(x, y)) {
      addElement("jack", x, y, 12, pick(rand, labelsByRole.output), true);
    }
  });

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
    headers: family.headers,
    elements
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
    size: 18,
    weight: 700,
    fill: module.ink
  });

  addLabel(svg, 24, 58, module.sub, {
    anchor: "start",
    size: 10,
    weight: 600,
    fill: module.ink
  });

  addLabel(svg, module.width - 24, 38, `${module.hp}HP`, {
    anchor: "end",
    size: 11,
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
      size: 9,
      weight: 600,
      fill: module.ink
    });
  });

  module.elements.forEach((element) => {
    const group = createSvgElement("g", {});

    if (element.type === "knob-lg") {
      drawLargeKnob(group, element.x, element.y, element.radius, module.ink, module.color);
      addLabel(group, element.x, element.y - element.radius - 12, element.label, {
        size: 8.5,
        weight: 600,
        fill: module.ink
      });
    } else if (element.type === "knob-md") {
      drawMediumKnob(group, element.x, element.y, element.radius, module.ink, module.color);
      addLabel(group, element.x, element.y - element.radius - 12, element.label, {
        size: 8.5,
        weight: 600,
        fill: module.ink
      });
    } else if (element.type === "knob-sm") {
      drawShaftKnob(group, element.x, element.y, element.radius, module.ink);
      addLabel(group, element.x, element.y - element.radius - 12, element.label, {
        size: 8.5,
        weight: 600,
        fill: module.ink
      });
    } else if (element.type === "jack") {
      addLabel(group, element.x, element.y - 18, element.label, {
        size: 8.5,
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
        size: 8.5,
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

  statName.textContent = module.name;
  statHp.textContent = `${module.hp}HP`;
  statSeed.textContent = String(module.seed);
  statElements.textContent = String(module.elements.length);
  if (statFamily) statFamily.textContent = module.familyLabel;
  stageCode.textContent = module.sub;
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

generateModule();

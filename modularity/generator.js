const svgNs = "http://www.w3.org/2000/svg";

const panelColors = [
  "#f1d54a", // warm yellow
  "#cfe870", // lime
  "#8fd8cf", // teal mint
  "#b8e3d1", // pale mint
  "#cfd8e3", // dusty blue
  "#efd2c6", // soft coral
  "#e8ded1", // sand
  "#ddd4ee"  // pastel lilac
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
    cx: x, cy: y, r: radius + 3, fill: "none", stroke: ink, "stroke-width": 1.4
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x, cy: y, r: radius, fill: panel, stroke: ink, "stroke-width": 1.4
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x, cy: y, r: radius * 0.62, fill: panel, stroke: ink, "stroke-width": 1.1
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x, cy: y, r: radius * 0.18, fill: ink
  }));

  const notchX = x + Math.cos(-Math.PI / 3) * (radius - 9);
  const notchY = y + Math.sin(-Math.PI / 3) * (radius - 9);

  parent.appendChild(createSvgElement("line", {
    x1: x, y1: y, x2: notchX, y2: notchY, stroke: ink, "stroke-width": 2.2, "stroke-linecap": "round"
  }));
}

function drawMediumKnob(parent, x, y, radius, ink, panel) {
  parent.appendChild(createSvgElement("circle", {
    cx: x, cy: y, r: radius + 2, fill: "none", stroke: ink, "stroke-width": 1.2
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x, cy: y, r: radius, fill: panel, stroke: ink, "stroke-width": 1.2
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x, cy: y, r: radius * 0.52, fill: "none", stroke: ink, "stroke-width": 1.0, opacity: 0.7
  }));

  const notchX = x + Math.cos(-Math.PI / 3) * (radius - 6);
  const notchY = y + Math.sin(-Math.PI / 3) * (radius - 6);

  parent.appendChild(createSvgElement("line", {
    x1: x, y1: y, x2: notchX, y2: notchY, stroke: ink, "stroke-width": 1.8, "stroke-linecap": "round"
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x, cy: y, r: 2, fill: ink
  }));
}

function drawShaftKnob(parent, x, y, radius, ink) {
  parent.appendChild(createSvgElement("circle", {
    cx: x, cy: y, r: radius * 0.78, fill: ink
  }));

  parent.appendChild(createSvgElement("line", {
    x1: x, y1: y, x2: x, y2: y - radius + 4, stroke: "#ffffff", "stroke-width": 1.2, "stroke-linecap": "round"
  }));
}

function drawInputJack(parent, x, y, ink, panel) {
  parent.appendChild(createSvgElement("circle", {
    cx: x, cy: y, r: 12, fill: panel, stroke: ink, "stroke-width": 1.2
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x, cy: y, r: 7, fill: ink
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x, cy: y, r: 2.4, fill: "#000000"
  }));
}

function drawOutputJack(parent, x, y, ink, panel) {
  parent.appendChild(createSvgElement("circle", {
    cx: x, cy: y, r: 13.5, fill: "none", stroke: ink, "stroke-width": 3.2
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x, cy: y, r: 11, fill: panel, stroke: ink, "stroke-width": 1.2
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x, cy: y, r: 7, fill: ink
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x, cy: y, r: 2.4, fill: "#000000"
  }));
}

function drawSlider(parent, x, y, ink, panel) {
  parent.appendChild(createSvgElement("rect", {
    x: x - 4, y: y - 42, width: 8, height: 84, rx: 4, fill: "none", stroke: ink, "stroke-width": 1.2
  }));

  parent.appendChild(createSvgElement("rect", {
    x: x - 11, y: y - 7, width: 22, height: 14, rx: 5, fill: panel, stroke: ink, "stroke-width": 1.2
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x, cy: y - 34, r: 2, fill: ink, opacity: 0.6
  }));

  parent.appendChild(createSvgElement("circle", {
    cx: x, cy: y + 34, r: 2, fill: ink, opacity: 0.6
  }));
}

function buildLayoutGrid(width) {
  const sidePadding = width <= 144 ? 26 : 34;
  const contentWidth = width - sidePadding * 2;

  let colCount;
  if (width <= 108) colCount = 2;
  else if (width <= 144) colCount = 3;
  else if (width <= 216) colCount = 4;
  else if (width <= 288) colCount = 5;
  else colCount = 6;

  const spacing = colCount > 1 ? contentWidth / (colCount - 1) : contentWidth;

  const xPositions = Array.from({ length: colCount }, (_, i) => sidePadding + i * spacing);

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

function getModuleSpec(width, family, rand) {
  if (width <= 108) {
    return {
      titleSize: 11,
      subSize: 7,
      hpSize: 8,
      headerCount: 2,
      large: int(rand, 0, 1),
      medium: int(rand, 1, 2),
      shaft: int(rand, 1, 2),
      inputs: int(rand, 1, 2),
      outputs: int(rand, 1, 2),
      sliderRows: 0
    };
  }

  if (width <= 144) {
    return {
      titleSize: 13,
      subSize: 8,
      hpSize: 9,
      headerCount: 3,
      large: int(rand, 1, 1),
      medium: int(rand, 1, 2),
      shaft: int(rand, 2, 3),
      inputs: int(rand, 2, 3),
      outputs: int(rand, 1, 2),
      sliderRows: family.label === "Sequencer" || family.label === "Mixer" ? 1 : 0
    };
  }

  return {
    titleSize: 18,
    subSize: 10,
    hpSize: 11,
    headerCount: 4,
    large: int(rand, family.label === "Utility" || family.label === "Mixer" ? 0 : 1, 2),
    medium: int(rand, 2, 4),
    shaft: int(rand, 2, 5),
    inputs: int(rand, 2, 4),
    outputs: int(rand, 1, 3),
    sliderRows: family.label === "Sequencer" || family.label === "Mixer" ? int(rand, 1, 2) : int(rand, 0, 1)
  };
}

function getSymmetricSlots(slotCount, fillCount) {
  const center = (slotCount - 1) / 2;
  return Array.from({ length: slotCount }, (_, i) => i)
    .sort((a, b) => Math.abs(a - center) - Math.abs(b - center))
    .slice(0, fillCount)
    .sort((a, b) => a - b);
}

function distributeAcrossRows(indices, rowA, rowB) {
  return indices.map((index, i) => ({
    index,
    y: i % 2 === 0 ? rowA : rowB
  }));
}

function createModule(seed) {
  const rand = mulberry32(seed);
  const familyKey = pick(rand, Object.keys(families));
  const family = families[familyKey];

  const hpOptions = [6, 8, 10, 12, 14, 16, 18, 20, 24, 28];
  const hp = pick(rand, hpOptions);
  const width = hp * 18;
  const height = 740;
  const color = pick(rand, panelColors);
  const ink = pick(rand, inkColors);
  const name = `${pick(rand, wordA)} ${pick(rand, family.wordB)}`.toUpperCase();
  const sub = `${pick(rand, brandMarks)}-${int(rand, 1, 9)}${String.fromCharCode(65 + int(rand, 0, 25))}`;

  const { xPositions, rowYs } = buildLayoutGrid(width);
  const spec = getModuleSpec(width, family, rand);
  const elements = [];
  const occupied = new Set();

  function key(colIndex, rowName) {
    return `${colIndex}-${rowName}`;
  }

  function reserve(colIndex, rowName) {
    occupied.add(key(colIndex, rowName));
  }

  function isFree(colIndex, rowName) {
    return !occupied.has(key(colIndex, rowName));
  }

  function addElement(type, colIndex, rowName, radius, label, isOutput = false) {
    if (!isFree(colIndex, rowName)) return false;
    reserve(colIndex, rowName);
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

  const topLargeSlots = getSymmetricSlots(xPositions.length, Math.min(spec.large, xPositions.length));
  topLargeSlots.forEach((slot) => {
    addElement("knob-lg", slot, "knobTop", 34, pick(rand, labelsByRole.knobLarge));
  });

  const remainingForMedium = Array.from({ length: xPositions.length }, (_, i) => i).filter((i) => isFree(i, "knobMid"));
  const mediumSlots = getSymmetricSlots(remainingForMedium.length, Math.min(spec.medium, remainingForMedium.length))
    .map((i) => remainingForMedium[i]);

  mediumSlots.forEach((slot) => {
    addElement("knob-md", slot, "knobMid", 22, pick(rand, labelsByRole.knobMedium));
  });

  const shaftCandidates = Array.from({ length: xPositions.length }, (_, i) => i).filter((i) => isFree(i, "shaftRow"));
  const shaftSlots = getSymmetricSlots(shaftCandidates.length, Math.min(spec.shaft, shaftCandidates.length))
    .map((i) => shaftCandidates[i]);

  shaftSlots.forEach((slot) => {
    addElement("knob-sm", slot, "shaftRow", 12, pick(rand, labelsByRole.knobShaft));
  });

  if (spec.sliderRows > 0) {
    const sliderChoices = [2, 4, 6, 8].filter((n) => n <= xPositions.length);
    const sliderCountA = sliderChoices.length ? pick(rand, sliderChoices) : 0;
    const sliderSlotsA = getSymmetricSlots(xPositions.length, sliderCountA);

    sliderSlotsA.forEach((slot) => {
      addElement("slider", slot, "sliderRowA", 20, pick(rand, labelsByRole.slider));
    });
  }

  if (spec.sliderRows > 1) {
    const freeForSecondRow = Array.from({ length: xPositions.length }, (_, i) => i).filter((i) => isFree(i, "sliderRowB"));
    const sliderChoicesB = [2, 4, 6].filter((n) => n <= freeForSecondRow.length);
    const sliderCountB = sliderChoicesB.length ? pick(rand, sliderChoicesB) : 0;
    const sliderSlotsB = getSymmetricSlots(freeForSecondRow.length, sliderCountB).map((i) => freeForSecondRow[i]);

    sliderSlotsB.forEach((slot) => {
      addElement("slider", slot, "sliderRowB", 20, pick(rand, labelsByRole.slider));
    });
  }

  const inputCount = Math.min(spec.inputs, xPositions.length * 2);
  const inputSlots = getSymmetricSlots(xPositions.length, Math.min(Math.ceil(inputCount / 2), xPositions.length));
  const distributedInputs = distributeAcrossRows(inputSlots.concat(inputSlots).slice(0, inputCount), "jackRowA", "jackRowB");

  distributedInputs.forEach((item) => {
    if (isFree(item.index, item.y)) {
      addElement("jack", item.index, item.y, 12, pick(rand, labelsByRole.input), false);
    }
  });

  const outputCount = Math.min(spec.outputs, xPositions.length * 2);
  const outputSlots = getSymmetricSlots(xPositions.length, Math.min(Math.ceil(outputCount / 2), xPositions.length));
  const distributedOutputs = distributeAcrossRows(outputSlots.concat(outputSlots).slice(0, outputCount), "jackRowA", "jackRowB");

  distributedOutputs.forEach((item) => {
    if (isFree(item.index, item.y)) {
      addElement("jack", item.index, item.y, 12, pick(rand, labelsByRole.output), true);
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

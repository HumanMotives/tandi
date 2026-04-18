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
generateModule();

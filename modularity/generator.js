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
    counts: { large: [1, 2], medium: [3, 5], shaft: [2, 4], inputs: [4, 7], outputs: [2, 4], sliders: [0, 1] }
  },
  filter: {
    label: "Filter",
    wordB: ["Filter", "Span", "Color", "Trace", "Field", "Kernel"],
    headers: ["FREQ", "Q", "DRIVE", "MIX"],
    counts: { large: [1, 2], medium: [4, 6], shaft: [1, 3], inputs: [4, 7], outputs: [1, 3], sliders: [0, 1] }
  },
  modulation: {
    label: "Modulation",
    wordB: ["Drift", "Orbit", "Bloom", "Atlas", "Flow", "Frame"],
    headers: ["RATE", "SHAPE", "DEPTH", "CV"],
    counts: { large: [1, 2], medium: [4, 6], shaft: [3, 5], inputs: [5, 8], outputs: [2, 4], sliders: [0, 2] }
  },
  sequencer: {
    label: "Sequencer",
    wordB: ["Step", "Array", "Matrix", "Gate", "Dial", "Span"],
    headers: ["STEP", "CLK", "GATE", "RESET"],
    counts: { large: [0, 1], medium: [2, 4], shaft: [6, 10], inputs: [4, 6], outputs: [2, 4], sliders: [2, 5] }
  },
  utility: {
    label: "Utility",
    wordB: ["Merge", "Patch", "Line", "Atlas", "Vector", "Field"],
    headers: ["IN", "OUT", "CV", "MIX"],
    counts: { large: [0, 1], medium: [3, 5], shaft: [4, 8], inputs: [5, 9], outputs: [3, 6], sliders: [0, 2] }
  },
  mixer: {
    label: "Mixer",
    wordB: ["Mix", "Sum", "Merge", "Span", "Field", "Matrix"],
    headers: ["CH", "LEVEL", "PAN", "OUT"],
    counts: { large: [0, 1], medium: [4, 8], shaft: [4, 8], inputs: [6, 10], outputs: [2, 4], sliders: [0, 4] }
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
generateModule();

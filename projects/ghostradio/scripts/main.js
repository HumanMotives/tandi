// scripts/main.js

// 1. Include HTML partials
document.addEventListener('DOMContentLoaded', async () => {
  const includes = document.querySelectorAll('[data-include]');
  for (const el of includes) {
    const path = el.getAttribute('data-include');
    const res = await fetch(path);
    const html = await res.text();
    el.outerHTML = html;
  }

  // After includes are loaded, initialize audio and UI
  initGhostRadio();
});

// 2. Audio context & nodes
const context = new (window.AudioContext || window.webkitAudioContext)();
const analyser = context.createAnalyser();
analyser.fftSize = 2048;
const bufferLength = analyser.fftSize;
const dataArray = new Uint8Array(bufferLength);

// Master gain for fades
const masterGain = context.createGain();
masterGain.gain.value = 0;
analyser.connect(masterGain);
masterGain.connect(context.destination);

// Sound files and buffers
const soundFiles = [
  'sound1.mp3','sound2.mp3','sound3.mp3',
  'sound4.mp3','sound5.mp3','sound6.mp3'
];
const buffers = {};
let layers = [];
let isPlaying = false;

// UI elements (populated after includes)
let powerToggle, randomizeButton, animatSlider, contextSlider;

// Utility
function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

async function preloadAllSounds() {
  const promises = soundFiles.map(async file => {
    const res = await fetch(`/projects/ghostradio/sounds/${file}`);
    const buf = await res.arrayBuffer();
    buffers[file] = await context.decodeAudioData(buf);
  });
  await Promise.all(promises);
}

function playLayer(file) {
  const buffer = buffers[file];
  const source = context.createBufferSource();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();

  // Buffer setup
  source.buffer = buffer;
  source.loop = true;
  source.playbackRate.value = randomInRange(0.9, 1.1);

  // Loop region
  const dur = buffer.duration;
  let start = randomInRange(0, dur * 0.75);
  let length = Math.min(20, Math.max(3, dur - start));
  source.loopStart = start;
  source.loopEnd = start + length;

  // Filter
  filter.type = 'lowpass';
  filter.frequency.value = randomInRange(100, 5000);

  // Fade-in gain
  const baseGain = randomInRange(0.4, 0.7);
  gain.gain.setValueAtTime(0, context.currentTime);
  gain.gain.linearRampToValueAtTime(baseGain, context.currentTime + 3);

  // Connect graph
  source.connect(filter);
  filter.connect(gain);
  gain.connect(analyser);

  // Start
  source.start(context.currentTime, start);
  return { source, gain, filter, baseGain };
}

function applyContextShift(value) {
  layers.forEach(({ gain, baseGain }, index) => {
    let factor = 1;
    if (value < 0.5) {
      if (index === 2) factor = value / 0.5;
    } else {
      if (index === 0) factor = (1 - value) / 0.5;
    }
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.linearRampToValueAtTime(
      baseGain * factor,
      context.currentTime + 0.5
    );
  });
}

function drawWaveform() {
  const canvas = document.getElementById('waveform');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = 200;

  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';

  function draw() {
    requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(dataArray);
    ctx.fillStyle = 'rgba(248, 248, 248, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    const slice = canvas.width / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128;
      const y = v * canvas.height / 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      x += slice;
    }
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }
  draw();
}

// Core controls
function initGhostRadio() {
  powerToggle      = document.getElementById('powerToggle');
  randomizeButton  = document.getElementById('randomizeButton');
  animatSlider     = document.getElementById('animat');
  contextSlider    = document.getElementById('context');

  // Initially hide controls
  document.querySelector('.controls-container').classList.add('hidden');

  // Power toggle
  powerToggle.addEventListener('change', async () => {
    if (powerToggle.checked && !isPlaying) {
      isPlaying = true;
      await context.resume();
      await preloadAllSounds();
      startGhostRadio();
    } else if (!powerToggle.checked && isPlaying) {
      isPlaying = false;
      stopGhostRadio();
    }
  });

  // Randomize
  randomizeButton.addEventListener('click', randomizeGhostRadio);
}

function startGhostRadio() {
  document.querySelector('.controls-container').classList.remove('hidden');
  document.body.classList.add('loaded');

  // Fade in master
  masterGain.gain.cancelScheduledValues(context.currentTime);
  masterGain.gain.linearRampToValueAtTime(1, context.currentTime + 2);

  // Pick and play 3 layers
  const files = [];
  while (files.length < 3) {
    const f = soundFiles[Math.floor(Math.random() * soundFiles.length)];
    if (!files.includes(f)) files.push(f);
  }
  layers = files.map(playLayer);
  drawWaveform();
  applyContextShift(parseFloat(contextSlider.value));
  contextSlider.addEventListener('input', () =>
    applyContextShift(parseFloat(contextSlider.value))
  );
}

function stopGhostRadio() {
  // Fade out master
  masterGain.gain.cancelScheduledValues(context.currentTime);
  masterGain.gain.linearRampToValueAtTime(0, context.currentTime + 2);

  // Stop layers after fade
  setTimeout(() => {
    layers.forEach(({ source, filter, gain }) => {
      try { source.stop(); } catch (e) {}
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    });
    layers = [];
    document.querySelector('.controls-container').classList.add('hidden');
    document.body.classList.remove('loaded');
  }, 2000);
}

function randomizeGhostRadio() {
  if (!isPlaying) return;

  // Fade old layers out
  layers.forEach(({ gain }) => {
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.linearRampToValueAtTime(0, context.currentTime + 2);
  });

  // Stop old after fade
  const old = layers;
  setTimeout(() => {
    old.forEach(l => {
      try { l.source.stop(); } catch (e) {}
      l.source.disconnect(); l.filter.disconnect(); l.gain.disconnect();
    });
  }, 2000);

  // New sliders
  animatSlider.value = Math.random().toFixed(2);
  contextSlider.value = Math.random().toFixed(2);

  // Start new
  const files = [];
  while (files.length < 3) {
    const f = soundFiles[Math.floor(Math.random() * soundFiles.length)];
    if (!files.includes(f)) files.push(f);
  }
  layers = files.map(playLayer);
  applyContextShift(parseFloat(contextSlider.value));
}

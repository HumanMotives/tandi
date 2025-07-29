// scripts/main.js

// 1. Include HTML partials
//    Loads header, waveform, and controls partials into the page.
document.addEventListener('DOMContentLoaded', async () => {
  const includes = document.querySelectorAll('[data-include]');
  for (const el of includes) {
    const path = el.getAttribute('data-include');
    const res = await fetch(path);
    const html = await res.text();
    el.outerHTML = html;
  }

  // After includes are loaded, initialize audio and UI event handlers
  initGhostRadio();
});

// 2. Audio context & nodes setup
const context = new (window.AudioContext || window.webkitAudioContext)();
const analyser = context.createAnalyser();
analyser.fftSize = 2048;
const bufferLength = analyser.fftSize;
const dataArray = new Uint8Array(bufferLength);

// Master gain for fade-in/out
const masterGain = context.createGain();
masterGain.gain.value = 0;
analyser.connect(masterGain);
masterGain.connect(context.destination);

// Sound files
const soundFiles = [
  'sound1.mp3','sound2.mp3','sound3.mp3',
  'sound4.mp3','sound5.mp3','sound6.mp3'
];
const buffers = {};
let layers = [];
let isPlaying = false;

// UI references (populated in init)
let powerToggle, randomizeButton, animatSlider, contextSlider;

// Simple random helper
function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Preload audio buffers
async function preloadAllSounds() {
  const promises = soundFiles.map(async file => {
    const res = await fetch(`/projects/ghostradio/sounds/${file}`);
    const buf = await res.arrayBuffer();
    buffers[file] = await context.decodeAudioData(buf);
  });
  await Promise.all(promises);
}

// Create and start a looped layer
function playLayer(file) {
  const buffer = buffers[file];
  const source = context.createBufferSource();
  const gainNode = context.createGain();
  const filter = context.createBiquadFilter();

  source.buffer = buffer;
  source.loop = true;
  source.playbackRate.value = randomInRange(0.9, 1.1);

  // Random loop segment
  const dur = buffer.duration;
  const start = randomInRange(0, dur * 0.75);
  const length = Math.min(20, Math.max(3, dur - start));
  source.loopStart = start;
  source.loopEnd = start + length;

  filter.type = 'lowpass';
  filter.frequency.value = randomInRange(100, 5000);

  const baseGain = randomInRange(0.4, 0.7);
  gainNode.gain.setValueAtTime(0, context.currentTime);
  gainNode.gain.linearRampToValueAtTime(baseGain, context.currentTime + 3);

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(analyser);

  source.start(context.currentTime, start);
  return { source, gain: gainNode, filter, baseGain };
}

// Crossfade context between layers
function applyContextShift(value) {
  layers.forEach(({ gain, baseGain }, idx) => {
    let factor = 1;
    if (value < 0.5) {
      if (idx === 2) factor = value / 0.5;
    } else {
      if (idx === 0) factor = (1 - value) / 0.5;
    }
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.linearRampToValueAtTime(baseGain * factor, context.currentTime + 0.5);
  });
}

// Draw real-time waveform
function drawWaveform() {
  const canvas = document.getElementById('waveform');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = 200;

  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';

  function draw() {
    requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(dataArray);
    ctx.fillStyle = 'rgba(248,248,248,0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128;
      const y = v * canvas.height / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }
  draw();
}

// Initialize UI event bindings
function initGhostRadio() {
  powerToggle     = document.getElementById('powerToggle');
  randomizeButton = document.getElementById('randomizeButton');
  animatSlider    = document.getElementById('animat');
  contextSlider   = document.getElementById('context');

  // Hide sliders until powered on
  const sliders = document.querySelector('.sliders-container');
  if (sliders) sliders.classList.add('hidden');

  // Power on/off
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

  // Randomize parameters on demand
  randomizeButton.addEventListener('click', randomizeGhostRadio);
}

// Start audio layers & visuals
function startGhostRadio() {
  const sliders = document.querySelector('.sliders-container');
  if (sliders) sliders.classList.remove('hidden');
  document.body.classList.add('loaded');

  // Fade in master
  masterGain.gain.cancelScheduledValues(context.currentTime);
  masterGain.gain.linearRampToValueAtTime(1, context.currentTime + 2);

  // Pick 3 random files and play
  const files = [];
  while (files.length < 3) {
    const f = soundFiles[Math.floor(Math.random() * soundFiles.length)];
    if (!files.includes(f)) files.push(f);
  }
  layers = files.map(playLayer);
  drawWaveform();
  applyContextShift(parseFloat(contextSlider.value));
  contextSlider.addEventListener('input', () => applyContextShift(parseFloat(contextSlider.value)));
}

// Stop all audio with fade out
function stopGhostRadio() {
  masterGain.gain.cancelScheduledValues(context.currentTime);
  masterGain.gain.linearRampToValueAtTime(0, context.currentTime + 2);

  setTimeout(() => {
    layers.forEach(({ source, filter, gain }) => {
      try { source.stop(); } catch (e) {}
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    });
    layers = [];
    const sliders = document.querySelector('.sliders-container');
    if (sliders) sliders.classList.add('hidden');
    document.body.classList.remove('loaded');
  }, 2000);
}

// Smoothly replace layers & parameters
function randomizeGhostRadio() {
  if (!isPlaying) return;

  // Fade out old
  layers.forEach(({ gain }) => {
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.linearRampToValueAtTime(0, context.currentTime + 2);
  });
  const oldLayers = layers;
  setTimeout(() => {
    oldLayers.forEach(({ source, filter, gain }) => {
      try { source.stop(); } catch (e) {}
      source.disconnect(); filter.disconnect(); gain.disconnect();
    });
  }, 2000);

  // Randomize sliders
  animatSlider.value = Math.random().toFixed(2);
  contextSlider.value = Math.random().toFixed(2);

  // Start new layers
  const files = [];
  while (files.length < 3) {
    const f = soundFiles[Math.floor(Math.random() * soundFiles.length)];
    if (!files.includes(f)) files.push(f);
  }
  layers = files.map(playLayer);
  applyContextShift(parseFloat(contextSlider.value));
}

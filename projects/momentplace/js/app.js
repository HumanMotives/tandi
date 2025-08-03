// js/app.js

function initApp() {
  const titleEl   = document.getElementById('step-title');
  const recordBtn = document.getElementById('recordBtn');
  const timerEl   = document.getElementById('timer');
  const progress  = document.getElementById('progress');

  if (!recordBtn) {
    console.error('Recorder partial not loaded');
    return;
  }

  let audioCtx;
  let micStream;
  let recorder;
  let chunks     = [];
  let buffers    = [];
  let current    = 0;
  let timerInterval;
  let startTime;
  let recordTimeout;

  // 1) Pre-request mic access on load
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      micStream = stream;
      recorder  = new MediaRecorder(stream);
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop          = onRecordingStop;
      console.log('🔊 Microphone ready');
    })
    .catch(err => {
      console.warn('⚠️ Microphone permission not granted:', err);
    });

  // 2) Wire up touch + mouse events
  recordBtn.addEventListener('touchstart', startRecording);
  recordBtn.addEventListener('mousedown',  startRecording);
  recordBtn.addEventListener('touchend',   stopRecording);
  recordBtn.addEventListener('mouseup',    stopRecording);

  // 3) Start recording handler
  async function startRecording(e) {
    e.preventDefault();

    // Resume AudioContext if needed (iOS)
    if (audioCtx.state === 'suspended') {
      try { await audioCtx.resume(); }
      catch (err) { console.warn('AudioContext resume error', err); }
    }

    if (!recorder) {
      alert('Please allow microphone access and reload.');
      return;
    }

    recordBtn.classList.add('recording');
    chunks = [];
    recorder.start();

    // Enforce 15 s max
    recordTimeout = setTimeout(() => stopRecording(e), 15000);

    // Show timer
    timerEl.textContent = '0:00';
    timerEl.style.display = 'block';
    startTime      = Date.now();
    timerInterval  = setInterval(updateTimer, 200);
  }

  // 4) Stop recording handler
  function stopRecording(e) {
    e.preventDefault();
    clearTimeout(recordTimeout);
    clearInterval(timerInterval);
    timerEl.style.display = 'none';
    recordBtn.classList.remove('recording');

    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    }
  }

  // 5) Update MM:SS timer display
  function updateTimer() {
    const elapsed  = Date.now() - startTime;
    const totalSec = Math.floor(elapsed / 1000);
    const m        = String(Math.floor(totalSec / 60));
    const s        = String(totalSec % 60).padStart(2, '0');
    timerEl.textContent = `${m}:${s}`;
  }

  // 6) Handle each recording stop
  async function onRecordingStop() {
    const blob     = new Blob(chunks, { type: 'audio/webm' });
    const arrayBuf = await blob.arrayBuffer();
    const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
    buffers.push(audioBuf);

    current++;
    if (current < 3) {
      titleEl.textContent = `Record Moment ${current + 1}`;
    } else {
      titleEl.textContent = 'Building your Moment…';
      showProgressBar();
      await delay(2000);
      playAmbient();
    }
  }

  // 7) Progress bar animation
  function showProgressBar() {
    recordBtn.hidden = true;
    progress.hidden  = false;
    let val = 0;
    const iv = setInterval(() => {
      val += 10;
      progress.value = val;
      if (val >= 100) clearInterval(iv);
    }, 200);
  }

  // 8) Mix & loop playback
  function playAmbient() {
    const masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(audioCtx.destination);

    buffers.forEach(buf => {
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      src.loop   = true;
      src.connect(masterGain);
      src.start();
    });

    titleEl.textContent = 'Here’s your Moment / Place ▶️';
  }

  // 9) Utility delay
  function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
  }
}

// Run once partials are loaded
document.addEventListener('includesLoaded', initApp);

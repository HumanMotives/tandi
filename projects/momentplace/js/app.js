// js/app.js

// Wait for includes.js to load your partials
window.addEventListener('DOMContentLoaded', () => {
  // Grab our UI elements
  const titleEl   = document.getElementById('step-title');
  const recordBtn = document.getElementById('recordBtn');
  const progress  = document.getElementById('progress');

  // Audio state
  let audioCtx, micStream, recorder;
  let chunks = [];           // raw MediaRecorder blobs for the current take
  let buffers = [];          // decoded AudioBuffers
  let current = 0;           // how many moments recorded so far (0–3)

  // 1) Initialize AudioContext + mic
  async function initAudio() {
    audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
    micStream  = await navigator.mediaDevices.getUserMedia({ audio: true });
  }

  // 2) Start & stop recording handlers
  function startRecording() {
    // Resume on iOS first gesture
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Lazy-init MediaRecorder
    if (!recorder) {
      recorder = new MediaRecorder(micStream);
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = onRecordingStop;
    }

    chunks = [];
    recorder.start();
  }

  function stopRecording() {
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    }
  }

  // 3) When each recording stops…
  async function onRecordingStop() {
    // Decode and store
    const blob      = new Blob(chunks, { type: 'audio/webm' });
    const arrayBuf  = await blob.arrayBuffer();
    const audioBuf  = await audioCtx.decodeAudioData(arrayBuf);
    buffers.push(audioBuf);

    current++;
    if (current < 3) {
      // Update the prompt for next moment
      titleEl.textContent = `Record Moment ${current + 1}`;
    } else {
      // All three done: show progress and then play
      showProgressBar();
      await delay(2000);
      playAmbient();
    }
  }

  // 4) Simple progress bar animation
  function showProgressBar() {
    recordBtn.hidden = true;
    progress.hidden  = false;
    let val = 0;
    const interval = setInterval(() => {
      val += 10;
      progress.value = val;
      if (val >= 100) clearInterval(interval);
    }, 200);
  }

  // 5) Utility delay
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 6) Mix & loop your three moments
  function playAmbient() {
    const masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(audioCtx.destination);

    buffers.forEach(buffer => {
      const src = audioCtx.createBufferSource();
      src.buffer = buffer;
      src.loop   = true;
      src.connect(masterGain);
      src.start();
    });

    titleEl.textContent = 'Here’s your Moment / Place ▶️';
  }

  // 7) Wire up the button for both touch and mouse
  recordBtn.addEventListener('touchstart', startRecording);
  recordBtn.addEventListener('mousedown', startRecording);
  recordBtn.addEventListener('touchend',   stopRecording);
  recordBtn.addEventListener('mouseup',    stopRecording);

  // 8) Bootstrap audio (will prompt for mic on iOS/Android)
  initAudio().catch(err => {
    alert('Unable to access microphone. Please enable mic permissions and reload.');
    console.error(err);
  });
});

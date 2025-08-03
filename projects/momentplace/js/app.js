// js/app.js

window.addEventListener('DOMContentLoaded', () => {
  const titleEl   = document.getElementById('step-title');
  const recordBtn = document.getElementById('recordBtn');
  const timerEl   = document.getElementById('timer');
  const progress  = document.getElementById('progress');

  let audioCtx, micStream, recorder;
  let chunks = [], buffers = [], current = 0;
  let timerInterval, startTime;

  // Start recording: invoked on touchstart / mousedown
  async function startRecording(e) {
    e.preventDefault();                    // prevent text selection
    recordBtn.classList.add('recording');

    // Lazily init AudioContext & getUserMedia on first gesture
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (!micStream) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch(err) {
        alert('Mic access is required to record.');
        console.error(err);
        recordBtn.classList.remove('recording');
        return;
      }
    }

    // Lazily init MediaRecorder
    if (!recorder) {
      recorder = new MediaRecorder(micStream);
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = onRecordingStop;
    }

    chunks = [];
    recorder.start();

    // start timer UI
    startTime = Date.now();
    timerEl.textContent = '0:00';
    timerEl.style.display = 'block';
    timerInterval = setInterval(updateTimer, 200);
  }

  // Stop recording: invoked on touchend / mouseup
  function stopRecording(e) {
    e.preventDefault();
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    }
    recordBtn.classList.remove('recording');
    clearInterval(timerInterval);
    timerEl.style.display = 'none';
  }

  // Update MM:SS display
  function updateTimer() {
    const elapsed = Date.now() - startTime;
    const totalSec = Math.floor(elapsed / 1000);
    const m = String(Math.floor(totalSec / 60)).padStart(1, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    timerEl.textContent = `${m}:${s}`;
  }

  // After each sample is recorded
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

  function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
  }

  // Wire up touch + mouse
  recordBtn.addEventListener('touchstart', startRecording);
  recordBtn.addEventListener('mousedown',  startRecording);
  recordBtn.addEventListener('touchend',   stopRecording);
  recordBtn.addEventListener('mouseup',    stopRecording);
});

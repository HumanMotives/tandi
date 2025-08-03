// js/app.js

// wrap everything in initApp
function initApp() {
  const titleEl   = document.getElementById('step-title');
  const recordBtn = document.getElementById('recordBtn');
  const timerEl   = document.getElementById('timer');
  const progress  = document.getElementById('progress');

  if (!recordBtn) {
    console.error('recordBtn not found!');
    return;
  }

  let audioCtx, micStream, recorder;
  let chunks = [], buffers = [], current = 0;
  let timerInterval, startTime;

  recordBtn.addEventListener('touchstart', startRecording);
  recordBtn.addEventListener('mousedown',  startRecording);
  recordBtn.addEventListener('touchend',   stopRecording);
  recordBtn.addEventListener('mouseup',    stopRecording);

  async function startRecording(e) {
    e.preventDefault();
    console.log('⏺️ startRecording');
    recordBtn.classList.add('recording');

    // lazy init AudioContext & mic
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (!micStream) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Mic stream acquired');
      } catch(err) {
        alert('🛑 Mic access denied or unavailable.');
        console.error(err);
        recordBtn.classList.remove('recording');
        return;
      }
    }

    // lazy init MediaRecorder
    if (!recorder) {
      recorder = new MediaRecorder(micStream);
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = onRecordingStop;
    }

    chunks = [];
    recorder.start();
    startTimer();
  }

  function stopRecording(e) {
    e.preventDefault();
    console.log('⏹️ stopRecording');
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    }
    recordBtn.classList.remove('recording');
    stopTimer();
  }

  function startTimer() {
    timerEl.textContent = '0:00';
    timerEl.style.display = 'block';
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 200);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerEl.style.display = 'none';
  }

  function updateTimer() {
    const elapsed = Date.now() - startTime;
    const totalSec = Math.floor(elapsed / 1000);
    const m = String(Math.floor(totalSec / 60));
    const s = String(totalSec % 60).padStart(2, '0');
    timerEl.textContent = `${m}:${s}`;
  }

  async function onRecordingStop() {
    console.log('Recording stopped, decoding…');
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
    console.log('▶️ playAmbient');
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
}

// only run once partials are in place
document.addEventListener('includesLoaded', initApp);

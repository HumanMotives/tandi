// js/app.js

// Once your partials (camera, recorder, etc.) are in the DOM:
document.addEventListener('includesLoaded', initApp);

function initApp() {
  //
  // === CAMERA SETUP ===
  //
  const cameraSection     = document.getElementById('cameraSection');
  const cameraVideo       = document.getElementById('cameraVideo');
  const captureBtn        = document.getElementById('captureBtn');
  const recorderContainer = document.getElementById('recorderContainer');

  // start hidden until we capture
  recorderContainer.hidden = true;

  // ask for back-facing camera
  navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false
  })
  .then(stream => {
    cameraVideo.srcObject = stream;
  })
  .catch(err => {
    alert('📷 Please enable camera permissions and reload.');
    console.error(err);
  });

  // when user snaps photo:
  captureBtn.addEventListener('click', () => {
    // 1. Compute square dimensions
    const vw   = cameraVideo.videoWidth;
    const vh   = cameraVideo.videoHeight;
    const size = Math.min(vw, vh);

    // 2. Draw a centered square from the video into a canvas
    const canvas = document.createElement('canvas');
    canvas.width  = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const sx = (vw - size) / 2;
    const sy = (vh - size) / 2;
    ctx.drawImage(cameraVideo, sx, sy, size, size, 0, 0, size, size);

    // 3. Replace cameraSection with the cropped snapshot
    const img = document.createElement('img');
    img.src       = canvas.toDataURL('image/png');
    img.className = 'snapshot';
    cameraSection.replaceWith(img);

    // 4. Stop camera tracks
    cameraVideo.srcObject.getTracks().forEach(t => t.stop());

    // 5. Reveal recorder UI
    recorderContainer.hidden = false;

    // 6. Initialize recorder logic
    setupRecorder();
  });
}

// Recorder & Playback setup
function setupRecorder() {
  const titleEl       = document.getElementById('step-title');
  const recordBtn     = document.getElementById('recordBtn');
  const timerEl       = document.getElementById('timer');
  const progress      = document.getElementById('progress');
  const controlsPanel = document.getElementById('controlsContainer');
  const downloadLink  = document.getElementById('downloadLink');

  let audioCtx, micStream, recorder;
  let chunks   = [];
  let buffers  = [];
  let current  = 0;
  let timerInt, startTime, recordTO;

  // wire record button
  recordBtn.addEventListener('touchstart', startRecording);
  recordBtn.addEventListener('mousedown',  startRecording);
  recordBtn.addEventListener('touchend',   stopRecording);
  recordBtn.addEventListener('mouseup',    stopRecording);

  async function startRecording(e) {
    e.preventDefault();
    recordBtn.classList.add('recording');

    // ensure AudioContext
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    // ask mic if needed
    if (!micStream) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch(err) {
        alert('🎙️ Please enable mic permissions and try again.');
        console.error(err);
        recordBtn.classList.remove('recording');
        return;
      }
    }

    // init MediaRecorder
    if (!recorder) {
      recorder = new MediaRecorder(micStream);
      recorder.ondataavailable = ev => chunks.push(ev.data);
      recorder.onstop          = onRecordingStop;
    }

    chunks = [];
    recorder.start();

    // 15s max
    recordTO = setTimeout(() => stopRecording(e), 15000);

    // show timer
    timerEl.textContent = '0:00';
    timerEl.style.display = 'block';
    startTime    = Date.now();
    timerInt     = setInterval(updateTimer, 200);
  }

  function stopRecording(e) {
    e.preventDefault();
    clearTimeout(recordTO);
    clearInterval(timerInt);
    timerEl.style.display = 'none';
    recordBtn.classList.remove('recording');

    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    }
  }

  function updateTimer() {
    const elapsed = Date.now() - startTime;
    const secs    = Math.floor(elapsed / 1000);
    const m       = Math.floor(secs / 60);
    const s       = secs % 60;
    timerEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
  }

  async function onRecordingStop() {
    // decode and store
    const blob     = new Blob(chunks, { type: 'audio/webm' });
    const arrBuf   = await blob.arrayBuffer();
    const audioBuf = await audioCtx.decodeAudioData(arrBuf);
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
    let v = 0;
    const iv = setInterval(() => {
      v += 10;
      progress.value = v;
      if (v >= 100) clearInterval(iv);
    }, 200);
  }

  function playAmbient() {
    // basic mix
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

    // reveal controls
    if (controlsPanel) controlsPanel.hidden = false;

    // set up download link
    if (downloadLink) {
      const dest      = audioCtx.createMediaStreamDestination();
      masterGain.connect(dest);
      const longest   = Math.max(...buffers.map(b => b.duration));
      const mixRec    = new MediaRecorder(dest.stream);
      const mixChunks = [];

      mixRec.ondataavailable = e => mixChunks.push(e.data);
      mixRec.onstop = () => {
        const mixBlob = new Blob(mixChunks, { type: 'audio/webm' });
        const url     = URL.createObjectURL(mixBlob);
        downloadLink.href     = url;
        downloadLink.download = 'moment-place.webm';
        downloadLink.hidden   = false;
      };

      mixRec.start();
      setTimeout(() => mixRec.stop(), longest * 1000 + 200);
    }
  }

  function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
  }
}

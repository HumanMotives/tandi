// js/app.js

// Once your partials are injected:
document.addEventListener('includesLoaded', initApp);

function initApp() {
  // === SCREEN CONTAINERS ===
  const welcomeContainer  = document.getElementById('welcomeContainer');
  const cameraContainer   = document.getElementById('cameraContainer');
  const recorderContainer = document.getElementById('recorderContainer');
  const playbackContainer = document.getElementById('playbackContainer');

  // === WELCOME ELEMENTS ===
  const startBtn = document.getElementById('welcomeCreateBtn');

  // === CAMERA ELEMENTS ===
  const cameraVideo = document.getElementById('cameraVideo');
  const captureBtn  = document.getElementById('captureBtn');

  // The photo data
  let snapshotDataURL = null;

  // === INITIAL STATE ===
  welcomeContainer.hidden   = false;
  cameraContainer.hidden    = true;
  recorderContainer.hidden  = true;
  playbackContainer.hidden  = true;
  captureBtn.disabled       = true;

  // === STEP 1: START BUTTON ===
  startBtn.addEventListener('click', async () => {
    // Switch screens
    welcomeContainer.hidden = true;
    cameraContainer.hidden  = false;

    // Ask for camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      cameraVideo.srcObject    = stream;
      cameraVideo.muted        = true;  // iOS autoplay
      cameraVideo.playsInline  = true;
      await cameraVideo.play();
      captureBtn.disabled = false;
    } catch (err) {
      alert('📷 Please allow camera access to continue.');
      console.error(err);
    }
  });

  // === STEP 2: CAPTURE PHOTO ===
  captureBtn.addEventListener('click', () => {
    // Compute a centered square
    const vw   = cameraVideo.videoWidth;
    const vh   = cameraVideo.videoHeight;
    const size = Math.min(vw, vh);

    const canvas = document.createElement('canvas');
    canvas.width  = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const sx = (vw - size) / 2;
    const sy = (vh - size) / 2;
    ctx.drawImage(cameraVideo, sx, sy, size, size, 0, 0, size, size);

    // Save the data URL
    snapshotDataURL = canvas.toDataURL('image/png');

    // Stop camera
    cameraVideo.srcObject.getTracks().forEach(t => t.stop());

    // Move to recorder
    cameraContainer.hidden   = true;
    recorderContainer.hidden = false;
    setupRecorder();
  });

  // === STEP 3: RECORD AUDIO ===
  function setupRecorder() {
    const stepTitle   = document.getElementById('step-title');
    const recordBtn   = document.getElementById('recordBtn');
    const timerEl     = document.getElementById('timer');
    const progressEl  = document.getElementById('progress');
    const downloadLink= document.getElementById('downloadLink');
    const playbackImg = document.getElementById('playbackImage');

    let audioCtx, micStream, recorder;
    let chunks = [], buffers = [];
    let current = 0;
    let timerInt, startTime, recordTO;

    // Initial UI
    recordBtn.hidden  = false;
    progressEl.hidden = true;
    downloadLink.hidden = true;

    // Wire up recording
    recordBtn.addEventListener('touchstart', startRecording);
    recordBtn.addEventListener('mousedown',  startRecording);
    recordBtn.addEventListener('touchend',   stopRecording);
    recordBtn.addEventListener('mouseup',    stopRecording);

    async function startRecording(e) {
      e.preventDefault();
      recordBtn.classList.add('recording');

      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (!micStream) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
          alert('🎙️ Please allow mic access to record.');
          console.error(err);
          recordBtn.classList.remove('recording');
          return;
        }
      }

      if (!recorder) {
        recorder = new MediaRecorder(micStream);
        recorder.ondataavailable = ev => chunks.push(ev.data);
        recorder.onstop          = onRecordingStop;
      }

      chunks = [];
      recorder.start();

      // 15s cap
      recordTO = setTimeout(() => stopRecording(e), 15000);

      // Show timer
      timerEl.textContent = '0:00';
      timerEl.style.display = 'block';
      startTime   = Date.now();
      timerInt    = setInterval(updateTimer, 200);
    }

    function stopRecording(e) {
      e.preventDefault();
      clearTimeout(recordTO);
      clearInterval(timerInt);
      timerEl.style.display = 'none';
      recordBtn.classList.remove('recording');
      if (recorder && recorder.state === 'recording') recorder.stop();
    }

    function updateTimer() {
      const elapsed = Date.now() - startTime;
      const secs    = Math.floor(elapsed / 1000);
      const m       = Math.floor(secs / 60);
      const s       = secs % 60;
      timerEl.textContent = `${m}:${String(s).padStart(2,'0')}`;
    }

    async function onRecordingStop() {
      // Decode and store
      const blob    = new Blob(chunks, { type: 'audio/webm' });
      const arrayBuf= await blob.arrayBuffer();
      const audioBuf= await audioCtx.decodeAudioData(arrayBuf);
      buffers.push(audioBuf);

      current++;
      if (current < 3) {
        stepTitle.textContent = `Record Moment ${current + 1}`;
      } else {
        stepTitle.textContent = 'Building your Moment…';
        showProgress();
        await delay(2000);
        playAmbient();
      }
    }

    function showProgress() {
      recordBtn.hidden  = true;
      progressEl.hidden = false;
      let v = 0;
      const iv = setInterval(() => {
        v += 10;
        progressEl.value = v;
        if (v >= 100) clearInterval(iv);
      }, 200);
    }

    function playAmbient() {
      // Mix & loop
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

      stepTitle.textContent = 'Here’s your Moment / Place ▶️';

      // Record the final mix to a downloadable blob
      const dest = audioCtx.createMediaStreamDestination();
      masterGain.connect(dest);
      const longest = Math.max(...buffers.map(b=>b.duration));
      const mixRec  = new MediaRecorder(dest.stream);
      const mixChunks = [];

      mixRec.ondataavailable = e => mixChunks.push(e.data);
      mixRec.onstop = () => {
        const mixBlob = new Blob(mixChunks, { type:'audio/webm' });
        const url     = URL.createObjectURL(mixBlob);
        downloadLink.href      = url;
        downloadLink.download  = 'moment-place.webm';
        downloadLink.hidden    = false;

        // Switch to playback screen
        recorderContainer.hidden = true;
        playbackContainer.hidden = false;
        if (playbackImg && snapshotDataURL) {
          playbackImg.src = snapshotDataURL;
        }
      };

      mixRec.start();
      setTimeout(() => mixRec.stop(), longest * 1000 + 200);
    }

    function delay(ms) {
      return new Promise(res => setTimeout(res, ms));
    }
  }
}

// js/app.js

document.addEventListener('includesLoaded', initApp);

function initApp() {
  // --- Screen containers ---
  const welcomeContainer   = document.getElementById('welcomeContainer');
  const cameraContainer    = document.getElementById('cameraContainer');
  const snapshotContainer  = document.getElementById('snapshotContainer');
  const recorderContainer  = document.getElementById('recorderContainer');
  const playbackContainer  = document.getElementById('playbackContainer');

  // --- Welcome UI ---
  const startBtn = document.getElementById('welcomeCreateBtn');

  // --- Camera UI ---
  const cameraVideo       = document.getElementById('cameraVideo');
  const captureBtn        = document.getElementById('captureBtn');

  // --- Snapshot UI ---
  const snapshotImage       = document.getElementById('snapshotImage');
  const snapshotContinueBtn = document.getElementById('snapshotContinueBtn');

  // --- Recorder UI ---
  const stepTitle    = document.getElementById('step-title');
  const recordBtn    = document.getElementById('recordBtn');
  const timerEl      = document.getElementById('timer');
  const progressEl   = document.getElementById('progress');
  const downloadLink = document.getElementById('downloadLink');

  // --- Playback UI ---
  const playbackImg  = document.getElementById('playbackImage');

  // --- State ---
  let cameraStream     = null;
  let snapshotDataURL  = null;

  // --- Initial visibility ---
  welcomeContainer.style.display   = 'block';
  cameraContainer.style.display    = 'none';
  snapshotContainer.style.display  = 'none';
  recorderContainer.style.display  = 'none';
  playbackContainer.style.display  = 'none';

  resetCameraUI();

  // STEP 1: Welcome → Camera
  startBtn.addEventListener('click', () => {
    welcomeContainer.style.display  = 'none';
    cameraContainer.style.display   = 'flex';
    snapshotContainer.style.display = 'none';
    recorderContainer.style.display = 'none';
    playbackContainer.style.display = 'none';
    resetCameraUI();
    cameraStream = null;
  });

  // STEP 2: Enable Camera vs. Capture Photo
  captureBtn.addEventListener('click', async () => {
    // PHASE 1: request & preview
    if (!cameraStream) {
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });
      } catch {
        alert('📷 Please allow camera access.');
        return;
      }
      cameraVideo.srcObject   = cameraStream;
      cameraVideo.muted       = true;
      cameraVideo.playsInline = true;
      await cameraVideo.play();
      captureBtn.textContent = '📸 Capture Photo';
      return;
    }

    // PHASE 2: snapshot
    const vw   = cameraVideo.videoWidth;
    const vh   = cameraVideo.videoHeight;
    const size = Math.min(vw, vh);
    const canvas = document.createElement('canvas');
    canvas.width  = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      cameraVideo,
      (vw - size)/2, (vh - size)/2,
      size, size,
      0, 0,
      size, size
    );
    snapshotDataURL = canvas.toDataURL('image/png');

    // show snapshot scene
    cameraContainer.style.display   = 'none';
    snapshotContainer.style.display = 'flex';
    snapshotImage.src               = snapshotDataURL;

    // stop camera
    cameraStream.getTracks().forEach(t => t.stop());
  });

  // STEP 3: Snapshot → Recorder
  snapshotContinueBtn.addEventListener('click', () => {
    snapshotContainer.style.display  = 'none';
    recorderContainer.style.display  = 'block';
    setupRecorder();
  }, { once: true });

  // STEP 4 & 5: Recorder & Playback
  function setupRecorder() {
    // initialize recorder UI
    recordBtn.hidden    = false;
    timerEl.hidden      = true;
    progressEl.hidden   = true;
    downloadLink.hidden = true;

    let audioCtx, micStream, recorder;
    let chunks = [], buffers = [];
    let current = 0;
    let timerInt, startTime, recordTO;

    // wire record events
    recordBtn.addEventListener('touchstart', startRecording);
    recordBtn.addEventListener('mousedown',  startRecording);
    recordBtn.addEventListener('touchend',   stopRecording);
    recordBtn.addEventListener('mouseup',    stopRecording);

    async function startRecording(e) {
      e.preventDefault();
      recordBtn.classList.add('recording');
      timerEl.hidden = false;

      if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
      if (!micStream) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          alert('🎙️ Please allow mic access.');
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
      recordTO = setTimeout(() => stopRecording(e), 15000);
      startTime = Date.now();
      timerInt  = setInterval(updateTimer, 200);
    }

    function stopRecording(e) {
      e.preventDefault();
      clearTimeout(recordTO);
      clearInterval(timerInt);
      recordBtn.classList.remove('recording');
      timerEl.hidden = true;
      if (recorder && recorder.state === 'recording') recorder.stop();
    }

    function updateTimer() {
      const secs = Math.floor((Date.now() - startTime)/1000);
      timerEl.textContent = `${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}`;
    }

    async function onRecordingStop() {
      // hide record button, show progress
      recordBtn.hidden  = true;
      progressEl.hidden = false;

      const blob     = new Blob(chunks,{type:'audio/webm'});
      const arrBuf   = await blob.arrayBuffer();
      const audioBuf = await audioCtx.decodeAudioData(arrBuf);
      buffers.push(audioBuf);
      current++;

      if (current < 3) {
        // ready for next clip
        stepTitle.textContent = `Record Moment ${current + 1}`;
        recordBtn.hidden      = false;
        progressEl.hidden     = true;
      } else {
        // final clip done → compile mix & go to playback
        stepTitle.textContent = 'Compiling your Moment…';
        finalizeMix(buffers, audioCtx);
      }
    }

    function finalizeMix(buffers, audioCtx) {
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

      const dest    = audioCtx.createMediaStreamDestination();
      masterGain.connect(dest);

      const longest = Math.max(...buffers.map(b=>b.duration));
      const mixRec  = new MediaRecorder(dest.stream);
      const mixChunks = [];

      mixRec.ondataavailable = e => mixChunks.push(e.data);
      mixRec.onstop = () => {
        const mixBlob = new Blob(mixChunks,{type:'audio/webm'});
        const url     = URL.createObjectURL(mixBlob);

        downloadLink.href     = url;
        downloadLink.download = 'moment-place.webm';
        downloadLink.hidden   = false;

        recorderContainer.style.display = 'none';
        playbackContainer.style.display = 'block';
        if (playbackImg) playbackImg.src = snapshotDataURL;
      };

      mixRec.start();
      setTimeout(() => mixRec.stop(), longest*1000 + 200);
    }
  }

  // helper to reset camera UI
  function resetCameraUI() {
    captureBtn.textContent          = '📷 Enable Camera';
    captureBtn.style.display        = 'inline-block';
    cameraVideo.style.display       = 'block';
    snapshotImage && (snapshotImage.style.display     = 'none');
    snapshotContainer.style.display = 'none';
  }
}

// js/app.js

// Wait for partials to load
document.addEventListener('includesLoaded', initApp);

function initApp() {
  // --- Screen containers ---
  const welcomeContainer  = document.getElementById('welcomeContainer');
  const cameraContainer   = document.getElementById('cameraContainer');
  const recorderContainer = document.getElementById('recorderContainer');
  const playbackContainer = document.getElementById('playbackContainer');

  // --- Welcome elements ---
  const startBtn = document.getElementById('welcomeCreateBtn');

  // --- Camera elements ---
  const cameraVideo = document.getElementById('cameraVideo');
  const captureBtn  = document.getElementById('captureBtn');

  // --- Snapshot holder ---
  let snapshotDataURL = null;

  // --- Initial state ---
  welcomeContainer.style.display   = 'block';
  cameraContainer.style.display    = 'none';
  recorderContainer.style.display  = 'none';
  playbackContainer.style.display  = 'none';
  captureBtn.disabled              = true;

  // --- Step 1: Show camera scene on Create ---
  startBtn.addEventListener('click', () => {
    welcomeContainer.style.display = 'none';
    cameraContainer.style.display  = 'flex';  // or 'block' per your CSS
    captureBtn.disabled = false;
  });

  // --- Step 2: Capture Photo & ask permission here ---
  captureBtn.addEventListener('click', async () => {
    captureBtn.disabled = true;

    // 1️⃣ Request camera
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
    } catch (err) {
      alert('📷 Please allow camera access to continue.');
      console.error(err);
      captureBtn.disabled = false;
      return;
    }

    // 2️⃣ Show live video briefly (optional)
    cameraVideo.srcObject   = stream;
    cameraVideo.muted       = true;
    cameraVideo.playsInline = true;
    await cameraVideo.play();

    // 3️⃣ Crop & snapshot
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
    snapshotDataURL = canvas.toDataURL('image/png');

    // 4️⃣ Tear down stream
    stream.getTracks().forEach(t => t.stop());

    // 5️⃣ Move to recorder
    cameraContainer.style.display   = 'none';
    recorderContainer.style.display = 'block';
    setupRecorder();
  });

  // --- Steps 3 & 4: Recorder & Playback (unchanged) ---
  function setupRecorder() {
    // … your existing recorder + playback code …
  }
}

// js/app.js

// Wait for partials injection
document.addEventListener('includesLoaded', initApp);

function initApp() {
  // Screen containers
  const welcomeContainer  = document.getElementById('welcomeContainer');
  const cameraContainer   = document.getElementById('cameraContainer');
  const recorderContainer = document.getElementById('recorderContainer');
  const playbackContainer = document.getElementById('playbackContainer');

  // UI Elements
  const startBtn    = document.getElementById('welcomeCreateBtn');
  const cameraVideo = document.getElementById('cameraVideo');
  const captureBtn  = document.getElementById('captureBtn');

  // State
  let cameraStream       = null;
  let snapshotDataURL    = null;

  // Initial visibility
  welcomeContainer.style.display   = 'block';
  cameraContainer.style.display    = 'none';
  recorderContainer.style.display  = 'none';
  playbackContainer.style.display  = 'none';

  // Prepare the capture button
  captureBtn.disabled    = true;
  captureBtn.textContent = '📷 Enable Camera';

  // STEP 1: Show camera UI
  startBtn.addEventListener('click', () => {
    welcomeContainer.style.display = 'none';
    cameraContainer.style.display  = 'flex';
    captureBtn.disabled            = false;
  });

  // STEP 2: Enable / Capture
  captureBtn.addEventListener('click', async () => {
    // Phase 1: enable camera
    if (!cameraStream) {
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });
      } catch (err) {
        alert('📷 Please allow camera access to continue.');
        console.error(err);
        return;
      }

      // show live preview
      cameraVideo.srcObject   = cameraStream;
      cameraVideo.muted       = true;
      cameraVideo.playsInline = true;
      await cameraVideo.play();

      // switch button into “snapshot” mode
      captureBtn.textContent = '📸 Capture Photo';
      return;
    }

    // Phase 2: snapshot & proceed
    // compute square crop
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

    // stop camera
    cameraStream.getTracks().forEach(t => t.stop());

    // move to recorder
    cameraContainer.style.display   = 'none';
    recorderContainer.style.display = 'block';
    setupRecorder();
  });

  // STEP 3 & 4: Recorder + Playback
  function setupRecorder() {
    /* your existing recorder/playback code */
  }
}

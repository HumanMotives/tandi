// js/app.js

// Wait until your partials (welcome, camera, recorder, playback) are in the DOM
document.addEventListener('includesLoaded', initApp);

function initApp() {
  // --- SCREEN CONTAINERS ---
  const welcomeContainer  = document.getElementById('welcomeContainer');
  const cameraContainer   = document.getElementById('cameraContainer');
  const recorderContainer = document.getElementById('recorderContainer');
  const playbackContainer = document.getElementById('playbackContainer');

  // --- WELCOME ELEMENTS ---
  const startBtn = document.getElementById('welcomeCreateBtn');

  // --- CAMERA ELEMENTS ---
  const cameraVideo = document.getElementById('cameraVideo');
  const captureBtn  = document.getElementById('captureBtn');

  // --- INITIAL VISIBILITY ---
  welcomeContainer.hidden   = false;  // show welcome
  cameraContainer.hidden    = true;   // hide camera
  recorderContainer.hidden  = true;   // hide recorder
  playbackContainer.hidden  = true;   // hide playback
  captureBtn.disabled       = true;   // disable until camera is running

  // --- STEP 1: START FLOW on Create click ---
  startBtn.addEventListener('click', async () => {
    // 1️⃣ Hide welcome, show camera
    welcomeContainer.hidden = true;
    cameraContainer.hidden  = false;

    // 2️⃣ Ask for back-camera permission and start preview
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      cameraVideo.srcObject   = stream;
      cameraVideo.muted       = true;  // allow autoplay in Safari
      cameraVideo.playsInline = true;  // prevent fullscreen on iOS
      await cameraVideo.play();
      captureBtn.disabled = false;      // now user can tap Capture
    } catch (err) {
      alert('📷 Please allow camera access to continue.');
      console.error(err);
      // Optionally: show welcome again or offer a “Skip” path
      welcomeContainer.hidden = false;
      cameraContainer.hidden  = true;
    }
  });

  // --- STEP 2: CAPTURE PHOTO (stub) ---
  captureBtn.addEventListener('click', () => {
    // Your existing capture logic (canvas cropping, etc.) goes here.
    //
    // Once you have the photo:
    //   • Stop the camera tracks
    //   • Hide cameraContainer
    //   • Show recorderContainer
    //   • Initialize your recorder logic
    //
    // Example:
    //
    // cameraContainer.hidden   = true;
    // recorderContainer.hidden = false;
    // setupRecorderWith(photoDataURL);
  });
}

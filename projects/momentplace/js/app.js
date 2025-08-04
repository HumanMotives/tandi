// js/app.js

// Make sure you’ve included the Supabase UMD script in your HTML:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/umd/supabase.min.js"></script>

document.addEventListener('includesLoaded', initApp);

function initApp() {
  // --- Supabase client init ---
  const supabaseUrl = 'https://owaqngnojlbnbiyala.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93YXFuZ25vamxibmJpeGFpbGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyOTM0MDAsImV4cCI6MjA2OTg2OTQwMH0.0FeffoKhv89b9Z9iUuZBNQYOSqoA8kSCQeN7lka4A_g';
  const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

  // --- Screen containers ---
  const welcomeContainer   = document.getElementById('welcomeContainer');
  const cameraContainer    = document.getElementById('cameraContainer');
  const snapshotContainer  = document.getElementById('snapshotContainer');
  const recorderContainer  = document.getElementById('recorderContainer');
  const playbackContainer  = document.getElementById('playbackContainer');

  // --- Welcome UI ---
  const startBtn = document.getElementById('welcomeCreateBtn');

  // --- Camera UI ---
  const cameraVideo = document.getElementById('cameraVideo');
  const captureBtn  = document.getElementById('captureBtn');

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
  const playbackImg = document.getElementById('playbackImage');
  const publishBtn  = document.getElementById('publishBtn');

  // --- State ---
  let cameraStream    = null;
  let snapshotDataURL = null;
  let finalAudioBlob  = null;

  // --- Initial visibility ---
  welcomeContainer.style.display   = 'block';
  cameraContainer.style.display    = 'none';
  snapshotContainer.style.display  = 'none';
  recorderContainer.style.display  = 'none';
  playbackContainer.style.display  = 'none';

  resetCameraUI();

  // STEP 1: Welcome → Camera
  startBtn.addEventListener('click', () => {
    welcomeContainer.style.display   = 'none';
    cameraContainer.style.display    = 'flex';
    snapshotContainer.style.display  = 'none';
    recorderContainer.style.display  = 'none';
    playbackContainer.style.display  = 'none';
    resetCameraUI();
    cameraStream = null;
  });

  // STEP 2: Enable Camera vs. Capture Photo
  captureBtn.addEventListener('click', async () => {
    // Phase 1: request & preview
    if (!cameraStream) {
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });
      } catch {
        return alert('📷 Please allow camera access.');
      }
      cameraVideo.srcObject   = cameraStream;
      cameraVideo.muted       = true;
      cameraVideo.playsInline = true;
      await cameraVideo.play();
      captureBtn.textContent = '📸 Capture Photo';
      return;
    }

    // Phase 2: snapshot
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
    cameraContainer.style.display    = 'none';
    snapshotContainer.style.display  = 'flex';
    snapshotImage.src                = snapshotDataURL;
    snapshotImage.style.display      = 'block';

    // stop camera
    cameraStream.getTracks().forEach(t => t.stop());
  });

  // STEP 3: Snapshot → Recorder
  snapshotContinueBtn.addEventListener('click', () => {
    snapshotContainer.style.display   = 'none';
    recorderContainer.style.display   = 'flex';
    setupRecorder();
  }, { once: true });

  // STEP 4 & 5: Recorder & Playback
  function setupRecorder() {
    // init UI
    recordBtn.hidden    = false;
    timerEl.hidden      = true;
    progressEl.hidden   = true;
    downloadLink.hidden = true;

    let audioCtx, micStream, recorder;
    let chunks  = [];
    let buffers = [];
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
          recordBtn.classList.remove('recording');
          return alert('🎙️ Please allow mic access.');
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
      // hide record, show progress
      recordBtn.hidden  = true;
      progressEl.hidden = false;

      const blob     = new Blob(chunks, { type:'audio/webm' });
      const arrBuf   = await blob.arrayBuffer();
      const audioBuf = await audioCtx.decodeAudioData(arrBuf);
      buffers.push(audioBuf);
      current++;

      if (current < 3) {
        stepTitle.textContent = `Record Moment ${current + 1}`;
        recordBtn.hidden      = false;
        progressEl.hidden     = true;
      } else {
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
      mixRec.onstop = async () => {
        const mixBlob = new Blob(mixChunks,{type:'audio/webm'});
        const url     = URL.createObjectURL(mixBlob);

        downloadLink.href     = url;
        downloadLink.download = 'moment-place.webm';
        downloadLink.hidden   = false;
        finalAudioBlob        = mixBlob;

        // show playback
        recorderContainer.style.display = 'none';
        playbackContainer.style.display = 'block';
        playbackImg.src                  = snapshotDataURL;
      };

      mixRec.start();
      setTimeout(() => mixRec.stop(), longest * 1000 + 200);
    }

    // STEP 6: Publish → Supabase
    publishBtn.addEventListener('click', async () => {
      if (!snapshotDataURL || !finalAudioBlob) {
        return alert('Nothing to publish!');
      }
      // prepare blobs
      const imgRes    = await fetch(snapshotDataURL);
      const imgBlob   = await imgRes.blob();
      const audioBlob = finalAudioBlob;

      // unique folder per moment
      const id = Date.now().toString();

      // upload cover
      const { data: imgData, error: imgError } = await supabaseClient
        .storage
        .from('momentplaces')
        .upload(`${id}/cover.png`, imgBlob);

      // upload audio
      const { data: audioData, error: audioError } = await supabaseClient
        .storage
        .from('momentplaces')
        .upload(`${id}/audio.webm`, audioBlob);

      if (imgError || audioError) {
        console.error(imgError || audioError);
        return alert('❌ Failed to publish.');
      }

      // build public URLs
      const coverUrl = supabaseClient
        .storage
        .from('momentplaces')
        .getPublicUrl(`${id}/cover.png`)
        .publicURL;
      const audioUrl = supabaseClient
        .storage
        .from('momentplaces')
        .getPublicUrl(`${id}/audio.webm`)
        .publicURL;

      console.log('Published!', { coverUrl, audioUrl });
      alert('✅ Your Moment is published!');
    });
  }

  // helper to reset camera UI
  function resetCameraUI() {
    captureBtn.textContent       = '📷 Enable Camera';
    captureBtn.style.display     = 'inline-block';
    cameraVideo.style.display    = 'block';
    snapshotImage.style.display  = 'none';
  }
}

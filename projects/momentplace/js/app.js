// js/app.js
document.addEventListener('includesLoaded', initApp);

function initApp() {
  // Containers
  const welcomeContainer  = document.getElementById('welcomeContainer');
  const cameraContainer   = document.getElementById('cameraContainer');
  const recorderContainer = document.getElementById('recorderContainer');
  const playbackContainer = document.getElementById('playbackContainer');

  // Welcome
  const startBtn = document.getElementById('welcomeCreateBtn');

  // Camera
  const cameraVideo      = document.getElementById('cameraVideo');
  const captureBtn       = document.getElementById('captureBtn');
  const cameraSnapshot   = document.getElementById('cameraSnapshot');
  const cameraContinueBtn= document.getElementById('cameraContinueBtn');

  // State
  let cameraStream = null;

  // Initial visibility
  welcomeContainer.style.display   = 'block';
  cameraContainer.style.display    = 'none';
  recorderContainer.style.display  = 'none';
  playbackContainer.style.display  = 'none';

  // Configure buttons
  captureBtn.textContent  = '📷 Enable Camera';
  cameraSnapshot.hidden   = true;
  cameraContinueBtn.hidden= true;

  // === STEP 1: Start → show camera ===
  startBtn.addEventListener('click', () => {
    welcomeContainer.style.display = 'none';
    cameraContainer.style.display  = 'flex';
    captureBtn.textContent         = '📷 Enable Camera';
    cameraSnapshot.hidden          = true;
    cameraContinueBtn.hidden       = true;
    cameraVideo.hidden             = false;
    cameraStream                   = null;
  });

  // === STEP 2: Enable vs Capture on same button ===
  captureBtn.addEventListener('click', async () => {
    // Phase 1: request permission & live preview
    if (!cameraStream) {
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
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
      (vw-size)/2, (vh-size)/2, size, size,
      0,0, size, size
    );
    const dataURL = canvas.toDataURL('image/png');

    // show snapshot
    cameraSnapshot.src    = dataURL;
    cameraSnapshot.hidden = false;
    cameraVideo.hidden    = true;

    // stop camera
    cameraStream.getTracks().forEach(t => t.stop());

    // swap buttons
    captureBtn.hidden       = true;
    cameraContinueBtn.hidden= false;
  });

  // === STEP 3: Continue → recorder ===
  cameraContinueBtn.addEventListener('click', () => {
    cameraContainer.style.display   = 'none';
    recorderContainer.style.display = 'block';
    setupRecorder();
  }, { once: true });

  // === STEP 4 & 5: Recorder + Playback ===
  function setupRecorder() {
    const stepTitle    = document.getElementById('step-title');
    const recordBtn    = document.getElementById('recordBtn');
    const timerEl      = document.getElementById('timer');
    const progressEl   = document.getElementById('progress');
    const downloadLink = document.getElementById('downloadLink');
    const playbackImg  = document.getElementById('playbackImage');

    let audioCtx, micStream, recorder;
    let chunks  = [];
    let buffers = [];
    let current = 0;
    let timerInt, startTime, recordTO;

    // init UI
    recordBtn.hidden    = false;
    timerEl.hidden      = true;
    progressEl.hidden   = true;
    downloadLink.hidden = true;

    // wire recording
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
          alert('🎙️ Please allow microphone access.');
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
      const elapsed = Date.now() - startTime;
      const secs    = Math.floor(elapsed/1000);
      timerEl.textContent = `${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}`;
    }

    async function onRecordingStop() {
      const blob     = new Blob(chunks,{type:'audio/webm'});
      const arrBuf   = await blob.arrayBuffer();
      const audioBuf = await audioCtx.decodeAudioData(arrBuf);
      buffers.push(audioBuf);

      current++;
      if (current < 3) {
        stepTitle.textContent = `Record Moment ${current+1}`;
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
      let v=0;
      const iv=setInterval(()=>{
        v+=10; progressEl.value=v;
        if(v>=100) clearInterval(iv);
      },200);
    }

    function playAmbient() {
      const masterGain=new (window.AudioContext||window.webkitAudioContext)().createGain();
      masterGain.gain.value=0.5;
      masterGain.connect(audioCtx.destination);

      buffers.forEach(buf=>{
        const src=audioCtx.createBufferSource();
        src.buffer=buf; src.loop=true;
        src.connect(masterGain); src.start();
      });

      stepTitle.textContent='Here’s your Moment / Place ▶️';

      const dest=audioCtx.createMediaStreamDestination();
      masterGain.connect(dest);
      const longest=Math.max(...buffers.map(b=>b.duration));
      const mixRec=new MediaRecorder(dest.stream);
      const mixChunks=[];

      mixRec.ondataavailable=e=>mixChunks.push(e.data);
      mixRec.onstop=()=>{
        const mixBlob=new Blob(mixChunks,{type:'audio/webm'});
        const url=URL.createObjectURL(mixBlob);
        downloadLink.href=url;
        downloadLink.download='moment-place.webm';
        downloadLink.hidden=false;

        recorderContainer.style.display='none';
        playbackContainer.style.display='block';
        if(playbackImg) playbackImg.src=snapshotDataURL;
      };

      mixRec.start();
      setTimeout(()=>mixRec.stop(),longest*1000+200);
    }

    function delay(ms){return new Promise(r=>setTimeout(r,ms));}
  }
}

// scripts/burial-flow.js
(function () {
  // simple state container
  const state = {
    selectedFile: null,
    confirmed: false,
  };

  

  // --- NEW: Supabase Edge Function endpoints ---
  const FUNCTIONS_BASE = 'https://ticxhncusdycqjftohho.supabase.co/functions/v1';
  const UPLOAD_FN_URL  = `${FUNCTIONS_BASE}/upload-burial`;
  const RECORD_FN_URL  = `${FUNCTIONS_BASE}/record-burial`;

  // shared audio element
const player = new Audio();
player.preload = 'none';
player.addEventListener('ended', () => {
  document.querySelectorAll('.dg-play.playing').forEach(b => b.classList.remove('playing'));
});

// delegated click for play/pause
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.dg-play');
  if (!btn) return;
  const url = btn.dataset.url;
  if (!url) return;

  if (player.src !== url) player.src = url;

  if (player.paused || player.src !== url) {
    document.querySelectorAll('.dg-play.playing').forEach(b => b.classList.remove('playing'));
    player.play().catch(()=>{});
    btn.classList.add('playing');
  } else {
    player.pause();
    btn.classList.remove('playing');
  }
});


  // text pools (unchanged content)
  const sarcasticRemarks = [
    "Right. This one had no potential anyway...",
    "Ever considered gardening instead of composing",
    "We see why this one didn't make the cut...",
    "Not the prettiest indeed.",
    "Some loops die so others may live.",
    "Another auditory tragedy.",
    "This one had... potential.",
    "Good decision. The world has enough crap already.",
    "Even the metronome gave up on this one.",
    "Overcooked. Overcompressed. Jeez",
    "The DAW giveth, and the DAW taketh away."
  ];
  const eulogies = [
    "As Above So Below.", "Not every loop is meant to bloom", "A waveform without purpose",
    "Never Stuck In A Loop Again", "It's Better This Way", "Gone before the drop",
    "Born to be muted.", "128 layers of bad decisions.", "Rendered... irrelevant",
    "Rest well, dear loop.", "Fade Out Forever", "Looped once too often", "Sick Drop. Dead."
  ];
  const vibes = [
    "Chillflop","CringeHop","Drum & Blahs","Technope","Impostor Synth-drome",
    "Synthcrave","Shite","Polka Punk","Teenage Angst in D Minor","Undefinable",
    "The Sound of Regret","Grind-NuJazz","Regretaton","Nope-step","EDehhhM",
    "Lo-Fried","Smarmbient"
  ];
  const cremationPhrases = [
    "Performing last rites...", "Praying to the audio gods... hold on...",
    "Approaching the Gates of Loop Heaven...", "Disintegrating Your Abominable Frequencies...",
    "Processing your terrible creation..."
  ];
  const ashesSamples = ["ashes1.mp3"];

  // helpers
  const $ = (id) => document.getElementById(id);
  const isClean = (str) => !/[<>]/.test(str) && !/https?:\/\//i.test(str);
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // ---- PUBLIC: called by partial ----
  window.__dgOpenPicker = function __dgOpenPicker() {
    const input = $('fileInput');
    if (!input) {
      console.warn('[burial-flow] #fileInput not found');
      return;
    }
    // ensure same-file reselect triggers change
    input.value = '';
    console.log('[burial-flow] openPicker → click()');
    input.click();
  };

  // ---- PUBLIC: onchange handler on the <input type="file"> ----
  window.__dgOnFileChange = function __dgOnFileChange(e) {
    const file = e?.target?.files?.[0];
    if (!file) {
      console.log('[burial-flow] onFileChange: no file selected');
      return;
    }
    console.log('[burial-flow] file picked:', file.name, 'type:', file.type);

    // Validate by MIME OR extension
    const mime = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    const extOk  = /\.(wav|mp3|ogg)$/i.test(name);
    const mimeOk = ['audio/wav','audio/x-wav','audio/wave','audio/mpeg','audio/ogg'].includes(mime);
    if (!(extOk || mimeOk)) {
      alert('Invalid file type. Only .wav, .mp3, and .ogg are allowed.');
      e.target.value = '';
      return;
    }

    state.selectedFile = file;

    // Start "analysis" phase
    const uploadBox = $('uploadBox');
    const methodSelector = $('methodSelector');
    const progressContainer = $('progressContainer');
    const analyzeFill = $('analyzeFill');
    const readyToBury = $('readyToBury');

    uploadBox && uploadBox.classList.add('hidden');
    if (methodSelector) methodSelector.style.display = 'none';
    state.confirmed = false;
    if (analyzeFill) analyzeFill.style.width = '0';
    progressContainer && progressContainer.classList.remove('hidden');
    readyToBury && readyToBury.classList.add('hidden');

    setTimeout(() => { if (analyzeFill) analyzeFill.style.width = '100%'; }, 50);
    setTimeout(showReadyToBury, 1500); // bump to 5000ms if you want the longer effect
  };

  function showReadyToBury() {
    const f = state.selectedFile;
    if (!f) return;

    const progressContainer = $('progressContainer');
    const readyToBury = $('readyToBury');
    const buryBtn = $('buryBtn');

    progressContainer && progressContainer.classList.add('hidden');
    readyToBury && readyToBury.classList.remove('hidden');

    const sarcasticRemark = $('sarcasticRemark');
    const fileName = $('fileName');
    const fileDate = $('fileDate');
    const fileSize = $('fileSize');
    const fileVibe = $('fileVibe');
    const epitaphInput = $('epitaph');

    if (sarcasticRemark) sarcasticRemark.textContent = `"${rand(sarcasticRemarks)}"`;
    if (fileName) fileName.textContent = f.name;
    if (fileDate) fileDate.textContent = new Date(f.lastModified).toLocaleDateString();
    if (fileSize) fileSize.textContent = (f.size / 1024 / 1024).toFixed(2) + ' MB';
    if (fileVibe) fileVibe.textContent = rand(vibes);
    if (epitaphInput) epitaphInput.value = rand(eulogies);

    // enable the button if it was disabled in the partial
    if (buryBtn) buryBtn.disabled = false;
  }

  // Delegated click for the bury button and cancel link
  document.addEventListener('click', (e) => {
    const tgt = e.target;

    if (tgt && tgt.id === 'buryBtn') {
      e.preventDefault();
      handleBuryClick();
    }

    if (tgt && tgt.id === 'cancelLink') {
      e.preventDefault();
      resetAll();
    }
  });

  function handleBuryClick() {
    const buryBtn = $('buryBtn');
    const cancelLink = $('cancelLink');
    const readyToBury = $('readyToBury');
    const burialProgress = $('burialProgress');
    const burialMessage = $('burialMessage');
    const buryFill = $('buryFill');

    if (!state.confirmed) {
      if (buryBtn) {
        buryBtn.textContent = 'Are You Sure?';
        buryBtn.style.backgroundColor = '#a33';
      }
      cancelLink && cancelLink.classList.remove('hidden');
      state.confirmed = true;
      return;
    }

    // proceed
    readyToBury && readyToBury.classList.add('hidden');
    burialProgress && burialProgress.classList.remove('hidden');
    if (burialMessage) burialMessage.textContent = rand(cremationPhrases);
    if (buryFill) {
      buryFill.style.width = '0';
      setTimeout(() => (buryFill.style.width = '100%'), 50);
    }
    setTimeout(() => {
      burialProgress && burialProgress.classList.add('hidden');
      showCeremony(); // now async (see below)
    }, 5000);
  }

  // --- NEW: upload helper ---
  async function uploadBurialFile(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(UPLOAD_FN_URL, { method: 'POST', body: fd });
    if (!res.ok) {
      const text = await res.text().catch(()=>'');
      throw new Error(`[upload-burial] ${res.status} ${text}`);
    }
    const out = await res.json();
    if (!out || !out.ok || !out.publicUrl) {
      throw new Error('[upload-burial] invalid response ' + JSON.stringify(out));
    }
    console.log('[upload-burial] OK', out);
    return {
      audio_url: out.publicUrl,
      audio_mime: out.contentType || null,
      audio_bytes: out.bytes || null
    };
  }

  // --- CHANGED: made async so we can await upload + record ---
  async function showCeremony() {
    const f = state.selectedFile;
    if (!f) return;

    const method = (document.querySelector('input[name="method"]:checked') || {}).value || 'bury';
    const epitaphInput = $('epitaph');
    const epit = (epitaphInput ? epitaphInput.value : '').trim() || "Gone, but never exported.";
    if (!isClean(epit)) {
      alert("Remove '<', '>' or URLs from epitaph.");
      return resetAll();
    }

    try {
      // 1) reCAPTCHA
      const token = (typeof grecaptcha !== 'undefined' && typeof RECAPTCHA_SITE_KEY !== 'undefined')
        ? await grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'record_burial' })
        : '';

      // 2) upload file -> get public URL + meta
      const { audio_url, audio_mime, audio_bytes } = await uploadBurialFile(f);

      // 3) record via Supabase Edge Function (now with audio fields)
      const recRes = await fetch(RECORD_FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          name: f.name,
          method,
          epitaph: epit,
          country: '',
          token,
          audio_url,
          audio_mime,
          audio_bytes
        })
      });

      if (!recRes.ok) {
        const text = await recRes.text().catch(()=> '');
        throw new Error(`[record-burial] ${recRes.status} ${text}`);
      }

      const recJson = await recRes.json().catch(()=> ({}));
      if (!recJson || !recJson.data) {
        console.warn('[burial-flow] record-burial returned no data', recJson);
      }
    } catch (err) {
      console.warn('[burial-flow] record/ upload failed:', err);
      // We still proceed with the ceremony UI so the user experience continues,
      // but you can early-return here if you prefer to stop on failure.
    }

    // ceremony UI (unchanged)
    const ceremony = $('ceremony');
    if (ceremony) {
      ceremony.innerHTML = '';
      const tomb = document.createElement('div');
      tomb.className = 'tombstone';
      tomb.innerHTML = `
        Here lies<br>
        <strong>${f.name}</strong><br>
        ${new Date(f.lastModified).toLocaleDateString()}<br><br>
        <em>"${epit}"</em>
      `;
      ceremony.appendChild(tomb);
      setTimeout(() => tomb.classList.add('show'), 50);
    }

    const aftercare = $('aftercare');
    aftercare && aftercare.classList.remove('hidden');

    // prepend to table (unchanged)
    const row = document.createElement('tr');
    row.classList.add('fade-in');

    const icon = document.createElement('img');
    icon.src = method === 'cremate' ? 'icons/icon_urn.png' : 'icons/icon_tombstone.png';
    icon.className = 'icon-img';

    const tdName = document.createElement('td');
    tdName.append(icon, document.createTextNode(f.name));
    const tdDate = document.createElement('td');
    tdDate.textContent = new Date().toLocaleDateString();
    const tdEpit = document.createElement('td');
    tdEpit.textContent = epit;
    const tdCountry = document.createElement('td');
    tdCountry.textContent = '';

    row.append(tdName, tdDate, tdEpit, tdCountry);
    const graveList = $('graveList');
    graveList && graveList.prepend(row);
  }

  function resetAll() {
    state.selectedFile = null;
    state.confirmed = false;

    const input = $('fileInput');
    if (input) input.value = '';

    const uploadBox = $('uploadBox');
    const methodSelector = $('methodSelector');
    const progressContainer = $('progressContainer');
    const readyToBury = $('readyToBury');
    const burialProgress = $('burialProgress');
    const ceremony = $('ceremony');
    const aftercare = $('aftercare');
    const buryBtn = $('buryBtn');

    uploadBox && uploadBox.classList.remove('hidden');
    if (methodSelector) methodSelector.style.display = 'block';
    progressContainer && progressContainer.classList.add('hidden');
    readyToBury && readyToBury.classList.add('hidden');
    burialProgress && burialProgress.classList.add('hidden');
    ceremony && (ceremony.innerHTML = '');
    aftercare && aftercare.classList.add('hidden');
    if (buryBtn) {
      buryBtn.disabled = true;               // back to disabled until next file
      buryBtn.textContent = 'Commit this File?';
      buryBtn.style.backgroundColor = '#3a3a3a';
    }
  }

  // optional: make “Check the remains” work if you wire a button to play ashes
  window.playAshes = function playAshes() {
    const audio = $('ashesAudio');
    if (!audio) return;
    audio.src = ashesSamples[Math.floor(Math.random() * ashesSamples.length)];
    audio.classList.remove('hidden');
    audio.play().catch(()=>{});
  };
})();

// scripts/burial-flow.js
console.log("[burial-flow] v2025-08-09-5 loaded");

(() => {
  // --- state ---
  const state = {
    selectedFile: null,
    confirmed: false,
    premium: null,
    waitingForPicker: false
  };

  // --- text sets (unchanged from your file) ---
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

  // --- helpers ---
  const $ = id => document.getElementById(id);
  const elems = {
    uploadBox: $('uploadBox'),
    progressContainer: $('progressContainer'),
    analyzeFill: $('analyzeFill'),
    readyToBury: $('readyToBury'),
    sarcasticRemark: $('sarcasticRemark'),
    fileName: $('fileName'),
    fileDate: $('fileDate'),
    fileSize: $('fileSize'),
    fileVibe: $('fileVibe'),
    buryBtn: $('buryBtn'),
    cancelLink: $('cancelLink'),
    burialProgress: $('burialProgress'),
    buryFill: $('buryFill'),
    ceremony: $('ceremony'),
    ashesAudio: $('ashesAudio'),
    epitaphInput: $('epitaph'),
    methodSelector: $('methodSelector'),
  };

  function isClean(str) {
    return !/[<>]/.test(str) && !/https?:\/\//i.test(str);
  }

  // ===== Global functions the partial calls via inline attributes =====
  window.__dgOpenPicker = function __dgOpenPicker() {
    const input = $('fileInput');
    if (!input) return;
    // reset so choosing the same file fires `change`
    input.value = "";
    // keep present but off-screen (don’t toggle display:none here)
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.top = '0';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    state.waitingForPicker = true;
    console.log("[burial-flow] openPicker → click()");
    input.click();
  };

  window.__dgOnFileChange = function __dgOnFileChange(e) {
    state.waitingForPicker = false;

    const input = $('fileInput');
    // restore any styles
    if (input) {
      input.style.position = '';
      input.style.left = '';
      input.style.top = '';
      input.style.opacity = '';
      input.style.pointerEvents = '';
    }

    const file = e?.target?.files?.[0];
    if (!file) {
      console.log("[burial-flow] __dgOnFileChange: no file");
      return;
    }
    console.log('[burial-flow] file picked:', file.name, 'type:', file.type);

    const mime = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    const extOk = /\.(wav|mp3|ogg)$/i.test(name);
    const mimeOk = ['audio/wav','audio/x-wav','audio/wave','audio/mpeg','audio/ogg'].includes(mime);
    if (!(extOk || mimeOk)) {
      alert('Invalid file type. Only .wav, .mp3, and .ogg are allowed.');
      if (input) input.value = '';
      return;
    }

    // proceed
    state.selectedFile = file;
    if (elems.uploadBox) elems.uploadBox.classList.add('hidden');
    if (elems.methodSelector) elems.methodSelector.style.display = 'none';
    state.confirmed = false;
    if (elems.analyzeFill) elems.analyzeFill.style.width = '0';
    if (elems.progressContainer) elems.progressContainer.classList.remove('hidden');
    if (elems.readyToBury) elems.readyToBury.classList.add('hidden');

    setTimeout(() => elems.analyzeFill && (elems.analyzeFill.style.width = '100%'), 50);
    setTimeout(showReadyToBury, 1500); // feel free to bump to 5000
  };

  // Fallback in case change didn’t fire
  window.addEventListener('focus', () => {
    if (!state.waitingForPicker) return;
    state.waitingForPicker = false;
    const input = $('fileInput');
    if (input?.files?.length) {
      console.log("[burial-flow] focus fallback → using selected file");
      window.__dgOnFileChange({ target: input });
    }
  });

  // ===== UI flows =====
  function showReadyToBury() {
    const f = state.selectedFile;
    if (!f) return;

    if (elems.progressContainer) elems.progressContainer.classList.add('hidden');
    if (elems.readyToBury) elems.readyToBury.classList.remove('hidden');

    if (elems.sarcasticRemark) {
      elems.sarcasticRemark.textContent =
        `"${sarcasticRemarks[Math.floor(Math.random() * sarcasticRemarks.length)]}"`;
    }
    if (elems.fileName) elems.fileName.textContent = f.name;
    if (elems.fileDate) elems.fileDate.textContent = new Date(f.lastModified).toLocaleDateString();
    if (elems.fileSize) elems.fileSize.textContent = (f.size/1024/1024).toFixed(2) + ' MB';
    if (elems.fileVibe) elems.fileVibe.textContent = vibes[Math.floor(Math.random() * vibes.length)];
    if (elems.epitaphInput) elems.epitaphInput.value = eulogies[Math.floor(Math.random() * eulogies.length)];

    if (elems.buryBtn) {
      elems.buryBtn.disabled = false;
      elems.buryBtn.textContent = 'Commit this File?';
    }
  }

  function handleBuryClick() {
    if (!state.confirmed) {
      if (elems.buryBtn) {
        elems.buryBtn.textContent = 'Are You Sure?';
        elems.buryBtn.style.backgroundColor = '#a33';
      }
      elems.cancelLink && elems.cancelLink.classList.remove('hidden');
      state.confirmed = true;
      return;
    }
    // proceed with bury animation
    elems.readyToBury && elems.readyToBury.classList.add('hidden');
    elems.burialProgress && elems.burialProgress.classList.remove('hidden');
    const bm = $('burialMessage');
    if (bm) bm.textContent = cremationPhrases[Math.floor(Math.random() * cremationPhrases.length)];
    elems.buryFill && (elems.buryFill.style.width = '0');
    setTimeout(() => elems.buryFill && (elems.buryFill.style.width = '100%'), 50);
    setTimeout(() => {
      elems.burialProgress && elems.burialProgress.classList.add('hidden');
      showCeremony();
    }, 5000);
  }

  function showCeremony() {
    const f = state.selectedFile;
    if (!f) return;

    const method = document.querySelector('input[name="method"]:checked')?.value || 'bury';
    const epit = (elems.epitaphInput?.value || "").trim() || "Gone, but never exported.";
    if (!isClean(epit)) {
      alert("Remove '<', '>' or URLs from epitaph.");
      return resetAll();
    }

    if (typeof grecaptcha !== 'undefined') {
      grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'record_burial' })
        .then(token => fetch(
          'https://ticxhncusdycqjftohho.supabase.co/functions/v1/record-burial',
          {
            method: 'POST',
            headers: {
              'Content-Type':'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              name: f.name,
              method, epitaph: epit,
              country: '', token
            })
          }
        )).catch(err => console.error('[burial-flow] recordBurial error', err));
    }

    if (elems.ceremony) {
      elems.ceremony.innerHTML = '';
      const tomb = document.createElement('div');
      tomb.className = 'tombstone';
      tomb.innerHTML = `
        Here lies<br>
        <strong>${f.name}</strong><br>
        ${new Date(f.lastModified).toLocaleDateString()}<br><br>
        <em>"${epit}"</em>
      `;
      elems.ceremony.appendChild(tomb);
      setTimeout(() => tomb.classList.add('show'), 50);
    }
    $('aftercare')?.classList.remove('hidden');

    // prepend to table
    const tr = document.createElement('tr');
    tr.classList.add('fade-in');
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
    tr.append(tdName, tdDate, tdEpit, tdCountry);
    $('graveList')?.prepend(tr);
  }

  function resetAll() {
    state.selectedFile = null;
    state.confirmed = false;
    const fi = $('fileInput');
    if (fi) fi.value = '';
    elems.uploadBox && elems.uploadBox.classList.remove('hidden');
    elems.methodSelector && (elems.methodSelector.style.display = 'block');
    elems.progressContainer && elems.progressContainer.classList.add('hidden');
    elems.readyToBury && elems.readyToBury.classList.add('hidden');
    elems.burialProgress && elems.burialProgress.classList.add('hidden');
    if (elems.ceremony) elems.ceremony.innerHTML = '';
    $('aftercare')?.classList.add('hidden');
    if (elems.buryBtn) {
      elems.buryBtn.disabled = true;
      elems.buryBtn.textContent = 'Commit this File?';
      elems.buryBtn.style.backgroundColor = '';
    }
    elems.cancelLink && elems.cancelLink.classList.add('hidden');
  }

  // bind clicks for bury/cancel (static IDs, no inline needed)
  document.addEventListener('click', (e) => {
    if (e.target?.id === 'buryBtn') handleBuryClick();
    if (e.target?.id === 'cancelLink') resetAll();
  });
})();

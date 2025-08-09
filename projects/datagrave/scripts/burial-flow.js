// scripts/burial-flow.js
console.log("[burial-flow] v2025-08-09-3 loaded");

document.addEventListener('DOMContentLoaded', () => {
  // cache these once
  const state = {
    selectedFile: null,
    confirmed: false,
    premium: null,
  };

  // snarky texts (unchanged)
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

  // helpers to grab elements
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

  // ---------- binding helpers (works even if partial is re-rendered) ----------
  function bindUploadBox() {
    const box = $('uploadBox');
    const input = $('fileInput');
    console.log("[burial-flow] bindUploadBox called. box:", !!box, "input:", !!input);

    if (!box || !input) return;

    // clicking the box should open the file dialog reliably
    if (!box._hasClickHandler) {
      box.addEventListener('click', () => {
        console.log("[burial-flow] uploadBox click → opening file dialog");
        const wasHidden = input.classList.contains('hidden');
        if (wasHidden) input.classList.remove('hidden'); // avoid blocked click on display:none
        input.style.position = 'fixed';
        input.style.left = '-9999px';
        input.click();
        setTimeout(() => {
          if (wasHidden) input.classList.add('hidden');
          input.style.position = '';
          input.style.left = '';
        }, 0);
      });
      box._hasClickHandler = true;
      console.log("[burial-flow] added click handler to #uploadBox");
    }

    // direct change handler on the input
    if (!input._hasChangeHandler) {
      input.addEventListener('change', handleFilePicked);
      input._hasChangeHandler = true;
      console.log("[burial-flow] bound DIRECT change to #fileInput");
    }

    // some browsers fire 'input' as well; bind that too
    if (!input._hasInputHandler) {
      input.addEventListener('input', (e) => {
        if (e.target.files && e.target.files.length) {
          console.log("[burial-flow] 'input' event detected a file—forwarding to handleFilePicked()");
          handleFilePicked(e);
        }
      });
      input._hasInputHandler = true;
      console.log("[burial-flow] bound INPUT event to #fileInput");
    }
  }

  // Observe the container so if the burial-zone partial gets swapped in/out,
  // we re-bind the handlers automatically.
  const zoneRoot = document.getElementById('burial-zone-placeholder') || document.body;
  const mo = new MutationObserver((mutations) => {
    const added = mutations.some(m => [...m.addedNodes].some(n =>
      (n.nodeType === 1) && (n.id === 'uploadBox' || n.querySelector?.('#uploadBox'))
    ));
    if (added) {
      console.log("[burial-flow] MutationObserver: burial zone changed → rebind");
      bindUploadBox();
    }
  });
  mo.observe(zoneRoot, { childList: true, subtree: true });

  // Initial bind (in case the elements are already there)
  bindUploadBox();

  // As a fallback, keep delegated change too (helps on some static hosts)
  document.addEventListener('change', e => {
    if (e.target && e.target.id === 'fileInput') {
      console.log("[burial-flow] delegated 'change' caught for #fileInput");
      handleFilePicked(e);
    }
  });

  // ---------- event handlers ----------
  function handleFilePicked(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      console.log("[burial-flow] handleFilePicked: no file on event");
      return;
    }

    console.log('[burial-flow] picked file:', file.name, 'type:', file.type);

    // Accept by MIME OR file extension (some browsers are weird for .wav)
    const mime = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    const extOk = /\.(wav|mp3|ogg)$/i.test(name);
    const mimeOk = ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mpeg', 'audio/ogg'].includes(mime);
    if (!(extOk || mimeOk)) {
      alert('Invalid file type. Only .wav, .mp3, and .ogg are allowed.');
      e.target.value = '';
      return;
    }

    // Kickoff analysis animation
    state.selectedFile = file;
    elems.uploadBox && elems.uploadBox.classList.add('hidden');
    elems.methodSelector && (elems.methodSelector.style.display = 'none');
    state.confirmed = false;
    elems.analyzeFill && (elems.analyzeFill.style.width = '0');
    elems.progressContainer && elems.progressContainer.classList.remove('hidden');
    elems.readyToBury && elems.readyToBury.classList.add('hidden');

    // Animate, then show details
    setTimeout(() => elems.analyzeFill && (elems.analyzeFill.style.width = '100%'), 50);
    setTimeout(showReadyToBury, 1500); // bump back to 5000 if you want the longer effect
  }

  document.addEventListener('click', e => {
    // bury
    if (e.target && e.target.id === 'buryBtn') {
      handleBuryClick();
    }
    // cancel
    if (e.target && e.target.id === 'cancelLink') {
      resetAll();
    }
    // premium tiles
    if (e.target && e.target.matches('.premium-btn')) {
      const p = e.target.dataset.premium;
      state.premium = p;
      document.querySelectorAll('.upsell-tile').forEach(tile => {
        tile.classList.toggle('active', tile.dataset.premium === p);
      });
      if (elems.epitaphInput) {
        if (p === 'vip') {
          elems.epitaphInput.disabled = false;
        } else {
          elems.epitaphInput.disabled = true;
          elems.epitaphInput.value = '';
        }
      }
      document.getElementById('upsellSection')?.classList.remove('hidden');
    }
  });

  function showReadyToBury() {
    const f = state.selectedFile;
    if (!f) {
      console.warn("[burial-flow] showReadyToBury called but no selectedFile");
      return;
    }

    elems.progressContainer && elems.progressContainer.classList.add('hidden');
    elems.readyToBury && elems.readyToBury.classList.remove('hidden');

    if (elems.sarcasticRemark) {
      elems.sarcasticRemark.textContent =
        `"${sarcasticRemarks[Math.floor(Math.random() * sarcasticRemarks.length)]}"`;
    }
    if (elems.fileName) elems.fileName.textContent = f.name;
    if (elems.fileDate) elems.fileDate.textContent = new Date(f.lastModified).toLocaleDateString();
    if (elems.fileSize) elems.fileSize.textContent = (f.size/1024/1024).toFixed(2) + ' MB';
    if (elems.fileVibe) elems.fileVibe.textContent = vibes[Math.floor(Math.random() * vibes.length)];
    if (elems.epitaphInput) elems.epitaphInput.value = eulogies[Math.floor(Math.random() * eulogies.length)];

    // Enable the button so it can be clicked
    if (elems.buryBtn) {
      elems.buryBtn.disabled = false;
      console.log("[burial-flow] enabled #buryBtn");
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
    // actual bury
    elems.readyToBury && elems.readyToBury.classList.add('hidden');
    elems.burialProgress && elems.burialProgress.classList.remove('hidden');
    const bm = document.getElementById('burialMessage');
    if (bm) bm.textContent = cremationPhrases[Math.floor(Math.random() * cremationPhrases.length)];
    if (elems.buryFill) elems.buryFill.style.width = '0';
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

    // send to Supabase
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

    // build tombstone
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
    document.getElementById('aftercare')?.classList.remove('hidden');

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
    document.getElementById('graveList')?.prepend(tr);
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
    document.getElementById('aftercare')?.classList.add('hidden');
    if (elems.buryBtn) {
      elems.buryBtn.disabled = true;   // back to disabled until next file
      elems.buryBtn.textContent = 'Commit this File?';
      elems.buryBtn.style.backgroundColor = '';
    }
    elems.cancelLink && elems.cancelLink.classList.add('hidden');
  }
});

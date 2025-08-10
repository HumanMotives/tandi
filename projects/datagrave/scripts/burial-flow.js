// --- burial-flow script ---

console.log('[burial-flow] v2025-aug-009-burial-flow loaded');

// --- Supabase Edge endpoints + anon key (required) ---
const FUNCTIONS_BASE = 'https://ticxhncusdycqjftohho.supabase.co/functions/v1';
const RECORD_FN_URL  = `${FUNCTIONS_BASE}/record-burial`;
const UPLOAD_FN_URL  = `${FUNCTIONS_BASE}/upload-burial`;

// Expect the anon key to be provided globally (same as burial-listings.js)
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';
if (!SUPABASE_ANON_KEY) {
  console.warn('[burial-flow] SUPABASE_ANON_KEY missing on window');
}


// === global state (single source of truth) ===
window.__dgState = window.__dgState || { selectedFile: null, confirmed: false };
const state = window.__dgState;

// tiny DOM helper
const $ = (id) => document.getElementById(id);

// Basic epitaph sanity check: no < > or URLs
function isClean(text) {
  return !(/[<>]/.test(text) || /\bhttps?:\/\//i.test(text));
}

// === File picker + change handler (full, self-contained) ===
console.log('[burial-flow] v2025-aug-003 picker');

window.__dgOpenPicker = function __dgOpenPicker() {
  const input = document.getElementById('fileInput');
  if (!input) {
    console.warn('[burial-flow] #fileInput not found');
    return;
  }
  // allow re-selecting the same file to retrigger onchange
  input.value = '';
  input.click();
};

window.__dgOnFileChange = function __dgOnFileChange(e) {
  const file = e?.target?.files?.[0];
  if (!file) {
    console.log('[burial-flow] onFileChange: no file selected');
    return;
  }

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

  // Store in state for showCeremony()
  state.selectedFile = file;
  state.confirmed = false;

  // Cache DOM
  const $id = (x) => document.getElementById(x);
  const uploadBox        = $id('uploadBox');
  const methodSelector   = $id('methodSelector');
  const progressContainer= $id('progressContainer');
  const analyzeFill      = $id('analyzeFill');
  const readyToBury      = $id('readyToBury');
  const buryBtn          = $id('buryBtn');

  // Hide picker, show analyzing
  uploadBox && uploadBox.classList.add('hidden');
  if (methodSelector) methodSelector.style.display = 'none';
  readyToBury && readyToBury.classList.add('hidden');

  if (analyzeFill) analyzeFill.style.width = '0';
  progressContainer && progressContainer.classList.remove('hidden');

  // Kick the progress fill
  setTimeout(() => { if (analyzeFill) analyzeFill.style.width = '100%'; }, 50);

  // After a short delay, show details + enable commit
  setTimeout(() => {
    progressContainer && progressContainer.classList.add('hidden');
    readyToBury && readyToBury.classList.remove('hidden');

    // Populate details safely (only if elements exist)
    const sarcasticRemark = $id('sarcasticRemark');
    const fileNameEl      = $id('fileName');
    const fileDateEl      = $id('fileDate');
    const fileSizeEl      = $id('fileSize');
    const fileVibeEl      = $id('fileVibe');
    const epitaphInput    = $id('epitaph');

    if (sarcasticRemark) {
      const pool = (typeof sarcasticRemarks !== 'undefined' ? sarcasticRemarks : ['Not your magnum opus.']);
      sarcasticRemark.textContent = `"${pool[Math.floor(Math.random()*pool.length)]}"`;
    }
    if (fileNameEl) fileNameEl.textContent = file.name || '';
    if (fileDateEl) fileDateEl.textContent = new Date(file.lastModified).toLocaleDateString();
    if (fileSizeEl) fileSizeEl.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';

    if (fileVibeEl) {
      const vibesPool = (typeof vibes !== 'undefined' ? vibes : ['Unclassifiable']);
      fileVibeEl.textContent = vibesPool[Math.floor(Math.random()*vibesPool.length)];
    }
    if (epitaphInput) {
      const eul = (typeof eulogies !== 'undefined' ? eulogies : ['Fade out forever.']);
      epitaphInput.value = eul[Math.floor(Math.random()*eul.length)];
    }

    // Enable commit button
    if (buryBtn) {
      buryBtn.disabled = false;
      buryBtn.textContent = 'Commit this File?';
      buryBtn.style.backgroundColor = '#3a3a3a';
    }
  }, 1500); // adjust to 5000ms if you want the longer effect
};

// === Buttons: Commit / Cancel (restored) ===
console.log('[burial-flow] v2025-aug-004-controls');

// One delegated listener handles both buttons
document.addEventListener('click', (e) => {
  const t = e.target;
  if (t && t.id === 'buryBtn') { e.preventDefault(); handleBuryClick(); }
  if (t && t.id === 'cancelLink') { e.preventDefault(); resetAll(); }
});

function handleBuryClick() {
  const buryBtn        = document.getElementById('buryBtn');
  const cancelLink     = document.getElementById('cancelLink');
  const readyToBury    = document.getElementById('readyToBury');
  const burialProgress = document.getElementById('burialProgress');
  const burialMessage  = document.getElementById('burialMessage');
  const buryFill       = document.getElementById('buryFill');

  // First click = confirm step
  if (!state.confirmed) {
    if (buryBtn) {
      buryBtn.textContent = 'Are You Sure?';
      buryBtn.style.backgroundColor = '#a33';
    }
    if (cancelLink) cancelLink.classList.remove('hidden');
    state.confirmed = true;
    return;
  }

  // Second click = proceed with ceremony
  if (readyToBury)    readyToBury.classList.add('hidden');
  if (burialProgress) burialProgress.classList.remove('hidden');

  const phrases = (Array.isArray(window.cremationPhrases) && window.cremationPhrases.length)
    ? window.cremationPhrases
    : ['Performing last rites...', 'Processing...'];

  if (burialMessage) burialMessage.textContent = phrases[Math.floor(Math.random() * phrases.length)];
  if (buryFill) {
    buryFill.style.width = '0';
    setTimeout(() => { buryFill.style.width = '100%'; }, 50);
  }

  // After brief progress, run the ceremony
  setTimeout(() => {
    if (burialProgress) burialProgress.classList.add('hidden');
    showCeremony();
  }, 5000);
}

function resetAll() {
  state.selectedFile = null;
  state.confirmed = false;

  const input            = document.getElementById('fileInput');
  const uploadBox        = document.getElementById('uploadBox');
  const methodSelector   = document.getElementById('methodSelector');
  const progressContainer= document.getElementById('progressContainer');
  const readyToBury      = document.getElementById('readyToBury');
  const burialProgress   = document.getElementById('burialProgress');
  const ceremony         = document.getElementById('ceremony');
  const aftercare        = document.getElementById('aftercare');
  const buryBtn          = document.getElementById('buryBtn');
  const cancelLink       = document.getElementById('cancelLink');

  if (input) input.value = '';
  if (uploadBox) uploadBox.classList.remove('hidden');
  if (methodSelector) methodSelector.style.display = 'block';
  if (progressContainer) progressContainer.classList.add('hidden');
  if (readyToBury) readyToBury.classList.add('hidden');
  if (burialProgress) burialProgress.classList.add('hidden');
  if (ceremony) ceremony.innerHTML = '';
  if (aftercare) aftercare.classList.add('hidden');
  if (cancelLink) cancelLink.classList.add('hidden');
  if (buryBtn) {
    buryBtn.disabled = true;
    buryBtn.textContent = 'Commit this File?';
    buryBtn.style.backgroundColor = '#3a3a3a';
  }
}

// === Upload helper (used only for BURY) ===
async function uploadBurialFile(file) {
  // These must already be defined globally in your page:
  // UPLOAD_FN_URL, SUPABASE_ANON_KEY
  const fd = new FormData();
  fd.append('file', file);

  const res = await fetch(UPLOAD_FN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: fd
  });

  if (!res.ok) {
    const text = await res.text().catch(()=>'');
    throw new Error(`[upload-burial] ${res.status} ${text}`);
  }
  const out = await res.json().catch(()=> ({}));
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

async function showCeremony() {
  console.log('[burial-flow] v2025-aug-001-burial-flow');

  const f = state.selectedFile;
  if (!f) return;

  const method = (document.querySelector('input[name="method"]:checked') || {}).value || 'bury';
  const epitaphInput = $('epitaph');
  const epit = (epitaphInput ? epitaphInput.value : '').trim() || "Gone, but never exported.";
  if (!isClean(epit)) {
    alert("Remove '<', '>' or URLs from epitaph.");
    return resetAll();
  }

  // we'll keep these for the listing row
  let audio_url = null, audio_mime = null, audio_bytes = null;

  try {
    // reCAPTCHA (same for both methods)
    const token = (typeof grecaptcha !== 'undefined' && typeof RECAPTCHA_SITE_KEY !== 'undefined')
      ? await grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'record_burial' })
      : '';

    if (method === 'cremate') {
      // 🔥 CREMATE: do NOT upload, store no audio fields
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
          country: (document.getElementById('country')?.value || window.DG_COUNTRY || '').trim(),
          token,
          // audio fields intentionally omitted / null
          audio_url: null,
          audio_mime: null,
          audio_bytes: null
        })
      });
      if (!recRes.ok) {
        const text = await recRes.text().catch(()=> '');
        throw new Error(`[record-burial:cremate] ${recRes.status} ${text}`);
      }
    } else {
      // ⚰️ BURY: upload then record with audio fields
      const up = await uploadBurialFile(f);
      audio_url   = up.audio_url;
      audio_mime  = up.audio_mime;
      audio_bytes = up.audio_bytes;

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
          country: (document.getElementById('country')?.value || window.DG_COUNTRY || '').trim(),
          token,
          audio_url,
          audio_mime,
          audio_bytes
        })
      });
      if (!recRes.ok) {
        const text = await recRes.text().catch(()=> '');
        throw new Error(`[record-burial:bury] ${recRes.status} ${text}`);
      }
    }
  } catch (err) {
    console.warn('[burial-flow] record/upload failed:', err);
    // You can return here to stop the ceremony on failure if you prefer:
    // return resetAll();
  }

  // Ceremony UI
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

  // If cremated, play the ashes sample (your existing audio element/helper)
  if (method === 'cremate') {
    try {
      if (typeof window.playAshes === 'function') {
        window.playAshes();
      } else {
        const a = new Audio('ashes1.mp3');
        a.play().catch(()=>{});
      }
    } catch {}
  }

  const aftercare = $('aftercare');
  aftercare && aftercare.classList.remove('hidden');

  // Prepend to table (no play button for cremations)
  const row = document.createElement('tr');
  row.classList.add('fade-in');

  const icon = document.createElement('img');
  icon.src = method === 'cremate' ? 'icons/icon_urn.png' : 'icons/icon_tombstone.png';
  icon.className = 'icon-img';

  const tdName = document.createElement('td');
  // For BURY (has audio_url), show a ▶ button; for CREMATE, just the icon + name
  if (audio_url) {
    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'dg-play';
    playBtn.title = 'Play / Pause';
    playBtn.textContent = '▶';
    playBtn.dataset.url = audio_url;
    tdName.append(playBtn, ' ');
  }
  tdName.append(icon, ' ', document.createTextNode(f.name));

  const tdDate = document.createElement('td');
  tdDate.textContent = new Date().toLocaleDateString();

  const tdEpit = document.createElement('td');
  tdEpit.textContent = epit;

  const tdCountry = document.createElement('td');
  tdCountry.textContent = (document.getElementById('country')?.value || window.DG_COUNTRY || '').trim();

  row.append(tdName, tdDate, tdEpit, tdCountry);
  const graveList = $('graveList');
  graveList && graveList.prepend(row);
}

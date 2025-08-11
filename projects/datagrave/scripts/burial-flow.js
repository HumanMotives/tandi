// --- burial-flow script ---

console.log('[burial-flow] v2025-aug-015-burial-flow loaded');

// --- Supabase Edge endpoints + anon key (required) ---
const FUNCTIONS_BASE = 'https://ticxhncusdycqjftohho.supabase.co/functions/v1';
const RECORD_FN_URL  = `${FUNCTIONS_BASE}/record-burial`;
const UPLOAD_FN_URL  = `${FUNCTIONS_BASE}/upload-burial`;

if (!window.SUPABASE_ANON_KEY) {
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

/* --------------------------------------------
   dialogs: load once when we first need them
--------------------------------------------- */
async function ensureDialogsLoaded() {
  try {
    if (window.dgDialogs && typeof window.dgDialogs.load === 'function') {
      await window.dgDialogs.load();
      return true;
    }
  } catch (e) {
    console.warn('[burial-flow] dialogs load failed:', e);
  }
  return false;
}

// === File picker + change handler (full, self-contained) ===
window.__dgOpenPicker = function __dgOpenPicker() {
  const input = document.getElementById('fileInput');
  if (!input) {
    console.warn('[burial-flow] #fileInput not found');
    return;
  }
  input.value = ''; // allow same-file reselection
  input.click();
};

window.__dgOnFileChange = async function __dgOnFileChange(e) {
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

  // Kick the progress fill (step 1 - fake)
  setTimeout(() => { if (analyzeFill) analyzeFill.style.width = '100%'; }, 50);

  // Load dialogs in parallel with step 1
  await ensureDialogsLoaded();

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
      const line =
        (window.__dgDialogs && window.__dgDialogs.randomSnark)
          ? window.__dgDialogs.randomSnark()
          : (typeof sarcasticRemarks !== 'undefined' && sarcasticRemarks.length
              ? sarcasticRemarks[Math.floor(Math.random()*sarcasticRemarks.length)]
              : 'Not your magnum opus.');
      sarcasticRemark.textContent = `"${line}"`;
    }
    if (fileNameEl) fileNameEl.textContent = file.name || '';
    if (fileDateEl) fileDateEl.textContent = new Date(file.lastModified).toLocaleDateString();
    if (fileSizeEl) fileSizeEl.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
    if (fileVibeEl) {
      const vibe =
        (window.__dgDialogs && window.__dgDialogs.randomGenre)
          ? window.__dgDialogs.randomGenre()
          : (typeof vibes !== 'undefined' && vibes.length
              ? vibes[Math.floor(Math.random()*vibes.length)]
              : 'Unclassifiable');
      fileVibeEl.textContent = vibe;
    }
    if (epitaphInput) {
      const suggestion =
        (window.__dgDialogs && window.__dgDialogs.randomEpitaph)
          ? window.__dgDialogs.randomEpitaph()
          : (typeof eulogies !== 'undefined' && eulogies.length
              ? eulogies[Math.floor(Math.random()*eulogies.length)]
              : 'Fade out forever.');
      epitaphInput.value = suggestion;
    }

    // Enable commit button
    if (buryBtn) {
      buryBtn.disabled = false;
      buryBtn.textContent = 'Commit this File?';
      buryBtn.style.backgroundColor = '#3a3a3a';
    }

    // Show/hide the license note ONLY for "bury"
    const selectedMethod = (document.querySelector('input[name="method"]:checked') || {}).value;
    toggleLicenseNote(selectedMethod === 'bury');
  }, 1500); // keep your pacing
};

// === Toggle license note helper ===
function toggleLicenseNote(show) {
  const btn = document.getElementById('buryBtn');
  let note = document.getElementById('license-note');

  if (show) {
    if (note) {
      note.style.display = 'block';
    } else if (btn) {
      note = document.createElement('p');
      note.id = 'license-note';
      note.className = 'license-note';
      note.style.marginTop = '0.5rem';
      note.style.textAlign = 'center';
      note.style.opacity = '0.85';
      note.innerHTML = `by burying your audio, you agree to our 
        <a href="/license.html" target="_blank" rel="noopener noreferrer">usage license</a>.`;
      btn.insertAdjacentElement('afterend', note);
    }
  } else if (note) {
    note.style.display = 'none';
  }
}

// If user flips between Bury/Cremate after analysis, keep the note correct
document.addEventListener('change', (e) => {
  if (e.target && e.target.name === 'method') {
    const ready = document.getElementById('readyToBury');
    if (ready && !ready.classList.contains('hidden')) {
      toggleLicenseNote(e.target.value === 'bury');
    }
  }
});

// === Buttons: Commit / Cancel (restored) ===

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

  // Message line (snarky or fallback)
  const phrase =
    (window.__dgDialogs && window.__dgDialogs.randomSnark)
      ? window.__dgDialogs.randomSnark()
      : (Array.isArray(window.cremationPhrases) && window.cremationPhrases.length
          ? window.cremationPhrases[Math.floor(Math.random() * window.cremationPhrases.length)]
          : 'Processing…');
  if (burialMessage) burialMessage.textContent = phrase;

  if (buryFill) buryFill.style.width = '0%';

  // Start ceremony immediately; showCeremony will drive real upload progress
  showCeremony();
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
  const licenseNote      = document.getElementById('license-note');

  if (input) input.value = '';
  if (uploadBox) uploadBox.classList.remove('hidden');
  if (methodSelector) methodSelector.style.display = 'block';
  if (progressContainer) progressContainer.classList.add('hidden');
  if (readyToBury) readyToBury.classList.add('hidden');
  if (burialProgress) burialProgress.classList.add('hidden');
  if (ceremony) ceremony.innerHTML = '';
  if (aftercare) aftercare.classList.add('hidden');
  if (cancelLink) cancelLink.classList.add('hidden');
  if (licenseNote) licenseNote.style.display = 'none';
  if (buryBtn) {
    buryBtn.disabled = true;
    buryBtn.textContent = 'Commit this File?';
    buryBtn.style.backgroundColor = '#3a3a3a';
  }
}

/* --------------------------------------------------------
   Upload helper WITH PROGRESS (used for BURY step 2)
   - keeps your endpoint & headers
--------------------------------------------------------- */
function uploadBurialFileWithProgress(file, onProgress) {
  return new Promise((resolve, reject) => {
    try {
      const fd = new FormData();
      fd.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', UPLOAD_FN_URL, true);
      xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.max(0, Math.min(100, Math.round((evt.loaded / evt.total) * 100)));
          if (typeof onProgress === 'function') onProgress(pct);
        } else {
          // if not computable, give a gentle nudge so the bar isn't stuck at 0%
          if (typeof onProgress === 'function') onProgress(10);
        }
      };

      xhr.onerror = () => reject(new Error('[upload-burial] network error'));
      xhr.onload  = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          let out = null;
          try { out = JSON.parse(xhr.responseText); } catch {}
          if (!out || !out.ok || !out.publicUrl) {
            return reject(new Error('[upload-burial] invalid response ' + xhr.responseText));
          }
          console.log('[upload-burial] OK', out);
          resolve({
            audio_url: out.publicUrl,
            audio_mime: out.contentType || null,
            audio_bytes: out.bytes || null
          });
        } else {
          reject(new Error(`[upload-burial] ${xhr.status} ${xhr.responseText || ''}`));
        }
      };

      xhr.send(fd);
    } catch (err) {
      reject(err);
    }
  });
}

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

  // We'll keep these for the listing row
  let audio_url = null, audio_mime = null, audio_bytes = null;

  const burialProgress = $('burialProgress');
  const buryFill       = $('buryFill');
  if (burialProgress) burialProgress.classList.remove('hidden');
  if (buryFill) buryFill.style.width = '0%';

  try {
    // reCAPTCHA (same for both methods)
    const token = (typeof grecaptcha !== 'undefined' && typeof RECAPTCHA_SITE_KEY !== 'undefined')
      ? await grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'record_burial' })
      : '';

    if (method === 'cremate') {
      // 🔥 CREMATE: NO upload — give the user a quick visible pass on bar #2
      await new Promise((res) => {
        const ms = 1200, start = performance.now();
        function tick(t){
          const pct = Math.min(100, Math.round(((t - start) / ms) * 100));
          if (buryFill) buryFill.style.width = pct + '%';
          if (pct < 100) requestAnimationFrame(tick); else res();
        }
        requestAnimationFrame(tick);
      });

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
      // ⚰️ BURY: upload with REAL progress on bar #2, then record
      const up = await uploadBurialFileWithProgress(f, (pct) => {
        if (buryFill) buryFill.style.width = pct + '%';
      });
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
  }

  // Ceremony UI (DATE 1 = file creation, DATE 2 = now)
  const ceremony = $('ceremony');
  if (ceremony) {
    ceremony.innerHTML = '';
    const tomb = document.createElement('div');
    tomb.className = 'tombstone';
    tomb.setAttribute('data-method', method); // hide remains for bury via CSS
    const date1 = new Date(state.selectedFile.lastModified).toLocaleDateString();
    const date2 = new Date().toLocaleDateString();
    tomb.innerHTML = `
      <div class="ts-title">Here lies</div>
      <div class="ts-name" style="font-weight:700;font-size:clamp(26px,4vw,42px);letter-spacing:.01em">${escapeHtml(f.name)}</div>
      <div class="ts-dates" style="margin-top:.6em;font-variant-numeric:tabular-nums;letter-spacing:.02em;font-size:clamp(16px,2vw,22px)">
        <span>${date1}</span><span class="sep" style="opacity:.6;margin:0 .35em">—</span><span>${date2}</span>
      </div>
      ${epit ? `<div class="ts-epitaph" style="font-style:italic;color:#6b6b6b;margin-top:.9em">“${escapeHtml(epit)}”</div>` : ''}
    `;
    ceremony.appendChild(tomb);
    setTimeout(() => tomb.classList.add('show'), 50);
  }

  // Hide/upload progress now that the stone is shown
  const burialProgressEl = $('burialProgress');
  if (burialProgressEl) burialProgressEl.classList.add('hidden');

  // If cremated, play the ashes sample
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

  // Hide any "remains" section for burials (defense in depth)
  if (method === 'bury') {
    document.querySelector('.options-afterlife')?.classList.add('hidden');
    document.querySelector('.js-remains')?.remove();
    document.querySelector('[data-role="remains"]')?.remove();
  }

  const aftercare = $('aftercare');
  aftercare && aftercare.classList.remove('hidden');

  // Refresh the listings so the new entry appears in the NEW card layout
  if (typeof window.dgReloadBurials === 'function') {
    window.dgReloadBurials();
  } else {
    location.reload();
  }
} // <-- end showCeremony

// very small XSS guard for user strings
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

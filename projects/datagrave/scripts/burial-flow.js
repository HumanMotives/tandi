// --- REPLACE your existing showCeremony() with this version ---

console.log('[burial-flow] v2025-aug-002-burial-flow loaded');

// expose picker + change handler globally
window.__dgOpenPicker = function __dgOpenPicker() {
  const input = document.getElementById('fileInput');
  if (!input) {
    console.warn('[burial-flow] #fileInput not found');
    return;
  }
  input.value = '';       // allow re-selecting the same file
  input.click();
};

window.__dgOnFileChange = function __dgOnFileChange(e) {
  // minimal, safe default: just stash the file so showCeremony() can use it
  const file = e?.target?.files?.[0];
  if (!file) {
    console.log('[burial-flow] onFileChange: no file selected');
    return;
  }
  // if you already have `state` defined elsewhere, this will use it
  if (typeof state === 'object') {
    state.selectedFile = file;
  }
  console.log('[burial-flow] picked:', file.name, 'type:', file.type);
  // enable your “Commit this File?” button if you gate on it
  const buryBtn = document.getElementById('buryBtn');
  if (buryBtn) buryBtn.disabled = false;
};


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
      // Use your helper if wired, else inline playback
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

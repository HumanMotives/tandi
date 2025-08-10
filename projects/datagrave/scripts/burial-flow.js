// --- REPLACE your existing showCeremony() with this version ---


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

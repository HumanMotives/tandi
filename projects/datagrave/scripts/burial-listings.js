// burial-listings.js — icon-only play/pause image
console.log('[burial-listings] v2025-08-14-icon-fix');

let currentPage = 1;
const pageSize   = 25;
const listEl     = document.getElementById('graveList');            // tbody
const pageEl     = document.getElementById('paginationControls');

const ICON_PLAY  = 'images/icon_playaudio.png';
const ICON_PAUSE = 'images/icon_pauseaudio.png';

if (!listEl || !pageEl) {
  console.error('[burial-listings] Missing #graveList or #paginationControls');
} else {
  injectGraveCardStyles();
  hideTableHeadings();  // <— hide OG column titles

  async function fetchPage(page) {
    currentPage = page;
    try {
      const res = await fetch(
        'https://ticxhncusdycqjftohho.supabase.co/functions/v1/load-burials',
        {
          method: 'POST',
          headers: {
            'Content-Type':'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ page })
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { data, totalCount } = await res.json();
      renderList(data || []);
      renderPagination(totalCount || 0);
    } catch (err) {
      console.error('[burial-listings] Failed to fetch burials:', err);
    }
  }

  function renderList(rows) {
    listEl.innerHTML = '';
    rows.forEach(b => {
      const tr  = document.createElement('tr');
      tr.classList.add('fade-in');

      const td  = document.createElement('td');
      td.colSpan = 4;

      const card = el('div', 'grave-card');

      // Top row
      const top  = el('div', 'card-top');

      // left icon (urn/tombstone)
      const icon = document.createElement('img');
      icon.src   = (b.method === 'cremate') ? 'images/icon_urn.png' : 'images/icon_tombstone.png';
      icon.className = 'icon-img';
      icon.width = 28; icon.height = 28; icon.alt = '';

      const nameBox = el('div', 'file-name', b.name || 'Unknown');

      const actions = el('div', 'actions');

      // Play & download if we have audio
      const url = b.audio_url || b.audioUrl || b.publicUrl || '';
      const hasAudio = !!url;

      if (b.method === 'cremate') {
        const note = document.createElement('span');
        note.className = 'note';
        note.textContent = 'No info — cremated';
        actions.appendChild(note);
      } else if (hasAudio) {
        // Play icon (image only)
        const playImg = document.createElement('img');
        playImg.src = ICON_PLAY;
        playImg.alt = 'Play audio';
        playImg.className = 'icon-img play-icon paused';
        playImg.width = 28; playImg.height = 28;
        playImg.dataset.url = url;
        playImg.setAttribute('role', 'button');
        playImg.setAttribute('tabindex', '0');
        playImg.setAttribute('aria-label', 'Play or pause audio');
        actions.appendChild(playImg);

        // Download
        const dl = document.createElement('a');
        dl.href = url;
        dl.download = '';
        dl.target = '_blank';
        dl.rel = 'noopener noreferrer';
        dl.title = 'Download';
        const dlImg = document.createElement('img');
        dlImg.src = 'images/icon_download.png';
        dlImg.alt = 'Download';
        dlImg.className = 'icon-img';
        dl.appendChild(dlImg);
        actions.appendChild(dl);
      } else {
        const legacyNote = document.createElement('span');
        legacyNote.className = 'note';
        legacyNote.textContent = 'Legacy burial — no extra info';
        actions.appendChild(legacyNote);
      }

      top.append(icon, nameBox, actions);

      // Bottom row
      const bottom = el('div', 'card-bottom');

      const quote  = el('div', 'quote', `“${b.epitaph || ''}”`);
      const right  = document.createElement('div');
      right.innerHTML = `<strong>Buried:</strong> ${formatDate(b.timestamp)}${
        (b.country && String(b.country).trim())
          ? ` &nbsp;&nbsp; <strong>Country:</strong> ${String(b.country).trim()}`
          : ''
      }`;

      bottom.append(quote, right);

      // Put it all together
      card.append(top, bottom);
      td.appendChild(card);
      tr.appendChild(td);
      listEl.appendChild(tr);
    });
  }

  function renderPagination(totalCount) {
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    pageEl.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = 'page-btn';
      if (i === currentPage) btn.classList.add('active');
      btn.onclick = () => fetchPage(i);
      pageEl.appendChild(btn);
    }
  }

  // Helpers
  function el(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (typeof text === 'string') n.textContent = text;
    return n;
  }

  function formatDate(iso) {
    const d = iso ? new Date(iso) : new Date();
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString();
  }

  function hideTableHeadings() {
    const table = listEl.closest('table');
    if (!table) return;
    const thead = table.querySelector('thead');
    if (thead) thead.style.display = 'none';
  }

  function injectGraveCardStyles() {
    if (document.getElementById('grave-card-styles')) return;
    const css = `
      .grave-card { margin: 12px 0; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 0 rgba(0,0,0,0.06); }
      .grave-card .card-top { background: #F6EED3; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 14px 14px 0 0; }
      .grave-card .file-name { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 700; font-size: 1.05rem; letter-spacing: 0.02em; flex: 1; display: flex; align-items: center; gap: 10px; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .grave-card .actions { display: flex; align-items: center; gap: 14px; }

      /* Icon-only play button */
      .play-icon { cursor: pointer; user-select: none; }
      .play-icon.playing { filter: drop-shadow(0 0 0.5px rgba(0,0,0,0.25)) brightness(1.05); transform: translateZ(0); }
      .play-icon:focus { outline: 2px solid #0aa; outline-offset: 2px; }

      .grave-card .card-bottom { background: #B6B6B6; color: #fff; padding: 12px 16px; display: flex; gap: 12px; justify-content: space-between; border: 1px solid rgba(0,0,0,0.15); border-top: none; box-shadow: inset 0 1px 0 rgba(255,255,255,0.18); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.95rem; border-radius: 0 0 14px 14px; }
      .grave-card .quote { opacity: 0.9; color: #F6EED3; font-style: italic; }
      .icon-img { width: 28px; height: 28px; object-fit: contain; }
    `;
    const style = document.createElement('style');
    style.id = 'grave-card-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // Expose a reload helper so burial-flow can refresh after a new entry
  window.dgReloadBurials = () => fetchPage(1);

  // Shared audio player (singleton) for all play icons
  if (!window.__dgPlayer) {
    const player = new Audio();
    player.preload = 'none';

    const toggleIconState = (img, playing) => {
      img.classList.toggle('playing', playing);
      img.classList.toggle('paused', !playing);
      img.setAttribute('aria-label', playing ? 'Pause audio' : 'Play audio');
      img.src = playing ? ICON_PAUSE : ICON_PLAY;
    };

    document.addEventListener('click', (e) => {
      const img = e.target.closest('.play-icon');
      if (!img) return;

      const url = img.dataset.url;
      if (!url) return;

      // Switching track?
      const changingTrack = player.src !== url;

      if (changingTrack) {
        player.pause();
        document.querySelectorAll('.play-icon.playing').forEach(i => toggleIconState(i, false));
        player.src = url;
      }

      if (player.paused) {
        player.play().then(() => {
          document.querySelectorAll('.play-icon.playing').forEach(i => toggleIconState(i, false));
          toggleIconState(img, true);
        }).catch(()=>{});
      } else {
        player.pause();
        toggleIconState(img, false);
      }
    });

    // keyboard support
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const img = document.activeElement?.closest?.('.play-icon');
      if (!img) return;
      e.preventDefault();
      img.click();
    });

    player.addEventListener('ended', () => {
      document.querySelectorAll('.play-icon.playing').forEach(i => {
        i.classList.remove('playing');
        i.classList.add('paused');
        i.src = ICON_PLAY;
        i.setAttribute('aria-label', 'Play audio');
      });
    });

    window.__dgPlayer = player;
  }

  // Kick off the first page
  fetchPage(1);
}

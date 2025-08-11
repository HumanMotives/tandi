// burial-listings.js — v2025-08-11 alt card layout + bottom pager
console.log('[burial-listings] v2025-08-11-alt-card');

let currentPage = 1;
const pageSize   = 25;
const listEl     = document.getElementById('graveList');            // tbody
const pageEl     = document.getElementById('paginationControls');

const ICON_BASE  = '/projects/datagrave/images';
const ICON_PLAY  = `${ICON_BASE}/icon_playaudio.png`;
const ICON_PAUSE = `${ICON_BASE}/icon_pauseaudio.png`;
const ICON_DL    = `${ICON_BASE}/icon_download.png`;
const ICON_URN   = `${ICON_BASE}/icon_urn.png`;
const ICON_STONE = `${ICON_BASE}/icon_tombstone.png`;

if (!listEl || !pageEl) {
  console.error('[burial-listings] Missing #graveList or #paginationControls');
} else {
  const pageBottomEl = ensureBottomPager();

  hideTableHeadings();  // keep table wrapper but hide header

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
      const td  = document.createElement('td');
      tr.classList.add('fade-in');
      td.colSpan = 4;

      const url      = b.audio_url || b.audioUrl || b.publicUrl || '';
      const hasAudio = !!url;
      const user     = b.username || b.user || 'Guest';
      const country  = (b.country && String(b.country).trim()) || '—';
      const size     = b.filesize || b.size || '';

      // ===== Card =====
      const card = document.createElement('section');
      card.className = 'dg-record';
      card.dataset.method = b.method || 'bury';

      // Legend
      const legend = document.createElement('div');
      legend.className = 'dg-record__legend';
      legend.textContent = (b.method === 'cremate') ? 'Crematory Record' : 'Burial Record';
      card.appendChild(legend);

      // Layout grid
      const grid = document.createElement('div');
      grid.className = 'dg-record__layout';
      card.appendChild(grid);

      // Name
      const head = document.createElement('div');
      head.className = 'dg-record__head';
      const nameEl = document.createElement('h3');
      nameEl.className = 'dg-record__name';
      nameEl.textContent = b.name || 'Unknown';
      head.appendChild(nameEl);
      grid.appendChild(head);

      // Actions
      const actions = document.createElement('div');
      actions.className = 'dg-actions';

      if (b.method !== 'cremate' && hasAudio) {
        const playBtn = document.createElement('button');
        playBtn.className = 'dg-btn dg-btn--play';
        playBtn.setAttribute('aria-label', 'Play or pause audio');
        playBtn.dataset.url = url;
        const playImg = document.createElement('img');
        playImg.src = ICON_PLAY; playImg.alt = '';
        // if an icon is missing, hide the whole button silently
        playImg.onerror = () => playBtn.remove();
        playBtn.appendChild(playImg);
        actions.appendChild(playBtn);

        const dl = document.createElement('a');
        dl.className = 'dg-btn';
        dl.href = url; dl.download = '';
        dl.target = '_blank'; dl.rel = 'noopener noreferrer';
        dl.title = 'Download';
        const dlImg = document.createElement('img');
        dlImg.src = ICON_DL; dlImg.alt = 'Download';
        dlImg.onerror = () => dl.remove();
        dl.appendChild(dlImg);
        actions.appendChild(dl);
      }

      grid.appendChild(actions);

      // Epitaph
      const epi = document.createElement('p');
      epi.className = 'dg-record__epitaph';
      epi.textContent = b.epitaph ? `“${b.epitaph}”` : '';
      grid.appendChild(epi);

      // Premium / method icon (placeholder area)
      const premium = document.createElement('div');
      premium.className = 'dg-record__premium';
      const badge = document.createElement('img');
      badge.className = 'dg-premium-icon';
      badge.src = (b.method === 'cremate') ? ICON_URN : ICON_STONE;
      badge.alt = '';
      badge.onerror = () => premium.remove();
      premium.appendChild(badge);
      grid.appendChild(premium);

      // Meta (fine print)
      const meta = document.createElement('div');
      meta.className = 'dg-record__meta';
      meta.innerHTML = `Country: ${country} | Buried: ${formatDate(b.timestamp)}${size ? ' | ' + size : ''}<br> User: ${user}`;
      grid.appendChild(meta);

      td.appendChild(card);
      tr.appendChild(td);
      listEl.appendChild(tr);
    });
  }

  function renderPagination(totalCount) {
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    buildPager(pageEl, totalPages);
    if (pageBottomEl) buildPager(pageBottomEl, totalPages);
  }

  function buildPager(container, totalPages) {
    if (!container) return;
    container.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = 'page-btn';
      if (i === currentPage) btn.classList.add('active');
      btn.onclick = () => fetchPage(i);
      container.appendChild(btn);
    }
  }

  // Helpers
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

  function ensureBottomPager() {
    let bottom = document.getElementById('paginationControlsBottom');
    if (bottom) return bottom;
    const table = listEl.closest('table');
    const host  = table?.parentNode || listEl.parentNode;
    bottom = document.createElement('div');
    bottom.id = 'paginationControlsBottom';
    host.insertBefore(bottom, table ? table.nextSibling : listEl.nextSibling);
    return bottom;
  }

  // Expose a reload helper so burial-flow can refresh after a new entry
  window.dgReloadBurials = () => fetchPage(1);

  // ---- Shared audio player & handlers (for .dg-btn--play) ----
  if (!window.__dgPlayer) {
    const player = new Audio();
    player.preload = 'none';

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.dg-btn--play');
      if (!btn) return;

      const img = btn.querySelector('img');
      const url = btn.dataset.url;
      if (!img || !url) return;

      const changingTrack = player.src !== url;

      if (changingTrack) {
        player.pause();
        document.querySelectorAll('.dg-btn--play.is-playing').forEach(b => {
          b.classList.remove('is-playing');
          const i = b.querySelector('img'); if (i) i.src = ICON_PLAY;
        });
        player.src = url;
      }

      if (player.paused) {
        player.play().then(() => {
          document.querySelectorAll('.dg-btn--play.is-playing').forEach(b => {
            b.classList.remove('is-playing');
            const i = b.querySelector('img'); if (i) i.src = ICON_PLAY;
          });
          btn.classList.add('is-playing');
          img.src = ICON_PAUSE;
        }).catch(()=>{});
      } else {
        player.pause();
        btn.classList.remove('is-playing');
        img.src = ICON_PLAY;
      }
    });

    player.addEventListener('ended', () => {
      document.querySelectorAll('.dg-btn--play.is-playing').forEach(b => {
        b.classList.remove('is-playing');
        const i = b.querySelector('img'); if (i) i.src = ICON_PLAY;
      });
    });

    window.__dgPlayer = player;
  }

  // Kick off
  fetchPage(1);
}

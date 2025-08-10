// burial-listings.js  

console.log('[burial-listings] v2025-08-10-1');

let currentPage = 1;
const pageSize   = 25;
const listEl     = document.getElementById('graveList');
const pageEl     = document.getElementById('paginationControls');

if (!listEl || !pageEl) {
  console.error('[burial-listings] Missing #graveList or #paginationControls');
} else {
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
      console.log('[burial-listings] sample row:', data?.[0]); 
      renderList(data);
      renderPagination(totalCount);
    } catch (err) {
      console.error('[burial-listings] Failed to fetch burials:', err);
    }
  }

  function renderList(data) {
    listEl.innerHTML = '';
    data.forEach(b => {
      const tr = document.createElement('tr');
      tr.classList.add('fade-in');

      const icon = document.createElement('img');
      icon.src = b.method === 'cremate'
        ? 'images/icon_urn.png'
        : 'images/icon_tombstone.png';
      icon.className = 'icon-img';

      // --- NEW: name cell with optional play button ---
      const tdName = document.createElement('td');
      tdName.appendChild(icon);

      // add play button if audio_url exists
      if (b.audio_url) {
        const playBtn = document.createElement('button');
        playBtn.className = 'dg-play';
        playBtn.dataset.url = b.audio_url;
        playBtn.textContent = '▶';
        tdName.appendChild(playBtn);
        tdName.appendChild(document.createTextNode(' ')); // space
      }

      tdName.appendChild(document.createTextNode(b.name));

      tr.append(
        tdName,
        createCell(new Date(b.timestamp).toLocaleDateString()),
        createCell(b.epitaph || ''),
        createCell(b.country || '')
      );
      listEl.appendChild(tr);
    });
  }

  function createCell(txt) {
    const td = document.createElement('td');
    td.textContent = txt;
    return td;
  }

  function renderPagination(totalCount) {
    const totalPages = Math.ceil(totalCount / pageSize);
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

  // kick off the first page immediately
  fetchPage(1);
}

// burial-listings.js  
// (runs immediately upon injection)

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

      // burial icon
      const icon = document.createElement('img');
      icon.src = b.method === 'cremate'
        ? 'images/icon_urn.png'
        : 'images/icon_tombstone.png';
      icon.className = 'icon-img';

      // filename cell
      const tdName = document.createElement('td');
      tdName.append(icon, document.createTextNode(' ' + b.name));

      // date cell
      const tdDate = createCell(new Date(b.timestamp).toLocaleDateString());

      // epitaph cell
      const tdEpit = createCell(b.epitaph || '');

      // listen cell (play + download)
      const tdListen = document.createElement('td');
      if (b.audio_url) {
        const playBtn = document.createElement('button');
        playBtn.className = 'dg-play';
        playBtn.dataset.url = b.audio_url;
        playBtn.innerHTML = '▶';
        tdListen.appendChild(playBtn);

        const dlLink = document.createElement('a');
        dlLink.href = b.audio_url;
        dlLink.download = b.name || 'download';
        const dlIcon = document.createElement('img');
        dlIcon.src = 'images/icon_download.png';
        dlIcon.className = 'icon-img';
        dlLink.appendChild(dlIcon);
        tdListen.appendChild(dlLink);
      }

      // country cell
      const tdCountry = createCell(b.country || '');

      tr.append(tdName, tdDate, tdEpit, tdListen, tdCountry);
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

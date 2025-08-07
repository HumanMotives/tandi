// burial-listings.js

document.addEventListener('DOMContentLoaded', () => {
  let currentPage = 1;
  const pageSize = 25;
  const listEl = document.getElementById('graveList');
  const pageEl = document.getElementById('paginationControls');

  async function fetchPage(page) {
    currentPage = page;
    try {
      const res = await fetch(
        'https://ticxhncusdycqjftohho.supabase.co/functions/v1/load-burials',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ page }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('load-burials function error:', err);
        return;
      }

      const { data, totalCount } = await res.json();
      renderList(data);
      renderPagination(totalCount);
    } catch (e) {
      console.error('Failed to fetch burials:', e);
    }
  }

  function renderList(data) {
    listEl.innerHTML = '';
    data.forEach(b => {
      const tr = document.createElement('tr');
      tr.classList.add('fade-in');

      const icon = document.createElement('img');
      icon.src =
        b.method === 'cremate'
          ? 'icons/icon_urn.png'
          : 'icons/icon_tombstone.png';
      icon.className = 'icon-img';

      const tdName = document.createElement('td');
      tdName.append(icon, document.createTextNode(b.name));

      tr.append(
        tdName,
        createCell(new Date(b.timestamp).toLocaleDateString()),
        createCell(b.epitaph || ''),
        createCell(b.country || '')
      );
      listEl.append(tr);
    });
  }

  function createCell(text) {
    const td = document.createElement('td');
    td.textContent = text;
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
      btn.addEventListener('click', () => fetchPage(i));
      pageEl.append(btn);
    }
  }

  // Kick things off
  fetchPage(1);
});

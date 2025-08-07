// scripts/burialListings.js

document.addEventListener('DOMContentLoaded', () => {
  let currentPage = 1;
  const pageSize = 25;
  const listEl = document.getElementById('graveList');
  const pageEl = document.getElementById('paginationControls');

  async function fetchPage(page) {
    currentPage = page;
    const res = await fetch(
      'https://ticxhncusdycqjftohho.supabase.co/functions/v1/load-burials',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page }),
      }
    );

    if (!res.ok) {
      console.error('load-burials function error', await res.text());
      return;
    }

    const { data, totalCount } = await res.json();
    renderList(data);
    renderPagination(totalCount);
  }

  function renderList(data) {
    listEl.innerHTML = '';
    data.forEach((b) => {
      const tr = document.createElement('tr');
      tr.classList.add('fade-in');

      const icon = document.createElement('img');
      icon.src =
        b.method === 'cremate'
          ? 'images/icon_urn.png'
          : 'images/icon_tombstone.png';
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
      btn.onclick = () => fetchPage(i);
      pageEl.append(btn);
    }
  }

  fetchPage(1);
});

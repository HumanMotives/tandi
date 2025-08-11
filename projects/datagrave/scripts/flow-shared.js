/* flow-shared.js — shared helpers for burial/cremation */
(function(){
  console.log('[flow-shared] init');

  // Progress: locate the 2nd .progress-fill as the "upload" bar
  function getUploadFillEl() {
    const explicit = document.querySelector('#uploadProgress .progress-fill');
    if (explicit) return explicit;
    const fills = document.querySelectorAll('.progress-fill');
    return fills[1] || fills[0] || null;
  }

  // Real upload with progress (PUT by default—switch to POST if needed)
  async function uploadWithProgress(uploadUrl, file, extraHeaders = {}) {
    console.log('[flow-shared] upload start', { size: file?.size, uploadUrl });
    return new Promise((resolve, reject) => {
      if (!uploadUrl || !file) return reject(new Error('Missing uploadUrl or file'));

      const fill = getUploadFillEl();
      if (fill) fill.style.width = '0%';

      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      Object.entries(extraHeaders || {}).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      // xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return;
        const pct = Math.max(0, Math.min(100, Math.round((evt.loaded / evt.total) * 100)));
        if (fill) fill.style.width = pct + '%';
      };

      xhr.onerror = () => reject(new Error('Upload failed (network)'));
      xhr.onload  = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (fill) fill.style.width = '100%';
          console.log('[flow-shared] upload ok');
          resolve({ status: xhr.status, response: xhr.response });
        } else {
          reject(new Error(`Upload failed: HTTP ${xhr.status}`));
        }
      };

      xhr.send(file);
    });
  }

  // Simple tombstone renderer (uses .tombstone container if present; otherwise injects)
  function renderTombstone({
    container = '#burial-summary',
    method = 'bury',
    name = 'Unknown',
    createdAt = '',
    buriedAt = '',
    epitaph = '',
    homeHref = '/projects/datagrave/'
  } = {}) {
    const host = document.querySelector(container) || document.body;
    let el = document.querySelector('.tombstone');
    if (!el) {
      el = document.createElement('section');
      el.className = 'tombstone';
      host.appendChild(el);
    }
    el.setAttribute('data-method', method);

    const fmt = (iso) => {
      if (!iso) return '—';
      const d = new Date(iso);
      return Number.isNaN(d) ? '—' : d.toLocaleDateString();
    };

    el.innerHTML = `
      <div class="ts-title">Here lies</div>
      <div class="ts-name" style="font-weight:700;font-size:clamp(26px,4vw,42px);letter-spacing:.01em">${escapeHtml(name)}</div>
      <div class="ts-dates" style="margin-top:.6em;font-variant-numeric:tabular-nums;letter-spacing:.02em;font-size:clamp(16px,2vw,22px)">
        <span>${fmt(createdAt)}</span><span class="sep" style="opacity:.6;margin:0 .35em">—</span><span>${fmt(buriedAt)}</span>
      </div>
      ${epitaph ? `<div class="ts-epitaph" style="font-style:italic;color:#6b6b6b;margin-top:.9em">“${escapeHtml(epitaph)}”</div>` : ''}
      <div class="options-afterlife" style="text-align:center;margin-top:1.25rem">
        <button class="button js-remains">Check the remains</button>
        <a class="link" href="${homeHref}">Lay another track to rest</a>
      </div>
    `;
    el.classList.add('show');

    // Hide remains for burials (CSS also enforces this if your stylesheet includes the rule)
    if (method === 'bury') {
      el.querySelector('.js-remains')?.remove();
    }
    console.log('[flow-shared] tombstone rendered', { method });
  }

  function finalizeTombstone({ method = 'bury' } = {}) {
    const stone = document.querySelector('.tombstone');
    if (stone) {
      stone.setAttribute('data-method', method);
      if (method === 'bury') {
        stone.querySelector('.js-remains')?.remove();
        document.querySelector('.options-afterlife')?.classList.remove('hidden');
      }
    }
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // expose
  window.DGFlow = {
    uploadWithProgress,
    renderTombstone,
    finalizeTombstone,
    getUploadFillEl,
  };
})();

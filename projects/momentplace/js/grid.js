// dummy dataset (in real app you fetch from Supabase)
const DUMMY = [
  {
    id: 'r1',
    title: 'Morning Pool',
    location: 'Casteren, NL',
    date: '2025-01-10T09:12:00Z',
    cover: 'https://images.unsplash.com/photo-1503435824048-a799a3a84f9e?auto=format&fit=crop&w=800&q=60',
    audio: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3',
    description: 'Short ambient capture of sunlight on the pool and kids playing.',
    likes: 12
  },
  {
    id: 'r2',
    title: 'Factory Door',
    location: 'Eindhoven, NL',
    date: '2025-01-12T14:00:00Z',
    cover: 'https://images.unsplash.com/photo-1505765056529-44d88a6f32d6?auto=format&fit=crop&w=800&q=60',
    audio: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3',
    description: 'Metal clinks and distant voices, compressed into a short loop.',
    likes: 7
  },
  {
    id: 'r3',
    title: 'Dune Walk',
    location: 'California, USA',
    date: '2025-01-05T18:30:00Z',
    cover: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=60',
    audio: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3',
    description: 'Wind and footsteps on sand turned into a mellow micro release.',
    likes: 23
  },
  {
    id: 'r4',
    title: 'Night Tram',
    location: 'Amsterdam, NL',
    date: '2025-01-20T21:15:00Z',
    cover: 'https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?auto=format&fit=crop&w=800&q=60',
    audio: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3',
    description: 'Low hum and passing announcements as a loop.',
    likes: 3
  },
  {
    id: 'r5',
    title: 'Forest Shimmer',
    location: 'Unknown',
    date: '2024-12-29T07:00:00Z',
    cover: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=60',
    audio: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3',
    description: 'Leaves, birds and distance water.',
    likes: 9
  }
];

// Utilities
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Render grid
const grid = document.getElementById('releasesGrid');
function renderGrid(records) {
  grid.innerHTML = '';
  records.forEach(r => {
    const el = document.createElement('article');
    el.className = 'card';
    el.innerHTML = `
      <img loading="lazy" src="${r.cover}" alt="${escapeHtml(r.title)}">
      <div class="card-body">
        <div class="card-title">${escapeHtml(r.title)}</div>
        <div class="card-meta">${escapeHtml(r.location)} • ${fmtDate(r.date)}</div>
        <div class="card-actions">
          <button class="btn btn-open" data-id="${r.id}">Luister</button>
          <div>
            <button class="btn-ghost btn-like" data-id="${r.id}">♡ <span class="count">${r.likes}</span></button>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(el);
  });
}

// escape helper
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, t=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[t])); }

// Modal logic
const modal = document.getElementById('playerModal');
const modalClose = document.getElementById('modalClose');
const modalTitle = document.getElementById('modalTitle');
const modalLocation = document.getElementById('modalLocation');
const modalDate = document.getElementById('modalDate');
const modalCover = document.getElementById('modalCover');
const modalAudio = document.getElementById('modalAudio');
const modalDesc = document.getElementById('modalDesc');
const btnLike = document.getElementById('btnLike');
const btnShare = document.getElementById('btnShare');
const likeCountSpan = document.getElementById('likeCount');

let currentRecord = null;

// open modal by id
function openById(id){
  const r = DUMMY.find(x=>x.id===id);
  if(!r) return;
  currentRecord = r;
  modal.setAttribute('aria-hidden','false');
  modalTitle.textContent = r.title;
  modalLocation.textContent = r.location;
  modalDate.textContent = fmtDate(r.date);
  modalCover.src = r.cover;
  modalDesc.textContent = r.description || '';
  modalAudio.src = r.audio;
  likeCountSpan.textContent = getLikes(r.id);
  // autoplay attempt
  modalAudio.currentTime = 0;
  modalAudio.play().catch(()=>{/* ignore autoplay errors */});
  document.body.style.overflow = 'hidden';
}

// close modal
function closeModal(){
  modalAudio.pause();
  modalAudio.src = '';
  modal.setAttribute('aria-hidden','true');
  currentRecord = null;
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e)=>{
  if(e.target === modal) closeModal();
});

// likes using localStorage (demo)
function getLikes(id){
  const saved = localStorage.getItem('likes_' + id);
  if(saved !== null) return Number(saved);
  const r = DUMMY.find(x=>x.id===id);
  return r ? (r.likes || 0) : 0;
}
function setLikes(id, n){
  localStorage.setItem('likes_' + id, String(n));
}

// attach listeners
document.addEventListener('click',(ev)=>{
  const openBtn = ev.target.closest('.btn-open');
  if(openBtn){
    const id = openBtn.dataset.id;
    openById(id);
    return;
  }
  const likeBtn = ev.target.closest('.btn-like');
  if(likeBtn){
    const id = likeBtn.dataset.id;
    const current = getLikes(id);
    const next = current + 1;
    setLikes(id, next);
    likeBtn.querySelector('.count').textContent = next;
    // Optional: send API call to server / Supabase to persist
    return;
  }
});

// modal like/share
btnLike.addEventListener('click', ()=>{
  if(!currentRecord) return;
  const id = currentRecord.id;
  const current = getLikes(id);
  const next = current + 1;
  setLikes(id, next);
  likeCountSpan.textContent = next;
  // update grid count if visible
  const btn = document.querySelector(`.btn-like[data-id="${id}"]`);
  if(btn) btn.querySelector('.count').textContent = next;
});

btnShare.addEventListener('click', async ()=>{
  if(!currentRecord) return;
  const url = location.href.split('#')[0] + '#release=' + currentRecord.id;
  if(navigator.share){
    try{
      await navigator.share({
        title: currentRecord.title,
        text: `Luister naar "${currentRecord.title}" — Moment/Place`,
        url
      });
    }catch(e){ /* cancelled */ }
  } else {
    // fallback: copy to clipboard
    await navigator.clipboard.writeText(url);
    alert('Link gekopieerd naar klembord');
  }
});

// initial render
renderGrid(DUMMY);

// keyboard close
document.addEventListener('keydown',(e)=>{
  if(e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModal();
});

// scripts/burial-flow.js
document.addEventListener('DOMContentLoaded', () => {
  // cache these once
  const state = {
    selectedFile: null,
    confirmed: false,
    premium: null,
  };

  // snarky texts
  const sarcasticRemarks = [
    "Right. This one had no potential anyway...",
    "Ever considered gardening instead of composing",
    "We see why this one didn't make the cut...",
    "Not the prettiest indeed.",
    "Some loops die so others may live.",
    "Another auditory tragedy.",
    "This one had... potential.",
    "Good decision. The world has enough crap already.",
    "Even the metronome gave up on this one.",
    "Overcooked. Overcompressed. Jeez",
    "The DAW giveth, and the DAW taketh away."
  ];
  const eulogies = [
    "As Above So Below.", "Not every loop is meant to bloom", "A waveform without purpose",
    "Never Stuck In A Loop Again", "It's Better This Way", "Gone before the drop",
    "Born to be muted.", "128 layers of bad decisions.", "Rendered... irrelevant",
    "Rest well, dear loop.", "Fade Out Forever", "Looped once too often", "Sick Drop. Dead."
  ];
  const vibes = [
    "Chillflop","CringeHop","Drum & Blahs","Technope","Impostor Synth-drome",
    "Synthcrave","Shite","Polka Punk","Teenage Angst in D Minor","Undefinable",
    "The Sound of Regret","Grind-NuJazz","Regretaton","Nope-step","EDehhhM",
    "Lo-Fried","Smarmbient"
  ];
  const cremationPhrases = [
    "Performing last rites...", "Praying to the audio gods... hold on...",
    "Approaching the Gates of Loop Heaven...", "Disintegrating Your Abominable Frequencies...",
    "Processing your terrible creation..."
  ];
  const ashesSamples = ["ashes1.mp3"];

  // helpers to grab elements
  const $ = id => document.getElementById(id);
  const elems = {
    uploadBox: $('uploadBox'),
    progressContainer: $('progressContainer'),
    analyzeFill: $('analyzeFill'),
    readyToBury: $('readyToBury'),
    sarcasticRemark: $('sarcasticRemark'),
    fileName: $('fileName'),
    fileDate: $('fileDate'),
    fileSize: $('fileSize'),
    fileVibe: $('fileVibe'),
    buryBtn: $('buryBtn'),
    cancelLink: $('cancelLink'),
    burialProgress: $('burialProgress'),
    buryFill: $('buryFill'),
    ceremony: $('ceremony'),
    ashesAudio: $('ashesAudio'),
    epitaphInput: $('epitaph'),
    methodSelector: $('methodSelector'),
  };

  function isClean(str) {
    return !/[<>]/.test(str) && !/https?:\/\//i.test(str);
  }

  // — DELEGATED CLICK HANDLERS —

  document.addEventListener('click', e => {
    // 1) Click on upload box → open file picker
    if (e.target.closest('#uploadBox')) {
      $('fileInput').click();
    }

    // 2) Click on bury button
    if (e.target.id === 'buryBtn') {
      handleBuryClick();
    }

    // 3) Click on cancel link
    if (e.target.id === 'cancelLink') {
      resetAll();
    }

    // 4) Premium tiles
    if (e.target.matches('.premium-btn')) {
      const p = e.target.dataset.premium;
      state.premium = p;
      document.querySelectorAll('.upsell-tile').forEach(tile => {
        tile.classList.toggle('active', tile.dataset.premium === p);
      });
      if (p === 'vip') {
        elems.epitaphInput.disabled = false;
      } else {
        elems.epitaphInput.disabled = true;
        elems.epitaphInput.value = '';
      }
      $('upsellSection')?.classList.remove('hidden');
    }
  });

  // — DELEGATED CHANGE HANDLER —

  document.addEventListener('change', e => {
    if (e.target.id !== 'fileInput') return;
    const file = e.target.files[0];
    if (!file) return;

    // validate
    const allowed = ['audio/wav','audio/mpeg','audio/ogg'];
    if (!allowed.includes(file.type)) {
      alert('Invalid file type. Only .wav, .mp3, .ogg allowed.');
      $('fileInput').value = '';
      return;
    }

    // kickoff analysis animation
    state.selectedFile = file;
    elems.uploadBox.classList.add('hidden');
    elems.methodSelector.style.display = 'none';
    state.confirmed = false;
    elems.analyzeFill.style.width = '0';
    elems.progressContainer.classList.remove('hidden');
    elems.readyToBury.classList.add('hidden');

    setTimeout(() => elems.analyzeFill.style.width = '100%', 50);
    setTimeout(showReadyToBury, 5000);
  });

  function showReadyToBury() {
    const f = state.selectedFile;
    elems.progressContainer.classList.add('hidden');
    elems.readyToBury.classList.remove('hidden');
    elems.sarcasticRemark.textContent = 
      `"${sarcasticRemarks[Math.floor(Math.random() * sarcasticRemarks.length)]}"`;
    elems.fileName.textContent = f.name;
    elems.fileDate.textContent = new Date(f.lastModified).toLocaleDateString();
    elems.fileSize.textContent = (f.size/1024/1024).toFixed(2) + ' MB';
    elems.fileVibe.textContent = vibes[Math.floor(Math.random() * vibes.length)];
    elems.epitaphInput.value = 
      eulogies[Math.floor(Math.random() * eulogies.length)];
  }

  function handleBuryClick() {
    if (!state.confirmed) {
      elems.buryBtn.textContent = 'Are You Sure?';
      elems.buryBtn.style.backgroundColor = '#a33';
      elems.cancelLink.classList.remove('hidden');
      state.confirmed = true;
      return;
    }
    // actual bury
    elems.readyToBury.classList.add('hidden');
    elems.burialProgress.classList.remove('hidden');
    $('burialMessage').textContent = 
      cremationPhrases[Math.floor(Math.random() * cremationPhrases.length)];
    elems.buryFill.style.width = '0';
    setTimeout(() => elems.buryFill.style.width = '100%', 50);
    setTimeout(() => {
      elems.burialProgress.classList.add('hidden');
      showCeremony();
    }, 5000);
  }

  function showCeremony() {
    const f = state.selectedFile;
    const method = document.querySelector('input[name="method"]:checked').value;
    const epit = elems.epitaphInput.value.trim() || "Gone, but never exported.";
    if (!isClean(epit)) {
      alert("Remove '<', '>' or URLs from epitaph.");
      return resetAll();
    }

    // send to Supabase
    grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'record_burial' })
      .then(token => fetch(
        'https://ticxhncusdycqjftohho.supabase.co/functions/v1/record-burial',
        {
          method: 'POST',
          headers: {
            'Content-Type':'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            name: f.name,
            method, epitaph: epit,
            country: '', token
          })
        }
      ));

    // build tombstone
    elems.ceremony.innerHTML = '';
    const tomb = document.createElement('div');
    tomb.className = 'tombstone';
    tomb.innerHTML = `
      Here lies<br>
      <strong>${f.name}</strong><br>
      ${new Date(f.lastModified).toLocaleDateString()}<br><br>
      <em>"${epit}"</em>
    `;
    elems.ceremony.appendChild(tomb);
    setTimeout(() => tomb.classList.add('show'), 50);
    $('aftercare').classList.remove('hidden');

    // prepend to table
    const tr = document.createElement('tr');
    tr.classList.add('fade-in');
    const icon = document.createElement('img');
    icon.src = method === 'cremate'
      ? 'icons/icon_urn.png'
      : 'icons/icon_tombstone.png';
    icon.className = 'icon-img';

    const cells = [
      (() => { const td = document.createElement('td'); td.append(icon, document.createTextNode(f.name)); return td; })(),
      (() => { const td = document.createElement('td'); td.textContent = new Date().toLocaleDateString(); return td; })(),
      (() => { const td = document.createElement('td'); td.textContent = epit; return td; })(),
      (() => { const td = document.createElement('td'); td.textContent = ''; return td; })(),
    ];
    cells.forEach(c => tr.appendChild(c));
    $('graveList').prepend(tr);
  }

  function resetAll() {
    state.selectedFile = null;
    state.confirmed = false;
    $('fileInput').value = '';
    elems.uploadBox.classList.remove('hidden');
    elems.methodSelector.style.display = 'block';
    elems.progressContainer.classList.add('hidden');
    elems.readyToBury.classList.add('hidden');
    elems.burialProgress.classList.add('hidden');
    elems.ceremony.innerHTML = '';
    $('aftercare').classList.add('hidden');
  }
});

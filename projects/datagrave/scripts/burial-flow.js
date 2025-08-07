// scripts/burial-flow.js

document.addEventListener('DOMContentLoaded', () => {
  // ─── Load header partial ────────────────────────────────────────────────
  fetch('partials/header.html')
    .then(r => r.text())
    .then(html => document.getElementById('common-header').innerHTML = html)
    .catch(console.error);

  // ─── Premium upsell logic ───────────────────────────────────────────────
  let selectedPremium = null;
  const epitaphInput = document.getElementById('epitaph');
  epitaphInput.disabled = true;

  document.querySelectorAll('.premium-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedPremium = btn.dataset.premium;
      document.querySelectorAll('.upsell-tile').forEach(tile => {
        tile.classList.toggle('active', tile.dataset.premium === selectedPremium);
      });

      // VIP headstone unlocks manual epitaph
      epitaphInput.disabled = (selectedPremium !== 'vip');
      if (selectedPremium !== 'vip') epitaphInput.value = '';

      // keep the upsell section visible
      document.getElementById('upsellSection').classList.remove('hidden');
    });
  });

  // ─── Common utilities & data ────────────────────────────────────────────
  function isClean(str) {
    return !/[<>]/.test(str) && !/https?:\/\//i.test(str);
  }

  // UI elements for the burial flow
  const fileInput       = document.getElementById('fileInput');
  const uploadBox       = document.getElementById('uploadBox');
  const progressContainer = document.getElementById('progressContainer');
  const analyzeFill     = document.getElementById('analyzeFill');
  const readyToBury     = document.getElementById('readyToBury');
  const fileNameSpan    = document.getElementById('fileName');
  const fileDateSpan    = document.getElementById('fileDate');
  const fileSizeTd      = document.getElementById('fileSize');
  const fileVibeTd      = document.getElementById('fileVibe');
  const sarcasticRemark = document.getElementById('sarcasticRemark');
  const buryBtn         = document.getElementById('buryBtn');
  const cancelLink      = document.getElementById('cancelLink');
  const burialProgress  = document.getElementById('burialProgress');
  const buryFill        = document.getElementById('buryFill');
  const ceremony        = document.getElementById('ceremony');
  const ashesAudio      = document.getElementById('ashesAudio');
  const graveListEl     = document.getElementById('graveList');

  let selectedFile = null, confirmed = false;

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
  const cremationPhrases = [
    "Performing last rites...", "Praying to the audio gods... hold on ...",
    "Approaching the Gates of Loop Heaven...", "Disintegrating Your Abominable Frequencies...",
    "Processing your terrible creation..."
  ];
  const ashesSamples = ["ashes1.mp3"];
  const vibes = [
    "Chillflop", "CringeHop", "Drum & Blahs", "Technope", "Impostor Synth-drome",
    "Synthcrave", "Shite", "Polka Punk", "Teenage Angst in D Minor", "Undefinable",
    "The Sound of Regret", "Grind-NuJazz", "Regretaton", "Nope-step", "EDehhhM",
    "Lo-Fried", "Smarmbient"
  ];

  // ─── File selection & analysis simulation ─────────────────────────────
  fileInput.addEventListener('change', e => {
    selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Validate file types
    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/ogg'];
    if (!allowedTypes.includes(selectedFile.type)) {
      alert('Invalid file type. Only .wav, .mp3, and .ogg files are allowed.');
      fileInput.value = '';
      return;
    }

    uploadBox.classList.add('hidden');
    document.getElementById('methodSelector').style.display = 'none';
    confirmed = false;

    analyzeFill.style.width = '0';
    progressContainer.classList.remove('hidden');
    readyToBury.classList.add('hidden');

    setTimeout(() => analyzeFill.style.width = '100%', 50);
    setTimeout(() => {
      progressContainer.classList.add('hidden');
      readyToBury.classList.remove('hidden');

      sarcasticRemark.textContent =
        '"' + sarcasticRemarks[Math.floor(Math.random() * sarcasticRemarks.length)] + '"';
      fileNameSpan.textContent = selectedFile.name;
      fileDateSpan.textContent = new Date(selectedFile.lastModified).toLocaleDateString();
      fileSizeTd.textContent = (selectedFile.size / 1024 / 1024).toFixed(2) + ' MB';
      fileVibeTd.textContent = vibes[Math.floor(Math.random() * vibes.length)];
      document.getElementById('epitaph').value =
        eulogies[Math.floor(Math.random() * eulogies.length)];
    }, 5000);
  });

  // ─── Confirm & bury button logic ──────────────────────────────────────
  function confirmOrBuryFile(btn) {
    if (!confirmed) {
      btn.textContent = 'Are You Sure?';
      btn.style.backgroundColor = '#a33';
      cancelLink.classList.remove('hidden');
      confirmed = true;
    } else {
      readyToBury.classList.add('hidden');
      burialProgress.classList.remove('hidden');
      document.getElementById('burialMessage').textContent =
        cremationPhrases[Math.floor(Math.random() * cremationPhrases.length)];
      buryFill.style.width = '0';
      setTimeout(() => buryFill.style.width = '100%', 50);
      setTimeout(() => {
        burialProgress.classList.add('hidden');
        showCeremony();
      }, 5000);
    }
  }
  buryBtn.addEventListener('click', () => confirmOrBuryFile(buryBtn));

  // ─── Show the “tombstone” & record to Supabase ─────────────────────────
  async function showCeremony() {
    const method = document.querySelector('input[name="method"]:checked').value;
    const epitaphText = document.getElementById('epitaph').value.trim() ||
      "Gone, but never exported.";

    if (!isClean(epitaphText)) {
      alert("Please remove '<', '>' or any URLs from your epitaph.");
      return resetAll();
    }

    const displayName = selectedFile.name.length > 30
      ? selectedFile.name.substring(0, 27) + '...'
      : selectedFile.name;

    await recordBurial(displayName, method, epitaphText);

    // render tombstone
    ceremony.innerHTML = '';
    const tomb = document.createElement('div');
    tomb.className = 'tombstone';
    tomb.innerHTML = `
      Here lies<br>
      <strong>${displayName}</strong><br>
      ${new Date(selectedFile.lastModified).toLocaleDateString()}<br><br>
      <em>"${epitaphText}"</em>
    `;
    ceremony.appendChild(tomb);
    setTimeout(() => tomb.classList.add('show'), 50);

    document.getElementById('aftercare').classList.remove('hidden');

    // prepend to listing
    const tr = document.createElement('tr');
    tr.classList.add('fade-in');
    const icon = document.createElement('img');
    icon.src = method === 'cremate'
      ? 'images/icon_urn.png'
      : 'images/icon_tombstone.png';
    icon.className = 'icon-img';
    const tdName = document.createElement('td');
    tdName.append(icon, document.createTextNode(displayName));
    const tdDate2 = createCell(new Date(selectedFile.lastModified).toLocaleDateString());
    const tdEpit2 = createCell(epitaphText);
    const tdCountry2 = createCell('');
    tr.append(tdName, tdDate2, tdEpit2, tdCountry2);
    graveListEl.prepend(tr);
  }

  // ─── Helpers & reset ──────────────────────────────────────────────────
  function createCell(text) {
    const td = document.createElement('td');
    td.textContent = text;
    return td;
  }

  function resetAll() {
    selectedFile = null;
    confirmed = false;
    fileInput.value = '';
    uploadBox.classList.remove('hidden');
    document.getElementById('methodSelector').style.display = 'block';
    progressContainer.classList.add('hidden');
    readyToBury.classList.add('hidden');
    burialProgress.classList.add('hidden');
    ceremony.innerHTML = '';
    document.getElementById('aftercare').classList.add('hidden');
  }

  // ─── Play ashes audio ─────────────────────────────────────────────────
  function playAshes() {
    ashesAudio.src = ashesSamples[Math.floor(Math.random() * ashesSamples.length)];
    ashesAudio.classList.remove('hidden');
    ashesAudio.play();
  }

  // ─── Supabase record-burial call ──────────────────────────────────────
  async function recordBurial(name, method, epitaph) {
    if (!isClean(name) || !isClean(epitaph)) {
      console.error('Invalid characters or URLs in name/epitaph');
      return;
    }

    let country = '';
    try {
      const res = await fetch('https://ipapi.co/country/');
      if (res.ok) country = await res.text();
    } catch {}

    const token = await grecaptcha.execute(RECAPTCHA_SITE_KEY, {
      action: 'record_burial'
    });

    const response = await fetch(
      'https://ticxhncusdycqjftohho.supabase.co/functions/v1/record-burial',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ name, method, epitaph, country, token })
      }
    );

    if (!response.ok) {
      console.error('Failed to record burial:', await response.text());
    }
    return response.json();
  }

});

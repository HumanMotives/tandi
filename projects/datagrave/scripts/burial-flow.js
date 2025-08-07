// scripts/burial-flow.js

document.addEventListener('DOMContentLoaded', () => {
  // --- Premium setup ---
  const epitaphInput = document.getElementById('epitaph');
  let selectedPremium = null;

  if (epitaphInput) {
    epitaphInput.disabled = true; // default locked

    document.querySelectorAll('.premium-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedPremium = btn.dataset.premium;

        // highlight tiles
        document.querySelectorAll('.upsell-tile').forEach(tile => {
          tile.classList.toggle('active', tile.dataset.premium === selectedPremium);
        });

        // VIP unlocks epitaph, others lock & clear
        if (selectedPremium === 'vip') {
          epitaphInput.disabled = false;
        } else {
          epitaphInput.disabled = true;
          epitaphInput.value = '';
        }

        document.getElementById('upsellSection')?.classList.remove('hidden');
      });
    });
  }

  // --- Core burial flow ---
  const fileInput         = document.getElementById('fileInput');
  const uploadBox         = document.getElementById('uploadBox');
  const methodSelector    = document.getElementById('methodSelector');
  const progressContainer = document.getElementById('progressContainer');
  const analyzeFill       = document.getElementById('analyzeFill');
  const readyToBury       = document.getElementById('readyToBury');
  const sarcasticRemark   = document.getElementById('sarcasticRemark');
  const fileNameSpan      = document.getElementById('fileName');
  const fileDateSpan      = document.getElementById('fileDate');
  const fileSizeTd        = document.getElementById('fileSize');
  const fileVibeTd        = document.getElementById('fileVibe');
  const buryBtn           = document.getElementById('buryBtn');
  const cancelLink        = document.getElementById('cancelLink');
  const burialProgress    = document.getElementById('burialProgress');
  const buryFill          = document.getElementById('buryFill');
  const ceremony          = document.getElementById('ceremony');
  const ashesAudio        = document.getElementById('ashesAudio');
  const graveListEl       = document.getElementById('graveList');

  if (!fileInput || !uploadBox) {
    console.error('[burial-flow] Missing fileInput or uploadBox');
    return;
  }

  // ** NEW: clicking the dashed box opens the file picker **
  uploadBox.addEventListener('click', () => fileInput.click());

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

  function isClean(str) {
    return !/[<>]/.test(str) && !/https?:\/\//i.test(str);
  }

  fileInput.addEventListener('change', e => {
    selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // validate type
    const allowed = ['audio/wav','audio/mpeg','audio/ogg'];
    if (!allowed.includes(selectedFile.type)) {
      alert('Invalid file type. Only .wav, .mp3, .ogg allowed.');
      fileInput.value = '';
      return;
    }

    // begin analysis
    uploadBox.classList.add('hidden');
    methodSelector.style.display = 'none';
    confirmed = false;
    analyzeFill.style.width = '0';
    progressContainer.classList.remove('hidden');
    readyToBury.classList.add('hidden');

    setTimeout(() => analyzeFill.style.width = '100%', 50);
    setTimeout(() => {
      progressContainer.classList.add('hidden');
      readyToBury.classList.remove('hidden');
      sarcasticRemark.textContent = '"' + sarcasticRemarks[Math.floor(Math.random() * sarcasticRemarks.length)] + '"';
      fileNameSpan.textContent = selectedFile.name;
      fileDateSpan.textContent = new Date(selectedFile.lastModified).toLocaleDateString();
      fileSizeTd.textContent = (selectedFile.size/1024/1024).toFixed(2) + ' MB';
      fileVibeTd.textContent = vibes[Math.floor(Math.random() * vibes.length)];
      epitaphInput.value = eulogies[Math.floor(Math.random() * eulogies.length)];
    }, 5000);
  });

  buryBtn.addEventListener('click', () => {
    if (!confirmed) {
      buryBtn.textContent = 'Are You Sure?';
      buryBtn.style.backgroundColor = '#a33';
      cancelLink.classList.remove('hidden');
      confirmed = true;
      return;
    }

    // commit burial
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
  });

  cancelLink.addEventListener('click', resetAll);

  function showCeremony() {
    const method = document.querySelector('input[name="method"]:checked').value;
    const epit = epitaphInput.value.trim() || "Gone, but never exported.";
    if (!isClean(epit)) {
      alert("Remove '<', '>' or URLs from epitaph.");
      return resetAll();
    }

    // record via Supabase
    recordBurial(selectedFile.name, method, epit);

    // tombstone display
    ceremony.innerHTML = '';
    const tomb = document.createElement('div');
    tomb.className = 'tombstone';
    tomb.innerHTML = `
      Here lies<br>
      <strong>${selectedFile.name}</strong><br>
      ${new Date(selectedFile.lastModified).toLocaleDateString()}<br><br>
      <em>"${epit}"</em>
    `;
    ceremony.appendChild(tomb);
    setTimeout(() => tomb.classList.add('show'), 50);
    document.getElementById('aftercare').classList.remove('hidden');

    // prepend listing
    const tr = document.createElement('tr');
    tr.classList.add('fade-in');
    const icon = document.createElement('img');
    icon.src = method==='cremate'?'icons/icon_urn.png':'icons/icon_tombstone.png';
    icon.className = 'icon-img';

    const tdName = document.createElement('td');
    tdName.append(icon, document.createTextNode(selectedFile.name));

    const tdDate = document.createElement('td');
    tdDate.textContent = new Date().toLocaleDateString();

    const tdEpit = document.createElement('td');
    tdEpit.textContent = epit;

    const tdCountry = document.createElement('td');
    tdCountry.textContent = '';

    tr.append(tdName, tdDate, tdEpit, tdCountry);
    graveListEl.prepend(tr);
  }

  function resetAll() {
    selectedFile = null;
    confirmed = false;
    fileInput.value = '';
    uploadBox.classList.remove('hidden');
    methodSelector.style.display = 'block';
    progressContainer.classList.add('hidden');
    readyToBury.classList.add('hidden');
    burialProgress.classList.add('hidden');
    ceremony.innerHTML = '';
    document.getElementById('aftercare').classList.add('hidden');
  }

  async function recordBurial(name, method, epitaph) {
    const token = await grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'record_burial' });
    await fetch(
      'https://ticxhncusdycqjftohho.supabase.co/functions/v1/record-burial',
      {
        method: 'POST',
        headers: {
          'Content-Type':'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ name, method, epitaph, country:'', token })
      }
    );
  }
});

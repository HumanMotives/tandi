import { clamp } from './state.js';

const CAMS = [
  { id: 'A', name: 'A', label: 'West Hall' },
  { id: 'B', name: 'B', label: 'Dining' },
  { id: 'C', name: 'C', label: 'Storage' },
  { id: 'D', name: 'D', label: 'East Hall' },
    { id: 'F', name: 'F', label: 'Service Bay' },
];

export function createUI(){
  const el = {
    screens: {
      menu: document.getElementById('screenMenu'),
      office: document.getElementById('screenOffice'),
      cams: document.getElementById('screenCams'),
      pause: document.getElementById('screenPause'),
      gameover: document.getElementById('screenGameOver'),
      win: document.getElementById('screenWin'),
    },
    hudTime: document.getElementById('hudTime'),
    hudPower: document.getElementById('hudPower'),
    hudUsage: document.getElementById('hudUsage'),

    btnStart: document.getElementById('btnStart'),
    selectNight: document.getElementById('selectNight'),

    chkAudio: document.getElementById('chkAudio'),
    chkFlicker: document.getElementById('chkFlicker'),

    btnCams: document.getElementById('btnCams'),
    btnOffice: document.getElementById('btnOffice'),
    btnPause: document.getElementById('btnPause'),

    btnCams2: document.getElementById('btnCams2'),
    btnDoorL: document.getElementById('btnDoorL'),
    btnDoorR: document.getElementById('btnDoorR'),
    btnScanL: document.getElementById('btnScanL'),
    btnScanR: document.getElementById('btnScanR'),

    doorLeft: document.getElementById('doorLeft'),
    doorRight: document.getElementById('doorRight'),
    scanLeft: document.getElementById('scanLeft'),
    scanRight: document.getElementById('scanRight'),

    hallLeft: document.getElementById('hallLeft'),
    hallRight: document.getElementById('hallRight'),

    alertLog: document.getElementById('alertLog'),

    mapGrid: document.getElementById('mapGrid'),
    camName: document.getElementById('camName'),
    camSignal: document.getElementById('camSignal'),
    camScene: document.getElementById('camScene'),
    camFrame: document.getElementById('camFrame'),

    btnResume: document.getElementById('btnResume'),
    btnQuit: document.getElementById('btnQuit'),

    btnNextNight: document.getElementById('btnNextNight'),
    btnWinMenu: document.getElementById('btnWinMenu'),

    bestInfo: document.getElementById('bestInfo'),
  };

  const handlers = {
    start: null,
    quit: null,
    resume: null,
    nextNight: null,
    toggleCams: null,
    setMode: null,
    toggleDoor: null,
    scan: null,
    ventSeal: null,
    selectCam: null,
    anyKeyGameOver: null,
  };

  function showOnly(key){
    for (const k of Object.keys(el.screens)) {
      el.screens[k].classList.toggle('hidden', k !== key);
    }
  }

  function showScreen(key){
    showOnly(key);

    // HUD buttons: do small affordances
    const inGame = (key !== 'menu');
    el.btnCams.disabled = !inGame;
    el.btnOffice.disabled = !inGame;
    el.btnPause.disabled = !inGame;
  }

  function updateHUD(state){
    el.hudTime.textContent = formatTime(state);
    el.hudPower.textContent = String(Math.round(state.power.percent));

    const bars = clamp(state.power.usage, 1, 5);
    const barEls = el.hudUsage.querySelectorAll('.bar');
    barEls.forEach((b, i) => {
      b.style.background = (i < bars) ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.03)';
      b.style.borderColor = (i < bars) ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.12)';
    });

    // threat lighting follows scan state
    if (state && state.office) updateThreatLighting(state);
  }

  function formatTime(state){
    // 12AM to 6AM across nightDurationSeconds
    const progress = clamp(state.time.seconds / state.rules.nightDurationSeconds, 0, 1);
    const minutesFrom12 = Math.floor(progress * 6 * 60); // 6 hours -> 360 minutes
    const totalMinutes = minutesFrom12;

    // Map into clock display. We keep simple: each "hour" is 60 minutes.
    const hourIndex = Math.floor(totalMinutes / 60); // 0..5
    const minute = totalMinutes % 60;

    const hour = hourIndex === 0 ? 12 : hourIndex;
    const mm = String(minute).padStart(2, '0');
    return `${hour}:${mm} AM`;
  }

  function setDoor(side, closed){
    const node = side === 'left' ? el.doorLeft : el.doorRight;
    node.classList.toggle('isClosed', !!closed);
  }

  function setScan(side, active){
    const node = side === 'left' ? el.scanLeft : el.scanRight;
    node.classList.toggle('hidden', !active);
    node.classList.toggle('active', !!active);
  }


  function setThreat(which, active, kind = null){
    const node = which === 'left' ? el.hallLeft : el.hallRight;
    node.classList.toggle('hidden', !active);

    // Hallway head assets
    if (which === 'left') {
      node.classList.toggle('wardenHead', active && kind === 'warden');
    } else {
      node.classList.remove('wardenHead');
    }

    if (which === 'right') {
      node.classList.toggle('glintHead', active && kind === 'glint');
    } else {
      node.classList.remove('glintHead');
    }
  }

  function updateThreatLighting(state){
    // Make threats pop when the correct scan is held
    const leftLit = state.office.scan.left;
    const rightLit = state.office.scan.right;

    el.hallLeft.classList.toggle('isLit', leftLit && !el.hallLeft.classList.contains('hidden'));
    el.hallRight.classList.toggle('isLit', rightLit && !el.hallRight.classList.contains('hidden'));
    el.ventThreat.classList.toggle('isLit', ventLit && !el.ventThreat.classList.contains('hidden'));
  }

  function logAlert(text){
    const now = new Date();
    const stamp = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    _appendLog(`[${stamp}] ${text}`);
  }

  function _appendLog(line){
    // in-memory only; state owns log, but for prototype we show last few
    const existing = el.alertLog.textContent.trim();
    const lines = existing === '…' || existing === '' ? [] : existing.split('\n');
    lines.push(line);
    while (lines.length > 6) lines.shift();
    el.alertLog.textContent = lines.join('\n');
  }

  function buildMap(){
    el.mapGrid.innerHTML = '';
    CAMS.forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mapNode';
      btn.dataset.camId = c.id;
      btn.innerHTML = `<span>${c.id}</span><span class="tag">${c.label}</span>`;
      btn.addEventListener('click', () => handlers.selectCam && handlers.selectCam(c.id));
      el.mapGrid.appendChild(btn);
    });
  }

  function setCamera(camId, state, ai){
    el.camName.textContent = camId;

    // active node highlight
    el.mapGrid.querySelectorAll('.mapNode').forEach((n) => {
      n.classList.toggle('isActive', n.dataset.camId === camId);
    });

    // signal status (simple)
    const signalBad = state.power.out || (ai && ai.getSignalJammed && ai.getSignalJammed(state, camId));
    el.camSignal.textContent = signalBad ? 'SIGNAL WEAK' : 'SIGNAL OK';
    el.camSignal.classList.toggle('bad', signalBad);

    // camera flicker setting
    const flickerEnabled = getSetting('flicker');
    el.camFrame.classList.toggle('flicker', !!flickerEnabled);

    // Build placeholder scene
    el.camScene.innerHTML = '';
    const scene = document.createElement('div');
    scene.className = 'scene';
    const grid = document.createElement('div');
    grid.className = 'sceneGrid';
    scene.appendChild(grid);

    const label = document.createElement('div');
    label.className = 'entityLabel';
    label.textContent = `Location: ${CAMS.find(x=>x.id===camId)?.label || camId}`;
    scene.appendChild(label);

    // place entities if present on this cam
    const entities = (ai && ai.getEntitiesOnCam) ? ai.getEntitiesOnCam(state, camId) : [];
    let anyNear = false;

    entities.forEach((ent) => {
      const div = document.createElement('div');
      div.className = `entity ${ent.kind}`;

      // Warden uses a real image (animatronic head) instead of the placeholder shape
      if (ent.kind === 'warden') {
        div.classList.add('hasImg');
        const img = document.createElement('img');
        img.className = 'entityImg';
        img.alt = 'Warden';
        img.src = './assets/img/warden.png';
        div.appendChild(img);
      }

      // Position
      div.style.left = ent.x + '%';
      div.style.top = ent.y + '%';

      // Depth cues based on Y (top = far, bottom = near)
      const y01 = Math.max(0, Math.min(1, ent.y / 80)); // normalize
      const scale = 0.85 + y01 * 0.35;                  // 0.85..1.20
      const blur = (1 - y01) * 1.8;                     // far = blurrier
      const shadowY = y01 * 16;                         // near = heavier shadow drop
      const shadowBlur = y01 * 26;

      div.style.setProperty('--scale', String(scale));
      div.style.setProperty('--blur', blur.toFixed(2) + 'px');
      div.style.setProperty('--shadowY', shadowY.toFixed(1) + 'px');
      div.style.setProperty('--shadowBlur', shadowBlur.toFixed(1) + 'px');

      // Danger state when very close (near the bottom of the frame)
      const isNear = ent.y >= 60;
      if (isNear) {
        anyNear = true;
        div.classList.add('danger');
      }

      // Glint uses a real image (blue giraffe animatronic head)
      if (ent.kind === 'glint') {
        div.classList.add('hasImg');
        const img = document.createElement('img');
        img.className = 'entityImg';
        img.alt = 'Glint';
        img.src = './assets/img/glint.png';
        div.appendChild(img);
      }

      scene.appendChild(div);
    });

    // Camera zoom + danger vignette when something is close on this cam
    el.camFrame.classList.toggle('zoomNear', anyNear);
    el.camFrame.classList.toggle('dangerVignette', anyNear);

    el.camScene.appendChild(scene);
  }

  function refreshBest(){
    const best = Number(localStorage.getItem('ns_bestNight') || '0');
    el.bestInfo.textContent = best > 0 ? `Best night reached: ${best}` : '';
  }

  function setSettingsFromMenu(){
    // settings are read live via getters
  }

  function getSetting(key){
    if (key === 'audio') return !!el.chkAudio.checked;
    if (key === 'flicker') return !!el.chkFlicker.checked;
    return false;
  }

  // Wiring UI events
  el.btnStart.addEventListener('click', () => {
    const night = Number(el.selectNight.value || '1');
    handlers.start && handlers.start(night);
  });

  el.btnCams.addEventListener('click', () => handlers.setMode && handlers.setMode('cams'));
  el.btnOffice.addEventListener('click', () => handlers.setMode && handlers.setMode('office'));
  el.btnPause.addEventListener('click', () => {
    // handled in main via esc, but allow click
    const evt = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(evt);
  });

  el.btnCams2.addEventListener('click', () => handlers.setMode && handlers.setMode('cams'));

  el.btnDoorL.addEventListener('click', () => handlers.toggleDoor && handlers.toggleDoor('left'));
  el.btnDoorR.addEventListener('click', () => handlers.toggleDoor && handlers.toggleDoor('right'));

  // Scan buttons: pointer events with capture so they work immediately and reliably
  el.btnScanL.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    el.btnScanL.setPointerCapture?.(e.pointerId);
    handlers.scan && handlers.scan('left', true);
  });
  el.btnScanL.addEventListener('pointerup', (e) => {
    e.preventDefault();
    handlers.scan && handlers.scan('left', false);
  });
  el.btnScanL.addEventListener('pointercancel', () => handlers.scan && handlers.scan('left', false));
  el.btnScanL.addEventListener('pointerleave', () => handlers.scan && handlers.scan('left', false));

  el.btnScanR.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    el.btnScanR.setPointerCapture?.(e.pointerId);
    handlers.scan && handlers.scan('right', true);
  });
  el.btnScanR.addEventListener('pointerup', (e) => {
    e.preventDefault();
    handlers.scan && handlers.scan('right', false);
  });
  el.btnScanR.addEventListener('pointercancel', () => handlers.scan && handlers.scan('right', false));
  el.btnScanR.addEventListener('pointerleave', () => handlers.scan && handlers.scan('right', false));

  // game over any key
  window.addEventListener('keydown', () => {
    if (!handlers.anyKeyGameOver) return;
    const over = !el.screens.gameover.classList.contains('hidden');
    if (over) handlers.anyKeyGameOver();
  });

  buildMap();
  refreshBest();

  // public API
  return {
    showScreen,
    updateHUD,
    setDoor,
    setScan,
    setThreat,
    logAlert,
    setCamera,
    refreshBest,

    setSettingsFromMenu,
    getSetting,

    onStart: (fn) => handlers.start = fn,
    onQuit: (fn) => handlers.quit = fn,
    onResume: (fn) => handlers.resume = fn,
    onNextNight: (fn) => handlers.nextNight = fn,
    onToggleCams: (fn) => handlers.toggleCams = fn,
    onSetMode: (fn) => handlers.setMode = fn,
    onToggleDoor: (fn) => handlers.toggleDoor = fn,
    onScan: (fn) => handlers.scan = fn,
    onVentSeal: (fn) => handlers.ventSeal = fn,
    onSelectCam: (fn) => handlers.selectCam = fn,
    onAnyKeyGameOver: (fn) => handlers.anyKeyGameOver = fn,

    triggerToggleCams: () => handlers.toggleCams && handlers.toggleCams(),
    triggerAnyKeyGameOver: () => handlers.anyKeyGameOver && handlers.anyKeyGameOver(),
  };
}

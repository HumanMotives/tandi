import { clamp } from './state.js';

const CAMS = [
  { id: 'A', name: 'A', label: 'Hall North' },
  { id: 'B', name: 'B', label: 'Dining' },
  { id: 'C', name: 'C', label: 'Storage' },
  { id: 'D', name: 'D', label: 'Hall South' },
  { id: 'E', name: 'E', label: 'Vent Junction' },
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
    btnVent: document.getElementById('btnVent'),

    doorLeft: document.getElementById('doorLeft'),
    doorRight: document.getElementById('doorRight'),
    scanLeft: document.getElementById('scanLeft'),
    scanRight: document.getElementById('scanRight'),
    vent: document.getElementById('vent'),

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

  function setVentSealed(isSealed){
    el.vent.classList.toggle('isSealed', !!isSealed);
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
    entities.forEach((ent) => {
      const div = document.createElement('div');
      div.className = `entity ${ent.kind}`;
      div.style.left = ent.x + '%';
      div.style.top = ent.y + '%';
      scene.appendChild(div);
    });

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

  el.btnScanL.addEventListener('mousedown', () => handlers.scan && handlers.scan('left', true));
  el.btnScanL.addEventListener('mouseup', () => handlers.scan && handlers.scan('left', false));
  el.btnScanL.addEventListener('mouseleave', () => handlers.scan && handlers.scan('left', false));

  el.btnScanR.addEventListener('mousedown', () => handlers.scan && handlers.scan('right', true));
  el.btnScanR.addEventListener('mouseup', () => handlers.scan && handlers.scan('right', false));
  el.btnScanR.addEventListener('mouseleave', () => handlers.scan && handlers.scan('right', false));

  el.btnVent.addEventListener('click', () => handlers.ventSeal && handlers.ventSeal());

  el.btnResume.addEventListener('click', () => handlers.resume && handlers.resume());
  el.btnQuit.addEventListener('click', () => handlers.quit && handlers.quit());

  el.btnNextNight.addEventListener('click', () => handlers.nextNight && handlers.nextNight());
  el.btnWinMenu.addEventListener('click', () => handlers.quit && handlers.quit());

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
    setVentSealed,
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

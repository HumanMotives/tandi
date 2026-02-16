import { createInitialState, clamp } from './state.js';
import { createUI } from './ui.js';
import { createAudio } from './audio.js';
import { createAI } from './ai.js';

const TICK_MS = 100; // simulation tick
const REALTIME_FPS = 60;

const app = {
  state: createInitialState(),
  ui: null,
  audio: null,
  ai: null,
  lastTs: 0,
  accum: 0,
};

function boot(){
  app.ui = createUI();
  app.audio = createAudio(app.ui);
  app.ai = createAI();

  bindUI();
  bindKeys();
  app.ui.showScreen('menu');

  requestAnimationFrame(loop);
}

function bindUI(){
  const ui = app.ui;

  ui.onStart((night) => {
    app.state = createInitialState({ night });
    app.ai.reset(app.state);
    ui.setSettingsFromMenu();
    app.audio.setEnabled(ui.getSetting('audio'));
    ui.showScreen('office');
    // Ensure scans work immediately and start clean
    app.state.office.scan.left = false;
    app.state.office.scan.right = false;
    app.state.office.threats.left.active = false;
    app.state.office.threats.right.active = false;
    app.state.office.threats.vent.active = false;
    ui.setScan('left', false);
    ui.setScan('right', false);
    ui.setThreat('left', false);
    ui.setThreat('right', false);
    ui.setThreat('vent', false);
    ui.logAlert('Systems online.');
    app.audio.playBoot();
  });

  ui.onQuit(() => {
    app.state.mode = 'menu';
    ui.showScreen('menu');
    ui.refreshBest();
    app.audio.playClick();
  });

  ui.onResume(() => {
    togglePause(false);
  });

  ui.onNextNight(() => {
    const nextNight = clamp(app.state.night + 1, 1, 3);
    app.state = createInitialState({ night: nextNight });
    app.ai.reset(app.state);
    ui.showScreen('office');
    ui.logAlert(`Night ${nextNight} started.`);
    app.audio.playBoot();
  });

  ui.onToggleCams(() => {
    if (app.state.mode === 'office') {
      setMode('cams');
    } else if (app.state.mode === 'cams') {
      setMode('office');
    }
  });

  ui.onSetMode((mode) => setMode(mode));
  ui.onToggleDoor((side) => toggleDoor(side));
  ui.onScan((side, isDown) => setScan(side, isDown));
  ui.onVentSeal(() => toggleVentSeal());
  ui.onSelectCam((camId) => setCam(camId));
  ui.onAnyKeyGameOver(() => {
    if (app.state.mode === 'gameover') {
      app.state.mode = 'menu';
      ui.showScreen('menu');
      ui.refreshBest();
    }
  });
}

function bindKeys(){
  window.addEventListener('keydown', (e) => {
    if (app.state.mode === 'menu') return;

    if (app.state.mode === 'gameover') {
      app.ui.triggerAnyKeyGameOver();
      return;
    }

    if (e.key === 'Escape') {
      togglePause();
      return;
    }

    if (app.state.mode === 'pause' || app.state.mode === 'win') return;

    if (e.key === 'Tab') {
      e.preventDefault();
      app.ui.triggerToggleCams();
      return;
    }

    if (e.key === '1') toggleDoor('left');
    if (e.key === '2') toggleDoor('right');

    if (e.key.toLowerCase() === 'q') setScan('left', true);
    if (e.key.toLowerCase() === 'e') setScan('right', true);

    if (e.key.toLowerCase() === 'v') toggleVentSeal();
  });

  window.addEventListener('keyup', (e) => {
    if (e.key.toLowerCase() === 'q') setScan('left', false);
    if (e.key.toLowerCase() === 'e') setScan('right', false);
  });
}

function setMode(mode){
  if (app.state.mode === 'pause' || app.state.mode === 'gameover' || app.state.mode === 'win') return;

  app.state.mode = mode;
  if (mode === 'office') {
    // Release scans when returning to office
    app.state.office.scan.left = false;
    app.state.office.scan.right = false;
    app.ui.setScan('left', false);
    app.ui.setScan('right', false);
    app.ui.showScreen('office');
    app.audio.playClick();
  }
  if (mode === 'cams') {
    app.ui.showScreen('cams');
    app.state.camera.openSeconds = 0;
    app.audio.playCamOpen();
  }
}

function togglePause(force){
  const nowPaused = (force !== undefined) ? force : app.state.mode !== 'pause';
  if (app.state.mode === 'menu') return;
  if (app.state.mode === 'gameover') return;
  if (app.state.mode === 'win') return;

  if (nowPaused) {
    app.state.prevMode = app.state.mode;
    app.state.mode = 'pause';
    app.ui.showScreen('pause');
    app.audio.playClick();
  } else {
    app.state.mode = app.state.prevMode || 'office';
    app.ui.showScreen(app.state.mode);
    app.audio.playClick();
  }
}

function toggleDoor(side){
  if (app.state.mode !== 'office') return;
  const door = app.state.office.doors[side];
  door.closed = !door.closed;
  app.ui.setDoor(side, door.closed);
  app.audio.playDoor(door.closed);
}

function setScan(side, isDown){
  if (app.state.mode !== 'office') return;
  app.state.office.scan[side] = isDown;
  app.ui.setScan(side, isDown);
  if (isDown) app.audio.playScanOn();
}

function toggleVentSeal(){
  if (app.state.mode !== 'office') return;
  app.state.office.ventSealed = !app.state.office.ventSealed;
  app.ui.setVentSealed(app.state.office.ventSealed);
  app.audio.playClick();
}

function setCam(camId){
  if (app.state.mode !== 'cams') return;
  app.state.camera.current = camId;
  app.ui.setCamera(camId, app.state, app.ai);
  app.audio.playClick();
}

function loop(ts){
  if (!app.lastTs) app.lastTs = ts;
  const dt = ts - app.lastTs;
  app.lastTs = ts;

  // render-time accumulation for fixed-step sim
  app.accum += dt;
  while (app.accum >= TICK_MS) {
    tick(TICK_MS / 1000);
    app.accum -= TICK_MS;
  }

  requestAnimationFrame(loop);
}

function tick(dt){
  const s = app.state;

  // update HUD always (menu shows zeros but ok)
  app.ui.updateHUD(s);

  if (s.mode === 'pause' || s.mode === 'menu' || s.mode === 'gameover' || s.mode === 'win') {
    return;
  }

  // time progression: 12AM to 6AM
  // total night duration scaled by difficulty
  const nightSeconds = s.rules.nightDurationSeconds;
  s.time.seconds += dt * s.rules.timeScale;

  // win
  if (s.time.seconds >= nightSeconds) {
    winNight();
    return;
  }

  // mode-specific counters
  if (s.mode === 'cams') {
    s.camera.openSeconds += dt;
  }

  // energy usage
  const usage = computeUsage(s);
  s.power.usage = usage;
  s.power.percent = clamp(s.power.percent - usage * s.rules.powerDrainPerBarPerSecond * dt, 0, 100);

  // power out behavior: when 0%, systems forced off
  if (s.power.percent <= 0) {
    s.power.out = true;
    // force open doors and disable scans/vent
    s.office.doors.left.closed = false;
    s.office.doors.right.closed = false;
    s.office.scan.left = false;
    s.office.scan.right = false;
    s.office.ventSealed = false;
    app.ui.setDoor('left', false);
    app.ui.setDoor('right', false);
    app.ui.setScan('left', false);
    app.ui.setScan('right', false);
    app.ui.setVentSealed(false);
    app.ui.logAlert('Power depleted. Systems offline.');
  } else {
    s.power.out = false;
  }

  // AI update
  const aiEvents = app.ai.update(s, dt);
  for (const ev of aiEvents) {
    if (ev.type === 'alert') app.ui.logAlert(ev.text);
    if (ev.type === 'sound') app.audio.playSting(ev.kind);
  }

  // Update office threat silhouettes
  if (s.mode === 'office') {
    app.ui.setThreat('left', s.office.threats.left.active);
    app.ui.setThreat('right', s.office.threats.right.active);
    app.ui.setThreat('vent', s.office.threats.vent.active);
  }


  // If in cams, update feed visuals
  if (s.mode === 'cams') {
    app.ui.setCamera(s.camera.current, s, app.ai);
  }

  // checks for losing
  if (app.ai.checkLoss(s)) {
    gameOver();
    return;
  }
}

function computeUsage(s){
  // baseline 1 bar
  let bars = 1;

  if (s.mode === 'cams') bars += 1;
  if (s.office.doors.left.closed) bars += 1;
  if (s.office.doors.right.closed) bars += 1;
  if (s.office.scan.left || s.office.scan.right) bars += 1;
  if (s.office.ventSealed) bars += 1;

  return clamp(bars, 1, 5);
}

function gameOver(){
  app.state.mode = 'gameover';
  app.ui.setThreat('left', false);
  app.ui.setThreat('right', false);
  app.ui.setThreat('vent', false);
  app.ui.showScreen('gameover');
  app.audio.playJumpscare();
}

function winNight(){
  app.state.mode = 'win';
  app.ui.setThreat('left', false);
  app.ui.setThreat('right', false);
  app.ui.setThreat('vent', false);
  app.ui.showScreen('win');
  app.audio.playWin();

  // save best night reached
  const best = Number(localStorage.getItem('ns_bestNight') || '0');
  if (app.state.night > best) localStorage.setItem('ns_bestNight', String(app.state.night));
}

boot();

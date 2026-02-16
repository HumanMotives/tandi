import { clamp } from './state.js';

// Map layout (original): cams + office edges + vent route
// We'll treat positions as nodes. Each enemy has its own route.
const ROUTES = {
  // Warden: methodical, goes toward left/right door via halls
  warden: ['B','A','D','OFFICE_LEFT'],
  // Glint: reacts to camera usage, tends to approach right door
  glint: ['F','C','D','OFFICE_RIGHT'],
  // Whisper: vent route
  whisper: ['E','VENT','OFFICE_VENT'],
};

function rand01(){ return Math.random(); }

export function createAI(){
  const enemies = {
    warden: {
      kind: 'warden',
      name: 'Warden',
      route: ROUTES.warden,
      idx: 0,
      progress: 0,
      moveCooldown: 0,
      baseMoveInterval: 12, // seconds per move at night1
      lastSeenAt: -999,
    },
    glint: {
      kind: 'glint',
      name: 'Glint',
      route: ROUTES.glint,
      idx: 0,
      progress: 0,
      moveCooldown: 0,
      baseMoveInterval: 14,
      camAggro: 0,
      lastSeenAt: -999,
    },
    whisper: {
      kind: 'whisper',
      name: 'Whisper',
      route: ROUTES.whisper,
      idx: 0,
      progress: 0,
      moveCooldown: 0,
      baseMoveInterval: 16,
      lastSeenAt: -999,
    }
  };

  function reset(state){
    enemies.warden.idx = 0;
    enemies.glint.idx = 0;
    enemies.whisper.idx = 0;

    enemies.warden.moveCooldown = 6;
    enemies.glint.moveCooldown = 8;
    enemies.whisper.moveCooldown = 10;

    enemies.glint.camAggro = 0;
  }

  function update(state, dt){
    const events = [];

    // Track camera watch time for Glint
    if (state.mode === 'cams') {
      state.camera.totalLookSeconds += dt;
      enemies.glint.camAggro += dt * state.rules.camLookAggroPerSecond * state.rules.aiAggro;
    } else {
      // decay aggro when not watching
      enemies.glint.camAggro = Math.max(0, enemies.glint.camAggro - dt * 0.04);
    }

    // Update each enemy movement
    stepEnemy(state, enemies.warden, dt, events);
    stepEnemy(state, enemies.glint, dt, events);
    stepEnemy(state, enemies.whisper, dt, events);


    // Sync threat windows (give player time to react and show silhouettes)
    syncThreatWindows(state, dt, events);

    // Occasional subtle alerts
    if (rand01() < 0.02 * dt * state.rules.aiAggro) {
      events.push({ type: 'alert', text: '…a faint scrape somewhere.' });
      events.push({ type: 'sound', kind: 'scrape' });
    }

    return events;
  }

  function stepEnemy(state, enemy, dt, events){
    enemy.moveCooldown -= dt;
    if (enemy.moveCooldown > 0) return;

    const aggro = state.rules.aiAggro * (enemy.kind === 'glint' ? (1 + enemy.camAggro) : 1);
    const interval = Math.max(4.2, enemy.baseMoveInterval / aggro);

    // attempt move with chance; more aggressive later in night
    const nightProgress = clamp(state.time.seconds / state.rules.nightDurationSeconds, 0, 1);
    const moveChance = clamp(0.45 + nightProgress * 0.35, 0, 0.92);

    if (rand01() < moveChance) {
      const prev = enemy.route[enemy.idx];
      enemy.idx = clamp(enemy.idx + 1, 0, enemy.route.length - 1);
      const next = enemy.route[enemy.idx];

      if (next !== prev) {
        // log a hint sometimes if player is on cams
        if (state.mode === 'cams' && rand01() < 0.55) {
          events.push({ type: 'alert', text: `Movement detected near ${mapLabel(next)}.` });
        } else if (state.mode === 'office' && rand01() < 0.28) {
          events.push({ type: 'alert', text: 'Footsteps in the dark.' });
        }
      }
    }

    enemy.moveCooldown = interval;
  }

  function mapLabel(node){
    if (node === 'OFFICE_LEFT') return 'Left Door';
    if (node === 'OFFICE_RIGHT') return 'Right Door';
    if (node === 'OFFICE_VENT') return 'Vent';
    return `CAM ${node}`;
  }


  function syncThreatWindows(state, dt, events){
    // Decrement timers
    for (const k of ['left','right','vent']) {
      const t = state.office.threats[k];
      if (t.active) t.timer = Math.max(0, t.timer - dt);
    }

    const wPos = enemies.warden.route[enemies.warden.idx];
    const gPos = enemies.glint.route[enemies.glint.idx];
    const sPos = enemies.whisper.route[enemies.whisper.idx];

    // Warden triggers left entry threat
    if (wPos === 'OFFICE_LEFT' && !state.office.threats.left.active) {
      state.office.threats.left.active = true;
      state.office.threats.left.timer = 3.0;
      events.push({ type: 'alert', text: 'A shape blocks the left hall.' });
      events.push({ type: 'sound', kind: 'scrape' });
    }

    // Glint triggers right entry threat
    if (gPos === 'OFFICE_RIGHT' && !state.office.threats.right.active) {
      state.office.threats.right.active = true;
      state.office.threats.right.timer = 3.0;
      events.push({ type: 'alert', text: 'A reflection stirs on the right.' });
      events.push({ type: 'sound', kind: 'scrape' });
    }

    // Whisper triggers vent threat
    if (sPos === 'OFFICE_VENT' && !state.office.threats.vent.active) {
      state.office.threats.vent.active = true;
      state.office.threats.vent.timer = 3.2;
      events.push({ type: 'alert', text: 'Air pressure drops near the vent.' });
      events.push({ type: 'sound', kind: 'scrape' });
    }

    // If player successfully blocks, push enemy back and clear threat
    if (state.office.threats.left.active && state.office.doors.left.closed && !state.power.out) {
      // push Warden back
      enemies.warden.idx = Math.max(1, enemies.warden.idx - 1);
      enemies.warden.moveCooldown = 8;
      state.office.threats.left.active = false;
      state.office.threats.left.timer = 0;
      events.push({ type: 'alert', text: 'Left hall clears.' });
    }

    if (state.office.threats.right.active && state.office.doors.right.closed && !state.power.out) {
      enemies.glint.idx = Math.max(1, enemies.glint.idx - 1);
      enemies.glint.moveCooldown = 9;
      state.office.threats.right.active = false;
      state.office.threats.right.timer = 0;
      events.push({ type: 'alert', text: 'Right side quiets down.' });
    }

    if (state.office.threats.vent.active && state.office.ventSealed && !state.power.out) {
      enemies.whisper.idx = Math.max(1, enemies.whisper.idx - 1);
      enemies.whisper.moveCooldown = 10;
      state.office.threats.vent.active = false;
      state.office.threats.vent.timer = 0;
      events.push({ type: 'alert', text: 'Vent pressure normalizes.' });
    }
  }

  function checkLoss(state){
    // If power is out, threats are lethal immediately when enemy is at entry
    const wPos = enemies.warden.route[enemies.warden.idx];
    const gPos = enemies.glint.route[enemies.glint.idx];
    const sPos = enemies.whisper.route[enemies.whisper.idx];

    if (state.power.out) {
      if (wPos === 'OFFICE_LEFT') return true;
      if (gPos === 'OFFICE_RIGHT') return true;
      if (sPos === 'OFFICE_VENT') return true;
    }

    // Threat windows: if timer runs out and entry not blocked, player loses
    const tL = state.office.threats.left;
    const tR = state.office.threats.right;
    const tV = state.office.threats.vent;

    if (tL.active && tL.timer <= 0 && !state.office.doors.left.closed) return true;
    if (tR.active && tR.timer <= 0 && !state.office.doors.right.closed) return true;
    if (tV.active && tV.timer <= 0 && !state.office.ventSealed) return true;

    return false;
  }

  function getEntitiesOnCam(state, camId){
    // Show enemies on cameras based on their current node.
    // If they are at office entries, map them to the closest camera so you can still see them.
    const ents = [];
    const mappings = [
      { enemy: enemies.warden, kind: 'warden' },
      { enemy: enemies.glint, kind: 'glint' },
      { enemy: enemies.whisper, kind: 'whisper' },
    ];

    const mapOfficeNodeToCam = (node) => {
      if (node === 'OFFICE_LEFT') return 'D';   // hall south
      if (node === 'OFFICE_RIGHT') return 'D';  // hall south
      if (node === 'OFFICE_VENT') return 'E';   // vent junction
      if (node === 'VENT') return 'E';
      return node;
    };

    for (const m of mappings) {
      const rawNode = m.enemy.route[m.enemy.idx];
      const node = mapOfficeNodeToCam(rawNode);

      if (node === camId) {
        // deterministic-ish placement per cam+enemy
        const seed = (camId.charCodeAt(0) * 17 + m.kind.charCodeAt(0) * 7) % 1000;
        let x = 18 + (seed % 60);
        let y = 18 + ((seed * 3) % 55);

        // if at office entry, push closer to bottom so it feels like hallway proximity
        if (rawNode === 'OFFICE_LEFT') { x = 20; y = 58; }
        if (rawNode === 'OFFICE_RIGHT') { x = 70; y = 58; }
        if (rawNode === 'OFFICE_VENT') { x = 46; y = 54; }

        ents.push({ kind: m.kind, x, y });
      }
    }

    return ents;
  }

  function getSignalJammed(state, camId){
    // if Whisper is at E or VENT, add chance of weak signal
    const sPos = enemies.whisper.route[enemies.whisper.idx];
    if (sPos === 'E' || sPos === 'VENT') {
      return Math.random() < 0.28;
    }
    // if Glint very angry, minor flicker
    if (enemies.glint.camAggro > 2.0) {
      return Math.random() < 0.18;
    }
    return false;
  }

  return {
    reset,
    update,
    checkLoss,
    getEntitiesOnCam,
    getSignalJammed,
  };
}

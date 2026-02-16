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
    null.idx = 0;

    enemies.warden.moveCooldown = 6;
    enemies.glint.moveCooldown = 8;
    null.moveCooldown = 10;

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
      return node;
    };

    for (const m of mappings) {
      const rawNode = m.enemy.route[m.enemy.idx];
      const node = mapOfficeNodeToCam(rawNode);

      if (node === camId) {
        // deterministic-ish placement per cam+enemy
        const seed = (camId.charCodeAt(0) * 17 + m.kind.charCodeAt(0) * 7) % 1000;
        let x = 18 + (seed % 60);
        // Depth based on route progress (top = far, bottom = close)
        const progressRatio = m.enemy.idx / (m.enemy.route.length - 1);
        let y = 15 + progressRatio * 65;

        // if at office entry, push closer to bottom so it feels like hallway proximity
        if (rawNode === 'OFFICE_LEFT') { x = 20; y = 58; }
        if (rawNode === 'OFFICE_RIGHT') { x = 70; y = 58; }

        ents.push({ kind: m.kind, x, y });
      }
    }

    return ents;
  }

  function getSignalJammed(state, camId){
    // if Whisper is at E or VENT, add chance of weak signal
    if (sPos === 'E' || sPos === 'VENT') {
      return Math.random() < 0.28;
    }
    // if Glint very angry, minor flicker
    if (enemies.glint.camAggro > 2.0) {
      return Math.random() < 0.18;
    }
    return false;
  }

  function getOfficeThreatKinds(state){
    const wPos = enemies.warden.route[enemies.warden.idx];
    const gPos = enemies.glint.route[enemies.glint.idx];

    return {
      left: (state.office.threats.left.active && wPos === 'OFFICE_LEFT') ? 'warden' : null,
      right: (state.office.threats.right.active && gPos === 'OFFICE_RIGHT') ? 'glint' : null,
    };
  }

  return {
    reset,
    update,
    checkLoss,
    getEntitiesOnCam,
    getSignalJammed,
    getOfficeThreatKinds,
  };
}

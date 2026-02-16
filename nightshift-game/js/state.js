export function clamp(n, min, max){
  return Math.max(min, Math.min(max, n));
}

export function createInitialState(opts = {}){
  const night = clamp(Number(opts.night || 1), 1, 3);

  // night difficulty scaling
  const difficulty = {
    1: { aiAggro: 1.0, powerDrain: 1.0, nightSeconds: 360 },
    2: { aiAggro: 1.25, powerDrain: 1.08, nightSeconds: 360 },
    3: { aiAggro: 1.45, powerDrain: 1.15, nightSeconds: 360 },
  }[night];

  return {
    night,
    mode: 'menu', // menu | office | cams | pause | gameover | win
    prevMode: 'office',

    time: {
      seconds: 0,
    },

    power: {
      percent: 100,
      usage: 1,
      out: false,
    },

    office: {
      doors: {
        left: { closed: false },
        right: { closed: false },
      },
      scan: {
        left: false,
        right: false,
      },
      ventSealed: false,

      // Threat windows: when an enemy reaches an entry, the player gets a short reaction window
      threats: {
        left: { active: false, timer: 0 },
        right: { active: false, timer: 0 },
        vent: { active: false, timer: 0 },
      },
    },

    camera: {
      current: 'A',
      openSeconds: 0,
      // tracking for AI that reacts to cam usage
      totalLookSeconds: 0,
      lastCamSwitchAt: 0,
    },

    rules: {
      // total night duration: 6 minutes (placeholder)
      nightDurationSeconds: difficulty.nightSeconds,
      // timeScale: if you want faster nights, raise this. Keep 1.0 for now.
      timeScale: 1.0,
      powerDrainPerBarPerSecond: 0.06 * difficulty.powerDrain,
      aiAggro: difficulty.aiAggro,
      camLookAggroPerSecond: 0.06,
      camFlickerEnabled: true,
    },

    // alerts
    log: {
      lines: [],
      max: 6,
    },
  };
}

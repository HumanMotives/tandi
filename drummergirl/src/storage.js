// src/storage.js

const STORAGE_KEY = "ds_state_v1";
const LEGACY_KEYS = ["drumSchoolState", "drummergirlState", "ds_state"];

/* -------------------------
   Public API
------------------------- */

export function loadState() {
  const migrated = tryMigrateLegacy();
  if (migrated) return ensureStateShape(migrated);

  const raw = safeGet(STORAGE_KEY);
  if (!raw) return ensureStateShape(createDefaultState());

  try {
    const parsed = JSON.parse(raw);
    return ensureStateShape(parsed);
  } catch {
    return ensureStateShape(createDefaultState());
  }
}

export function saveState(state) {
  const shaped = ensureStateShape(state);
  safeSet(STORAGE_KEY, JSON.stringify(shaped));
}

/* --- getters (compat) --- */

// Total stars used for world unlocking etc.
export function getTotalStars(state) {
  const s = ensureStateShape(state);

  // Prefer per-level stars if any exist
  const map = s.progress.levelStars || {};
  const vals = Object.values(map);
  if (vals.length > 0) {
    return vals.reduce((sum, v) => sum + clampInt(v, 0, 5), 0);
  }

  // Fallback to global stars
  return clamp0(Number(s.progress.stars || 0));
}

// Backwards alias some files might still call
export function getStars(state) {
  return getTotalStars(state);
}

export function getTicks(state) {
  const s = ensureStateShape(state);
  return clamp0(Number(s.progress.ticks || 0));
}

export function getGrooves(state) {
  const s = ensureStateShape(state);
  return clamp0(Number(s.progress.grooves || 0));
}

export function getPlayerName(state) {
  const s = ensureStateShape(state);
  return String(s.player.name || "").trim();
}

export function getPlayerAvatarSrc(state) {
  const s = ensureStateShape(state);
  return String(s.player.avatarSrc || "./assets/img/avatars/ds_avatar_rockbunny.png");
}

/**
 * Per-level stars (0..5). This is what the level grid should show.
 */
export function getLevelStars(state, levelId) {
  const s = ensureStateShape(state);
  const id = String(levelId || "").trim();
  if (!id) return 0;
  const v = s.progress.levelStars[id];
  return clampInt(v ?? 0, 0, 5);
}

/**
 * Set per-level stars (0..5), persists.
 */
export function setLevelStars(state, levelId, stars0to5) {
  const s = ensureStateShape(state);
  const id = String(levelId || "").trim();
  if (!id) return s;
  s.progress.levelStars[id] = clampInt(stars0to5, 0, 5);
  saveState(s);
  return s;
}

/**
 * Unlock logic used by older map.js:
 * - first level unlocked
 * - each next level unlocked if previous level has >= 1 star
 */
export function isLevelUnlocked(state, worldLevels, levelId) {
  const levels = Array.isArray(worldLevels) ? worldLevels : [];
  const id = String(levelId || "").trim();
  if (!id) return true;
  if (levels.length === 0) return true;

  const idx = levels.findIndex((l) => String(l.id || "") === id);
  if (idx <= 0) return true;

  const prev = levels[idx - 1];
  const prevId = String(prev?.id || "").trim();
  if (!prevId) return true;

  return getLevelStars(state, prevId) >= 1;
}

/* --- setters --- */

export function setPlayerName(state, name) {
  const s = ensureStateShape(state);
  s.player.name = String(name || "").trim();
  saveState(s);
  return s;
}

export function setPlayerAvatar(state, avatarSrc) {
  const s = ensureStateShape(state);
  s.player.avatarSrc = String(avatarSrc || "").trim();
  saveState(s);
  return s;
}

export function addProgress(state, { stars = 0, ticks = 0, grooves = 0 } = {}) {
  const s = ensureStateShape(state);
  s.progress.stars = clamp0(Number(s.progress.stars || 0) + Number(stars || 0));
  s.progress.ticks = clamp0(Number(s.progress.ticks || 0) + Number(ticks || 0));
  s.progress.grooves = clamp0(Number(s.progress.grooves || 0) + Number(grooves || 0));
  saveState(s);
  return s;
}

export function unlock(state, type, id) {
  const s = ensureStateShape(state);
  const t = String(type || "").trim();
  const key = String(id || "").trim();
  if (!t || !key) return s;
  if (!s.unlocks[t]) s.unlocks[t] = {};
  s.unlocks[t][key] = true;
  saveState(s);
  return s;
}

/* Optional nav helpers (handy, harmless if unused) */
export function setCurrentWorld(state, worldId) {
  const s = ensureStateShape(state);
  s.nav.worldId = String(worldId || "").trim() || s.nav.worldId;
  saveState(s);
  return s;
}

export function setCurrentLevel(state, levelId) {
  const s = ensureStateShape(state);
  s.nav.levelId = String(levelId || "").trim() || s.nav.levelId;
  saveState(s);
  return s;
}

/* -------------------------
   Internal helpers
------------------------- */

function createDefaultState() {
  return {
    version: 1,
    player: {
      name: "",
      avatarSrc: "./assets/img/avatars/ds_avatar_rockbunny.png"
    },
    progress: {
      // global totals (optional)
      stars: 0,
      ticks: 0,
      grooves: 0,

      // per-level stars (used by map.js + unlock chain)
      levelStars: {
        // example: "w1-l1": 1
      }
    },
    unlocks: {
      avatars: {
        rockbunny: true,
        lion: true
      },
      drums: {},
      teachers: {},
      music: {},
      worlds: {
        w1: true,
        w2: true,
        w3: true
      }
    },
    nav: {
      worldId: "w1",
      levelId: null
    }
  };
}

function ensureStateShape(input) {
  const base = createDefaultState();
  const s = (input && typeof input === "object") ? input : {};

  const out = {
    ...base,
    ...s,
    player: {
      ...base.player,
      ...(s.player || {})
    },
    progress: {
      ...base.progress,
      ...(s.progress || {}),
      levelStars: {
        ...(base.progress.levelStars || {}),
        ...(s.progress?.levelStars || {})
      }
    },
    unlocks: {
      ...base.unlocks,
      ...(s.unlocks || {}),
      avatars: { ...base.unlocks.avatars, ...(s.unlocks?.avatars || {}) },
      drums: { ...(s.unlocks?.drums || {}) },
      teachers: { ...(s.unlocks?.teachers || {}) },
      music: { ...(s.unlocks?.music || {}) },
      worlds: { ...base.unlocks.worlds, ...(s.unlocks?.worlds || {}) }
    },
    nav: {
      ...base.nav,
      ...(s.nav || {})
    }
  };

  // sanitize numeric fields
  out.progress.stars = clamp0(Number(out.progress.stars || 0));
  out.progress.ticks = clamp0(Number(out.progress.ticks || 0));
  out.progress.grooves = clamp0(Number(out.progress.grooves || 0));

  // sanitize levelStars values
  if (!out.progress.levelStars || typeof out.progress.levelStars !== "object") {
    out.progress.levelStars = {};
  } else {
    for (const k of Object.keys(out.progress.levelStars)) {
      out.progress.levelStars[k] = clampInt(out.progress.levelStars[k], 0, 5);
    }
  }

  // sanitize strings
  out.player.name = String(out.player.name || "");
  out.player.avatarSrc = String(out.player.avatarSrc || base.player.avatarSrc);

  // ensure required nested objects exist
  if (!out.unlocks.avatars) out.unlocks.avatars = { ...base.unlocks.avatars };
  if (!out.unlocks.drums) out.unlocks.drums = {};
  if (!out.unlocks.teachers) out.unlocks.teachers = {};
  if (!out.unlocks.music) out.unlocks.music = {};
  if (!out.unlocks.worlds) out.unlocks.worlds = { ...base.unlocks.worlds };

  return out;
}

function clamp0(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, x);
}

function clampInt(n, min, max) {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch {
    // ignore
  }
}

function tryMigrateLegacy() {
  const existing = safeGet(STORAGE_KEY);
  if (existing) return null;

  for (const k of LEGACY_KEYS) {
    const raw = safeGet(k);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      safeSet(STORAGE_KEY, JSON.stringify(parsed));
      return parsed;
    } catch {
      // ignore corrupt legacy
    }
  }
  return null;
}

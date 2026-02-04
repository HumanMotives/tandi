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

export function getStars(state) {
  return clamp0(Number(state?.progress?.stars || 0));
}

export function getTotalStars(state) {
  // In our current model, totalStars == progress.stars
  // Keep this export because older screens may rely on it.
  return getStars(state);
}

export function getTicks(state) {
  return clamp0(Number(state?.progress?.ticks || 0));
}

export function getGrooves(state) {
  return clamp0(Number(state?.progress?.grooves || 0));
}

export function getPlayerName(state) {
  return String(state?.player?.name || "").trim();
}

export function getPlayerAvatarSrc(state) {
  return String(state?.player?.avatarSrc || "./assets/img/avatars/ds_avatar_rockbunny.png");
}

/* --- setters --- */

export function setPlayerName(state, name) {
  const shaped = ensureStateShape(state);
  shaped.player.name = String(name || "").trim();
  saveState(shaped);
  return shaped;
}

export function setPlayerAvatar(state, avatarSrc) {
  const shaped = ensureStateShape(state);
  shaped.player.avatarSrc = String(avatarSrc || "").trim();
  saveState(shaped);
  return shaped;
}

export function addProgress(state, { stars = 0, ticks = 0, grooves = 0 } = {}) {
  const shaped = ensureStateShape(state);
  shaped.progress.stars = clamp0(shaped.progress.stars + Number(stars || 0));
  shaped.progress.ticks = clamp0(shaped.progress.ticks + Number(ticks || 0));
  shaped.progress.grooves = clamp0(shaped.progress.grooves + Number(grooves || 0));
  saveState(shaped);
  return shaped;
}

export function unlock(state, type, id) {
  const shaped = ensureStateShape(state);
  if (!shaped.unlocks[type]) shaped.unlocks[type] = {};
  shaped.unlocks[type][id] = true;
  saveState(shaped);
  return shaped;
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
      stars: 0,
      ticks: 0,
      grooves: 0
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
      ...(s.progress || {})
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

  out.progress.stars = clamp0(Number(out.progress.stars || 0));
  out.progress.ticks = clamp0(Number(out.progress.ticks || 0));
  out.progress.grooves = clamp0(Number(out.progress.grooves || 0));

  out.player.name = String(out.player.name || "");
  out.player.avatarSrc = String(out.player.avatarSrc || base.player.avatarSrc);

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
      // ignore
    }
  }
  return null;
}

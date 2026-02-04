// src/storage.js

// One stable key, so you can refactor freely without breaking saves
const STORAGE_KEY = "ds_state_v1";

// If you previously used another key (e.g. "drumSchoolState"), we can migrate it.
const LEGACY_KEYS = ["drumSchoolState", "drummergirlState", "ds_state"];

/**
 * Load state from localStorage.
 * - Creates defaults if missing
 * - Migrates from legacy keys if found
 * - Ensures shape is always complete (so UI never crashes)
 */
export function loadState() {
  const migrated = tryMigrateLegacy();
  if (migrated) return ensureStateShape(migrated);

  const raw = safeGet(STORAGE_KEY);
  if (!raw) return ensureStateShape(createDefaultState());

  try {
    const parsed = JSON.parse(raw);
    return ensureStateShape(parsed);
  } catch (e) {
    // Corrupt storage: reset
    return ensureStateShape(createDefaultState());
  }
}

/**
 * Save state to localStorage.
 */
export function saveState(state) {
  const shaped = ensureStateShape(state);
  safeSet(STORAGE_KEY, JSON.stringify(shaped));
}

/**
 * Update player's name and persist.
 */
export function setPlayerName(state, name) {
  const shaped = ensureStateShape(state);
  shaped.player.name = String(name || "").trim();
  saveState(shaped);
  return shaped;
}

/**
 * Optional helper: update avatar and persist
 */
export function setPlayerAvatar(state, avatarSrc) {
  const shaped = ensureStateShape(state);
  shaped.player.avatarSrc = String(avatarSrc || "").trim();
  saveState(shaped);
  return shaped;
}

/**
 * Optional helper: add progress (ticks/stars/grooves)
 */
export function addProgress(state, { stars = 0, ticks = 0, grooves = 0 } = {}) {
  const shaped = ensureStateShape(state);
  shaped.progress.stars = clamp0(shaped.progress.stars + Number(stars || 0));
  shaped.progress.ticks = clamp0(shaped.progress.ticks + Number(ticks || 0));
  shaped.progress.grooves = clamp0(shaped.progress.grooves + Number(grooves || 0));
  saveState(shaped);
  return shaped;
}

/**
 * Optional helper: unlock items
 * type: "avatars" | "drums" | "teachers" | "music" | "worlds"
 */
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
      // default avatar (you uploaded these)
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
    // Your current navigation context if you want it later
    nav: {
      worldId: "w1",
      levelId: null
    }
  };
}

function ensureStateShape(input) {
  const base = createDefaultState();
  const s = (input && typeof input === "object") ? input : {};

  // shallow merge top-level
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

  // sanitize numeric fields
  out.progress.stars = clamp0(Number(out.progress.stars || 0));
  out.progress.ticks = clamp0(Number(out.progress.ticks || 0));
  out.progress.grooves = clamp0(Number(out.progress.grooves || 0));

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

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

function safeSet(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch (_) {
    // ignore quota / private mode issues
  }
}

function tryMigrateLegacy() {
  // If new key already exists, no migration needed
  const existing = safeGet(STORAGE_KEY);
  if (existing) return null;

  for (const k of LEGACY_KEYS) {
    const raw = safeGet(k);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      // Write into new key
      safeSet(STORAGE_KEY, JSON.stringify(parsed));
      return parsed;
    } catch (_) {
      // ignore corrupt legacy
    }
  }

  return null;
}

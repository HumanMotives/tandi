// src/storage.js
const KEY = "drummergirl_state_v2";

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function setPlayerName(state, name) {
  state.player.name = String(name || "").trim();
  saveState(state);
}

export function setCurrentWorld(state, worldId) {
  state.nav.currentWorld = worldId;
  saveState(state);
}

export function setCurrentLevel(state, levelId) {
  state.nav.currentLevel = levelId;
  saveState(state);
}

export function getStars(state, levelId) {
  return Number(state.progress.stars[levelId] || 0);
}

export function setStars(state, levelId, stars0to5) {
  const s = clampInt(stars0to5, 0, 5);
  state.progress.stars[levelId] = s;
  saveState(state);
}

export function getTotalStars(state) {
  return Object.values(state.progress.stars).reduce((a, b) => a + (Number(b) || 0), 0);
}

export function isLevelUnlocked(state, worldLevels, levelId) {
  // Simple linear unlock per world:
  // first level always unlocked
  // next unlocked if previous has >= 1 star
  const idx = worldLevels.findIndex((l) => l.id === levelId);
  if (idx <= 0) return true;
  const prevId = worldLevels[idx - 1].id;
  return getStars(state, prevId) >= 1;
}

export function addTicks(state, amount) {
  state.currency.ticks = clampInt(state.currency.ticks + Number(amount || 0), 0, 999999999);
  saveState(state);
}

export function addGrooves(state, amount) {
  state.stats.grooves = clampInt(state.stats.grooves + Number(amount || 0), 0, 999999999);
  saveState(state);
}

function defaultState() {
  return {
    player: { name: "" },
    avatar: { teacherId: "drumteacher_01" },
    currency: { ticks: 13255 },
    stats: { grooves: 35 },
    progress: { stars: { "w1-l1": 4 } },
    nav: { currentWorld: "world1", currentLevel: "w1-l1" },
    settings: { muted: false }
  };
}

function normalizeState(s) {
  const state = (s && typeof s === "object") ? s : defaultState();

  if (!state.player) state.player = { name: "" };
  if (!state.avatar) state.avatar = { teacherId: "drumteacher_01" };
  if (!state.currency) state.currency = { ticks: 0 };
  if (!state.stats) state.stats = { grooves: 0 };
  if (!state.progress) state.progress = { stars: {} };
  if (!state.progress.stars) state.progress.stars = {};
  if (!state.nav) state.nav = { currentWorld: "world1", currentLevel: "w1-l1" };
  if (!state.settings) state.settings = { muted: false };

  if (typeof state.player.name !== "string") state.player.name = "";
  if (typeof state.avatar.teacherId !== "string") state.avatar.teacherId = "drumteacher_01";

  state.currency.ticks = clampInt(state.currency.ticks ?? 0, 0, 999999999);
  state.stats.grooves = clampInt(state.stats.grooves ?? 0, 0, 999999999);

  if (typeof state.nav.currentWorld !== "string") state.nav.currentWorld = "world1";
  if (typeof state.nav.currentLevel !== "string") state.nav.currentLevel = "w1-l1";
  if (typeof state.settings.muted !== "boolean") state.settings.muted = false;

  return state;
}

function clampInt(n, min, max) {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

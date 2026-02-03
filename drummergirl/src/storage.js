const KEY = "drummergirl_v1";

const DEFAULT_STATE = {
  player: {
    name: ""
  },
  progress: {
    unlocked: { "w1-1": true },
    stars: {}
  }
};

function safeParse(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

export function loadState() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return structuredClone(DEFAULT_STATE);

  const parsed = safeParse(raw);
  if (!parsed) return structuredClone(DEFAULT_STATE);

  // Merge minimal to avoid missing fields
  return {
    ...structuredClone(DEFAULT_STATE),
    ...parsed,
    player: { ...structuredClone(DEFAULT_STATE.player), ...(parsed.player || {}) },
    progress: { ...structuredClone(DEFAULT_STATE.progress), ...(parsed.progress || {}) }
  };
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function getPlayer(state) {
  return state.player || { name: "" };
}

export function setPlayerName(state, name) {
  state.player = state.player || {};
  state.player.name = String(name || "").trim();
  saveState(state);
}

export function getProgress(state) {
  return state.progress || { unlocked: {}, stars: {} };
}

// ui/map.js
import { getWorld } from "../data/levels.js";
//import { isLevelUnlocked, getStars, setCurrentLevel, saveState, getTotalStars } from "../src/storage.js";

export function mountMap({ container, state, onEditName, onOpenLevel } = {}) {
  const root = document.createElement("div");
  root.className = "screen mapScreen";

  const currentWorldId = state.nav?.currentWorld || "world1";
  const world = getWorld(currentWorldId);

  const playerName = ((state.player?.name || "Lotty Girl").trim() || "Lotty Girl");
  const avatarFile = (state.player?.avatarFile || "ds_avatar_rockbunny.png").trim();
  const avatarSrc = `./assets/img/avatars/${avatarFile}`;

  const totalStars = getTotalStars(state);

  root.innerHTML = `
    <div class="worldLayout">
      <aside class="sidePanel">
      <div class="sideLogoWrap">
  <img class="sideLogoImg" src="./assets/img/logo.png" alt="Drum School" onerror="this.style.display='none'">
</div>


        <div class="sideAvatarCard">
          <img class="sideAvatarImg" src="${escapeAttr(avatarSrc)}" alt="" onerror="this.style.display='none'">
        </div>

        <div class="sideNameRow">
          <div class="sideName">${escapeHtml(playerName)}</div>
          <button class="sideNameEdit" type="button" title="Naam wijzigen">✏️</button>
        </div>

        <div class="sideStats">
          <div class="statRow"><span class="statIcon">⭐</span><span class="statLabel">Stars</span><span class="statValue">${totalStars}</span></div>
          <div class="statRow"><span class="statIcon">✨</span><span class="statLabel">Ticks</span><span class="statValue">${formatNumber(state.currency.ticks)}</span></div>
          <div class="statRow"><span class="statIcon">🥁</span><span class="statLabel">Grooves</span><span class="statValue">${formatNumber(state.stats.grooves)}</span></div>
        </div>

        <div class="sideBottomIcons">
          <button class="iconBtn" id="backWorldsBtn" title="Werelden">🗺️</button>
          <button class="iconBtn" title="Settings">⚙️</button>
          <button class="iconBtn" title="Volume">🔊</button>
          <button class="iconBtn" title="Help">ℹ️</button>
        </div>
      </aside>

      <main class="mapMain">
        <div class="mapHeader">
          <div class="mapHeaderTop">
            <div class="mapWorldSmall">${escapeHtml(worldLabel(currentWorldId))}</div>
            <button class="btn ghost" id="worldsBtn">Back to Worlds</button>
          </div>
          <div class="mapWorldTitle">${escapeHtml(world?.worldTitle || "Wereld")}</div>
        </div>

        <div class="levelGrid" id="levelGrid"></div>
      </main>
    </div>
  `;

  // buttons
  root.querySelector(".sideNameEdit").addEventListener("click", () => {
    if (typeof onEditName === "function") onEditName();
  });

  root.querySelector("#backWorldsBtn").addEventListener("click", () => {
    window.location.hash = "#worlds";
  });

  root.querySelector("#worldsBtn").addEventListener("click", () => {
    window.location.hash = "#worlds";
  });

  const levelGrid = root.querySelector("#levelGrid");

  if (!world) {
    const msg = document.createElement("div");
    msg.className = "levelEmpty";
    msg.textContent = "World data not found.";
    levelGrid.appendChild(msg);
    container.appendChild(root);
    return { unmount: () => root.remove() };
  }

  const levels = world.levels || [];

  levels.forEach((lvl) => {
    const unlocked = isLevelUnlocked(state, levels, lvl.id);
    const stars = getStars(state, lvl.id);

    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = `levelTile ${unlocked ? "unlocked" : "locked"}`;
    if (!unlocked) tile.disabled = true;

    tile.innerHTML = `
      <div class="levelTileInner">
        <div class="levelTileTop">
          <div class="levelLabel">${escapeHtml(lvl.label || "Les")}</div>
          <div class="levelLock">${unlocked ? "" : "🔒"}</div>
        </div>

        <div class="levelTitle">${escapeHtml(lvl.title || "")}</div>

        <div class="levelStars">
          ${renderStars(stars)}
        </div>
      </div>
    `;

    tile.addEventListener("click", () => {
      if (!unlocked) return;
      setCurrentLevel(state, lvl.id);
      saveState(state);
      if (typeof onOpenLevel === "function") onOpenLevel(lvl.id);
    });

    levelGrid.appendChild(tile);
  });

  container.appendChild(root);

  function unmount() {
    root.remove();
  }

  return { unmount };
}

function renderStars(stars) {
  const s = Math.max(0, Math.min(5, Number(stars || 0)));
  let out = "";
  for (let i = 1; i <= 5; i++) {
    out += `<span class="star ${i <= s ? "on" : "off"}">★</span>`;
  }
  return out;
}

function worldLabel(worldId) {
  const m = String(worldId || "").match(/world(\d+)/i);
  if (m) return `Wereld ${m[1]}`;
  return "Wereld";
}

function formatNumber(n) {
  try { return Number(n).toLocaleString("nl-NL"); } catch { return String(n); }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str);
}

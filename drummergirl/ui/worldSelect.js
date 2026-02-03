// ui/worldSelect.js
import { WORLDS } from "../data/worlds.js";
import { getTotalStars, setCurrentWorld, saveState } from "../src/storage.js";

export function mountWorldSelect({ container, state, onGoWorld } = {}) {
  const root = document.createElement("div");
  root.className = "screen worldSelect";

  const totalStars = getTotalStars(state);
  const playerName = ((state.player?.name || "Lotty Girl").trim() || "Lotty Girl");
  const avatarFile = (state.player?.avatarFile || "ds_avatar_rockbunny.png").trim();
  const avatarSrc = `./assets/img/avatars/${avatarFile}`;

  root.innerHTML = `
    <div class="worldLayout">
      <aside class="sidePanel">
      <div class="sideLogoWrap">
  <img class="sideLogoImg" src="./assets/img/logo.png" alt="Drum School" onerror="this.style.display='none'">
</div>

        <div class="sideName">${escapeHtml(playerName)}</div>

        <div class="sideStats">
          <div class="statRow"><span class="statIcon">⭐</span><span class="statLabel">Stars</span><span class="statValue">${totalStars}</span></div>
          <div class="statRow"><span class="statIcon">✨</span><span class="statLabel">Ticks</span><span class="statValue">${formatNumber(state.currency.ticks)}</span></div>
          <div class="statRow"><span class="statIcon">🥁</span><span class="statLabel">Grooves</span><span class="statValue">${formatNumber(state.stats.grooves)}</span></div>
        </div>

        <div class="sideBottomIcons">
          <button class="iconBtn" title="Settings">⚙️</button>
          <button class="iconBtn" title="Volume">🔊</button>
          <button class="iconBtn" title="Help">ℹ️</button>
        </div>
      </aside>

      <main class="worldMain">
        <div class="worldHeader">
          <div class="worldHeaderSmall">Kies een wereld</div>
          <div class="worldHeaderBig">Waar gaan we vandaag heen?</div>
        </div>

        <div class="worldGrid" id="worldGrid"></div>
      </main>
    </div>
  `;

  const grid = root.querySelector("#worldGrid");

  WORLDS.forEach((w, i) => {
    const unlocked = totalStars >= (w.requiredStarsToUnlock || 0);

    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = `worldTile ${unlocked ? "unlocked" : "locked"}`;

    tile.innerHTML = `
      <div class="worldTileImg">
        <img src="${escapeAttr(w.thumb)}" alt="" onerror="this.style.display='none'">
        <div class="worldTileFallback">${i + 1}</div>
        ${unlocked ? "" : `<div class="worldTileLock">🔒</div>`}
      </div>

      <div class="worldTileText">
        <div class="worldTileSmall">${escapeHtml(w.titleSmall)}</div>
        <div class="worldTileBig">${escapeHtml(w.titleBig)}</div>
        <div class="worldTileReq">${unlocked ? "Unlocked" : `Need ${w.requiredStarsToUnlock} stars`}</div>
      </div>
    `;

    if (!unlocked) tile.disabled = true;

    tile.addEventListener("click", () => {
      if (!unlocked) return;
      setCurrentWorld(state, w.id);
      saveState(state);
      if (typeof onGoWorld === "function") onGoWorld(w.id);
    });

    grid.appendChild(tile);
  });

  container.appendChild(root);

  function unmount() {
    root.remove();
  }

  return { unmount };
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

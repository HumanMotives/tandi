// ui/worldSelect.js
import { WORLDS } from "../data/worlds.js";
import { getTotalStars, setCurrentWorld, saveState } from "../src/storage.js";

export function mountWorldSelect({ container, state, onGoWorld } = {}) {
  const root = document.createElement("div");
  root.className = "screen worldSelect dots";

  const totalStars = getTotalStars(state);

  root.innerHTML = `
    <div class="worldLayout">
      <aside class="sidePanel">
        <div class="sideLogo">DRUM<br/>SCHOOL</div>

        <div class="sideAvatarCard">
          <img class="sideHeroImg" src="./assets/img/sidebar_hero.png" alt="" onerror="this.style.display='none'">
        </div>

        <div class="sideName">${escapeHtml((state.player.name || "Lotty Girl").trim() || "Lotty Girl")}</div>

        <div class="sideStats">
          <div class="statRow"><span class="statIcon">⭐</span><span class="statLabel">Stars</span><span class="statValue">${totalStars}</span></div>
          <div class="statRow"><span class="statIcon">⭐</span><span class="statLabel">Ticks</span><span class="statValue">${formatNumber(state.currency.ticks)}</span></div>
          <div class="statRow"><span class="statIcon">🥁</span><span class="statLabel">Grooves</span><span class="statValue">${formatNumber(state.stats.grooves)}</span></div>
        </div>

        <div class="sideBottomIcons">
          <button class="iconBtn" title="Settings">⚙️</button>
          <button class="iconBtn" title="Volume">🔊</button>
          <button class="iconBtn" title="Help">ℹ️</button>
        </div>
      </aside>

      <main class="worldMain">
        <div class="worldRing" id="worldRing"></div>
      </main>
    </div>
  `;

  const ring = root.querySelector("#worldRing");

  // simple circular placement (CSS handles dotted ring)
  WORLDS.forEach((w, i) => {
    const unlocked = totalStars >= (w.requiredStarsToUnlock || 0);
    const btn = document.createElement("button");
    btn.className = `worldNode ${unlocked ? "unlocked" : "locked"}`;
    btn.type = "button";
    btn.innerHTML = `
      <div class="worldNodeImgWrap">
        <img src="${escapeAttr(w.thumb)}" alt="" onerror="this.style.display='none'">
        <div class="worldNodeFallback">${i + 1}</div>
      </div>
      <div class="worldNodeText">
        <div class="worldNodeSmall">${escapeHtml(w.titleSmall)}</div>
        <div class="worldNodeBig">${escapeHtml(w.titleBig)}</div>
      </div>
    `;

    if (!unlocked) {
      btn.disabled = true;
    } else {
      btn.addEventListener("click", () => {
        setCurrentWorld(state, w.id);
        saveState(state);
        if (typeof onGoWorld === "function") onGoWorld(w.id);
      });
    }

    ring.appendChild(btn);
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

// ui/levels.js
import { mountSidebar } from "./sidebar.js";

export function mountLevels({
  container,
  state,
  worldId,
  onBackToWorlds = () => {},
  onOpenLevel = () => {}
}) {
  const layout = document.createElement("div");
  layout.className = "layout";

  const sidebarHost = document.createElement("div");
  const mainHost = document.createElement("main");

  layout.appendChild(sidebarHost);
  layout.appendChild(mainHost);
  container.appendChild(layout);

  const sidebar = mountSidebar({
    container: sidebarHost,
    state
  });

  const worldTitle = getWorldTitle(worldId);
  const worldPrefix = getWorldPrefix(worldId); // "W1", "W2", etc.

  // For now we show 4 levels per world (matches your UI).
  // Later we can read this from data/worlds.js world.levels.
  const levels = [
    { lessonId: `${worldPrefix}-L1`, title: "Level 1" },
    { lessonId: `${worldPrefix}-L2`, title: "Level 2" },
    { lessonId: `${worldPrefix}-L3`, title: "Level 3" },
    { lessonId: `${worldPrefix}-L4`, title: "Level 4" }
  ];

  mainHost.innerHTML = `
    <div class="dsWorldSelect">
      <div class="dsWorldHeader">
        <div class="dsWorldH1">${escapeHtml(worldTitle)}</div>
        <div class="dsWorldH2">Kies een level</div>
      </div>

      <button class="btn ghost" data-back>
        ← Terug naar Werelden
      </button>

      <div class="dsWorldGrid">
        ${levels.map(l => renderLevelTile(l.lessonId, l.title)).join("")}
      </div>
    </div>
  `;

  mainHost.querySelector("[data-back]").addEventListener("click", () => {
    onBackToWorlds();
  });

  mainHost.querySelectorAll("[data-level]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lessonId = btn.getAttribute("data-level"); // now "W1-L1"
      onOpenLevel(lessonId);
    });
  });

  function unmount() {
    sidebar.unmount();
    layout.remove();
  }

  return { unmount };
}

/* helpers */

function getWorldTitle(worldId) {
  // match your /data/worlds.js ids
  if (worldId === "world1") return "Wereld 1";
  if (worldId === "world2") return "Wereld 2";
  if (worldId === "world3") return "Wereld 3";
  if (worldId === "world4") return "Wereld 4";
  if (worldId === "world5") return "Wereld 5";
  return "Wereld";
}

function getWorldPrefix(worldId) {
  // "world1" -> "W1"
  const n = Number(String(worldId).replace("world", ""));
  if (Number.isFinite(n) && n > 0) return `W${n}`;
  return "W1";
}

function renderLevelTile(lessonId, title) {
  return `
    <button
      type="button"
      class="dsWorldTile"
      data-level="${escapeHtml(lessonId)}"
    >
      <div class="dsWorldTileTop">
        <div class="dsWorldNum">${escapeHtml(title)}</div>
      </div>
      <div class="dsWorldSub">${escapeHtml(lessonId)}</div>
    </button>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

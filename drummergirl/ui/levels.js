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

  mainHost.innerHTML = `
    <div class="dsWorldSelect">
      <div class="dsWorldHeader">
        <div class="dsWorldH1">${worldTitle}</div>
        <div class="dsWorldH2">Kies een level</div>
      </div>

      <button class="btn ghost" data-back>
        ← Terug naar Werelden
      </button>

      <div class="dsWorldGrid">
        ${renderLevelTile("l1", "Level 1")}
        ${renderLevelTile("l2", "Level 2")}
        ${renderLevelTile("l3", "Level 3")}
        ${renderLevelTile("l4", "Level 4")}
      </div>
    </div>
  `;

  mainHost.querySelector("[data-back]").addEventListener("click", () => {
    onBackToWorlds();
  });

  mainHost.querySelectorAll("[data-level]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const levelId = btn.getAttribute("data-level");
      onOpenLevel(levelId);
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
  if (worldId === "w1") return "Wereld 1";
  if (worldId === "w2") return "Wereld 2";
  if (worldId === "w3") return "Wereld 3";
  if (worldId === "w4") return "Wereld 4";
  return "Wereld";
}

function renderLevelTile(id, title) {
  return `
    <button
      type="button"
      class="dsWorldTile"
      data-level="${id}"
    >
      <div class="dsWorldTileTop">
        <div class="dsWorldNum">${title}</div>
      </div>
    </button>
  `;
}

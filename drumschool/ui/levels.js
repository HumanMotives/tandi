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
        <div class="dsWorldH1">${escapeHtml(worldTitle)}</div>
        <div class="dsWorldH2">Kies een level</div>
      </div>

      <button class="btn ghost" data-back>
        ← Terug naar Werelden
      </button>

      <div class="dsWorldGrid">
        ${renderLevelTile("L1", "Level 1")}
        ${renderLevelTile("L2", "Level 2")}
        ${renderLevelTile("L3", "Level 3")}
        ${renderLevelTile("L4", "Level 4")}
      </div>
    </div>
  `;

  mainHost.querySelector("[data-back]")?.addEventListener("click", onBackToWorlds);

  mainHost.querySelectorAll("[data-level]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const levelCode = btn.getAttribute("data-level"); // "L1"
      const worldCode = normalizeWorldCode(worldId);    // "W1"
      const lessonKey = `${worldCode}-${levelCode}`;    // "W1-L1"
      onOpenLevel(lessonKey);
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
  const w = normalizeWorldCode(worldId);
  if (w === "W1") return "Wereld 1";
  if (w === "W2") return "Wereld 2";
  if (w === "W3") return "Wereld 3";
  if (w === "W4") return "Wereld 4";
  if (w === "W5") return "Wereld 5";
  return "Wereld";
}

function normalizeWorldCode(worldId) {
  const s = String(worldId || "").trim();
  if (/^W\d+$/i.test(s)) return s.toUpperCase();
  const m = s.match(/(\d+)/);
  if (m) return `W${m[1]}`;
  return "W1";
}

function renderLevelTile(levelCode, title) {
  return `
    <button type="button" class="dsWorldTile" data-level="${levelCode}">
      <div class="dsWorldTileTop">
        <div class="dsWorldNum">${escapeHtml(title)}</div>
      </div>
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

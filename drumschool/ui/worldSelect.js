// ui/worldSelect.js
import { mountShell } from "./shell.js";
import { openBackpack } from "./backpack.js";
import { WORLDS } from "../data/worlds.js";

/**
 * World Select screen
 * - Uses shared Shell + Sidebar (single source of truth)
 * - Click player avatar => Backpack overlay
 * - Shows worlds as a clean grid (locked/unlocked)
 */
export function mountWorldSelect({
  container,
  state,
  onGoWorld = () => {},
  onEditName = () => {}
}) {
  const shell = mountShell({
    container,
    state,
    onEditName,
    onOpenBackpack: () => {
      openBackpack({
        state,
        onClose: () => shell.updateSidebar()
      });
    },
    onOpenSettings: () => {},
    onToggleAudio: () => {},
    onOpenInfo: () => {}
  });

  const main = document.createElement("div");
  main.className = "dsWorldSelect";

  const header = document.createElement("div");
  header.className = "dsWorldHeader";
  header.innerHTML = `
    <div class="dsWorldHeaderInner">
      <div class="dsWorldH1">Kies een wereld</div>
      <div class="dsWorldH2">Waar gaan we vandaag heen?</div>
    </div>
  `;

  const grid = document.createElement("div");
  grid.className = "dsWorldGrid";

  const worlds = WORLDS;
  const stars = Number(state?.progress?.stars || 0);

  grid.innerHTML = worlds
    .map((w) => renderWorldTile(w, stars))
    .join("");

  grid.querySelectorAll("[data-world]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const worldId = btn.getAttribute("data-world");
      const locked = btn.getAttribute("data-locked") === "1";
      if (locked) return;
      onGoWorld(worldId);
    });
  });

  main.appendChild(header);
  main.appendChild(grid);

  shell.setMain(main);

  function unmount() {
    shell.unmount();
  }

  return { unmount };
}

function renderWorldTile(world, stars) {
  const locked = stars < Number(world.requiredStarsToUnlock || 0);
  const subtitle = locked
    ? `Need ${Number(world.requiredStarsToUnlock || 0)} stars`
    : "Unlocked";

  // Keep text simple for now. You can swap in PNG graphics later.
  return `
    <button
      class="dsWorldTile ${locked ? "locked" : ""}"
      type="button"
      data-world="${escapeAttr(world.id)}"
      data-locked="${locked ? "1" : "0"}"
      aria-disabled="${locked ? "true" : "false"}"
      title="${escapeAttr(`${world.titleSmall} ${world.titleBig}`)}"
    >
      <div class="dsWorldTileTop">
        <div class="dsWorldNum">${escapeHtml(worldNumberFromId(world.id))}</div>
        <div class="dsWorldLock">${locked ? "🔒" : ""}</div>
      </div>
      <div class="dsWorldName">${escapeHtml(`${world.titleSmall}\n${world.titleBig}`)}</div>
      <div class="dsWorldSub">${escapeHtml(subtitle)}</div>
    </button>
  `;
}

function worldNumberFromId(worldId) {
  // "w1" -> "1"
  const n = Number(String(worldId || "").replace("w", ""));
  return Number.isFinite(n) && n > 0 ? String(n) : "?";
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

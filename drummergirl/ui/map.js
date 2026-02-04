// ui/map.js
import { mountSidebar } from "./sidebar.js";

/**
 * World Map (MVP)
 * - No progress logic
 * - No stars, ticks, unlocks
 * - Just worlds + navigation
 */
export function mountMap({
  container,
  state,
  onOpenLevel = () => {},
  onEditName = () => {}
}) {
  // --- layout ---
  const layout = document.createElement("div");
  layout.className = "layout";

  const sidebarHost = document.createElement("div");
  const mainHost = document.createElement("main");

  layout.appendChild(sidebarHost);
  layout.appendChild(mainHost);
  container.appendChild(layout);

  // --- sidebar ---
  const sidebar = mountSidebar({
    container: sidebarHost,
    state
  });

  // --- main content ---
  mainHost.innerHTML = `
    <div class="dsWorldSelect">
      <div class="dsWorldHeader">
        <div class="dsWorldH1">Werelden</div>
        <div class="dsWorldH2">Kies waar je wil oefenen</div>
      </div>

      <div class="dsWorldGrid">
        ${renderWorldTile("w1", "Wereld 1", "Eerste Beats")}
        ${renderWorldTile("w2", "Wereld 2", "Voel de Maat")}
        ${renderWorldTile("w3", "Wereld 3", "Grooves")}
        ${renderWorldTile("w4", "Wereld 4", "Showtime")}
      </div>
    </div>
  `;

  // --- interactions ---
  mainHost.querySelectorAll("[data-world]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const worldId = btn.getAttribute("data-world");
      onOpenLevel(worldId);
    });
  });

  function unmount() {
    sidebar.unmount();
    layout.remove();
  }

  return { unmount };
}

/* -------------------------
   helpers
------------------------- */

function renderWorldTile(id, title, subtitle) {
  return `
    <button
      type="button"
      class="dsWorldTile"
      data-world="${id}"
    >
      <div class="dsWorldTileTop">
        <div class="dsWorldNum">${title}</div>
      </div>
      <div class="dsWorldName">${subtitle}</div>
    </button>
  `;
}

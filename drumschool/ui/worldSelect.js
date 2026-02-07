// ui/worldSelect.js
import { mountShell } from "./shell.js";
import { openBackpack } from "./backpack.js";
import { WORLDS } from "../data/worlds.js";

/**
 * World Select screen (DRUM SCHOOL)
 * - Keeps existing Shell + Sidebar flow
 * - Renders worlds as circle images with overlay play/lock icon that sits ON TOP of the circle edge
 * - Locked worlds are truly not clickable (disabled + no listeners)
 * - World title + description are loaded from W?-L1.json (worldTitle/worldDescription)
 * - Hosted under /drumschool, so all asset/json fetch paths include BASE_PREFIX
 */
const BASE_PREFIX = "/drumschool";

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

  grid.innerHTML = worlds.map((w) => renderWorldTile(w, stars)).join("");

  // Only attach interaction to unlocked tiles
  grid.querySelectorAll("[data-world]").forEach((btn) => {
    const locked = btn.getAttribute("data-locked") === "1";
    if (locked) return;

    btn.addEventListener("click", () => {
      const worldId = btn.getAttribute("data-world");
      onGoWorld(worldId);
    });

    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const worldId = btn.getAttribute("data-world");
        onGoWorld(worldId);
      }
    });
  });

  main.appendChild(header);
  main.appendChild(grid);
  shell.setMain(main);

  // Hydrate titles/descriptions from JSON (non-blocking)
  hydrateWorldTextFromJson(worlds, grid);

  function unmount() {
    shell.unmount();
  }

  return { unmount };
}

function renderWorldTile(world, stars) {
  const locked = stars < Number(world.requiredStarsToUnlock || 0);
  const worldNum = worldNumberFromId(world.id); // "1".."6"
  const bg = worldBackgroundByNumber(worldNum);

  const icon = locked
    ? `${BASE_PREFIX}/assets/img/icons/ds_icon_lock.png`
    : `${BASE_PREFIX}/assets/img/icons/ds_icon_play.png`;

  const fallbackTitle =
    world.titleSmall && world.titleBig
      ? `${world.titleSmall} ${world.titleBig}`.trim()
      : `Wereld ${worldNum}`;

  const titleAttr = escapeAttr(fallbackTitle);

  // Key idea for "icon above circle":
  // - Circle itself keeps overflow:hidden (so image is clipped)
  // - Icon is NOT inside the overflow:hidden element.
  //   It's a sibling placed in a wrapper with position:relative.
  return `
    <button
      class="dsWorldTile ${locked ? "locked" : ""}"
      type="button"
      data-world="${escapeAttr(world.id)}"
      data-locked="${locked ? "1" : "0"}"
      ${locked ? "disabled" : ""}
      aria-disabled="${locked ? "true" : "false"}"
      title="${titleAttr}"
    >
      <div class="dsWorldCircleWrap">
        <div class="dsWorldCircle">
          <img
            class="dsWorldCircleImg"
            src="${escapeAttr(bg)}"
            alt=""
            draggable="false"
          />
        </div>

        <img
          class="dsWorldOverlayIcon ${locked ? "lock" : "play"}"
          src="${escapeAttr(icon)}"
          alt=""
          draggable="false"
        />
      </div>

      <div class="dsWorldMeta">
        <div class="dsWorldTitleLine" data-world-title="${escapeAttr(world.id)}">
          ${escapeHtml(fallbackTitle)}
        </div>
        <div class="dsWorldDesc" data-world-desc="${escapeAttr(world.id)}"></div>
      </div>
    </button>
  `;
}

/**
 * Loads W?-L1.json and fills the title/desc blocks if worldTitle/worldDescription exist.
 * Tries common folders to match your project history.
 */
async function hydrateWorldTextFromJson(worlds, gridEl) {
  for (const world of worlds) {
    const n = worldNumberFromId(world.id);
    if (n === "?") continue;

    const wKey = `W${n}`;
    const candidates = [
      `${BASE_PREFIX}/lesson/${wKey}-L1.json`,
      `${BASE_PREFIX}/lessons/${wKey}-L1.json`,
      `${BASE_PREFIX}/levels/${wKey}-L1.json`
    ];

    const json = await fetchFirstJson(candidates);
    if (!json) continue;

    const title = safeText(json.worldTitle);
    const desc = safeText(json.worldDescription);

    if (title) {
      const titleEl = gridEl.querySelector(
        `[data-world-title="${cssAttr(world.id)}"]`
      );
      if (titleEl) titleEl.textContent = title;
    }

    if (desc) {
      const descEl = gridEl.querySelector(
        `[data-world-desc="${cssAttr(world.id)}"]`
      );
      if (descEl) {
        descEl.innerHTML = desc
          .split("\n")
          .map((line) => `<div>${escapeHtml(line)}</div>`)
          .join("");
      }
    }
  }
}

async function fetchFirstJson(paths) {
  for (const p of paths) {
    try {
      const res = await fetch(p, { cache: "no-store" });
      if (!res.ok) continue;
      return await res.json();
    } catch {
      // try next
    }
  }
  return null;
}

function worldBackgroundByNumber(n) {
  const base = `${BASE_PREFIX}/assets/img/backgrounds`;
  switch (String(n)) {
    case "1":
      return `${base}/ds_background_junglerock.png`;
    case "2":
      return `${base}/ds_achtergrond_seajam.png`;
    case "3":
      return `${base}/ds_achtergrond_desertjam.png`;
    case "4":
      return `${base}/ds_achtergrond_ritmefabriek.png`;
    case "5":
      return `${base}/ds_background_highschoolrock.png`;
    case "6":
      return `${base}/ds_achtergrond_galaxyrock.png`;
    default:
      return `${base}/ds_background_junglerock.png`;
  }
}

function worldNumberFromId(worldId) {
  // "W1" / "w1" -> "1"
  const m = String(worldId || "").match(/\d+/);
  return m ? m[0] : "?";
}


function safeText(v) {
  return typeof v === "string" ? v : "";
}

function cssAttr(str) {
  // world ids are simple (w1..w6). keep it safe anyway.
  return String(str ?? "").replaceAll('"', '\\"');
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


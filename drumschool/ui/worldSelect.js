// ui/worldSelect.js
import { mountShell } from "./shell.js";
import { openBackpack } from "./backpack.js";
import { WORLDS } from "../data/worlds.js";
import { loadLesson } from "../levels/loadLesson.js";

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
  header.className = "dsWorldsHeader";
  header.innerHTML = `
    <div class="dsWorldsHeaderInner">
      <div class="dsWorldsTitle">DRUM WERELDEN</div>
    </div>
  `;

  const grid = document.createElement("div");
  grid.className = "dsWorldsGrid";

  const worlds = WORLDS;
  const stars = Number(state?.progress?.stars || 0);

  // Build tiles as DOM so we can update title/description from lesson JSON.
  const tiles = worlds.map((w) => {
    const tile = renderWorldTile(w, stars);
    tile.addEventListener("click", () => {
      const locked = tile.getAttribute("data-locked") === "1";
      if (locked) return;
      onGoWorld(w.id);
    });
    return tile;
  });

  tiles.forEach((t) => grid.appendChild(t));

  // Load world title + description from the world’s first lesson file: W?-L1.json
  // If a lesson file is missing, we keep the fallback text.
  (async () => {
    await Promise.all(
      worlds.map(async (w) => {
        try {
          const lessonKey = `${String(w.id)}-L1`;
          const lesson = await loadLesson(lessonKey);

          const title = String(
            lesson?.worldTitle ||
              lesson?.wereldTitel ||
              lesson?.title ||
              ""
          ).trim();

          const desc = String(
            lesson?.worldDescription ||
              lesson?.wereldOmschrijving ||
              lesson?.description ||
              ""
          ).trim();

          const tile = grid.querySelector(`[data-world="${escapeAttr(w.id)}"]`);
          if (!tile) return;

          const nameEl = tile.querySelector("[data-world-name]");
          const descEl = tile.querySelector("[data-world-desc]");

          if (nameEl && title) nameEl.textContent = title;
          if (descEl && desc) {
            descEl.innerHTML = "";
            desc.split("\n").forEach((line) => {
              const div = document.createElement("div");
              div.textContent = line;
              descEl.appendChild(div);
            });
          }
        } catch {
          // keep fallback
        }
      })
    );
  })();

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

  const imgSrc = worldBackgroundFromId(world.id);
  const playSrc = "./assets/img/icons/ds_icon_play.png";
  const lockSrc = "./assets/img/icons/ds_icon_lock.png";

  const card = document.createElement("div");
  card.className = "dsWorldsCard";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "dsWorldsCircleBtn";
  btn.setAttribute("data-world", world.id);
  btn.setAttribute("data-locked", locked ? "1" : "0");
  btn.setAttribute("aria-disabled", locked ? "true" : "false");
  btn.disabled = false; // we still handle click to prevent navigation

  const circle = document.createElement("div");
  circle.className = `dsWorldsCircle ${locked ? "locked" : ""}`;

  const img = document.createElement("img");
  img.className = "dsWorldsCircleImg";
  img.src = imgSrc;
  img.alt = "";
  img.draggable = false;

  const icon = document.createElement("img");
  icon.className = `dsWorldsIcon ${locked ? "dsWorldsIconLock" : "dsWorldsIconPlay"}`;
  icon.src = locked ? lockSrc : playSrc;
  icon.alt = locked ? "Locked" : "Play";
  icon.draggable = false;

  circle.appendChild(img);
  circle.appendChild(icon);
  btn.appendChild(circle);

  const text = document.createElement("div");
  text.className = "dsWorldsText";

  const name = document.createElement("div");
  name.className = "dsWorldsName";
  name.setAttribute("data-world-name", "1");
  name.textContent = fallbackWorldTitle(world.id);

  const desc = document.createElement("div");
  desc.className = "dsWorldsDesc";
  desc.setAttribute("data-world-desc", "1");
  // fallback empty; gets filled from lesson JSON when available

  text.appendChild(name);
  text.appendChild(desc);

  card.appendChild(btn);
  card.appendChild(text);

  return card;
}

function worldBackgroundFromId(worldId) {
  const id = String(worldId || "").toUpperCase();
  if (id === "W1") return "./assets/img/backgrounds/ds_background_junglerock.png";
  if (id === "W2") return "./assets/img/backgrounds/ds_achtergrond_seajam.png";
  if (id === "W3") return "./assets/img/backgrounds/ds_achtergrond_desertjam.png";
  if (id === "W4") return "./assets/img/backgrounds/ds_achtergrond_ritmefabriek.png";
  if (id === "W5") return "./assets/img/backgrounds/ds_background_highschoolrock.png";
  if (id === "W6") return "./assets/img/backgrounds/ds_achtergrond_galaxyrock.png";
  return "./assets/img/backgrounds/ds_background_junglerock.png";
}

function fallbackWorldTitle(worldId) {
  const n = worldNumberFromId(worldId);
  // Fallback only (overwritten by lesson JSON when present)
  if (n === "1") return "Wereld 1 - Jungle";
  if (n === "2") return "Wereld 2 - Oceaan";
  if (n === "3") return "Wereld 3 - Woestijn";
  if (n === "4") return "Wereld 4";
  if (n === "5") return "Wereld 5";
  if (n === "6") return "Wereld 6";
  return `Wereld ${n}`;
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

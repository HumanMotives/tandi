// ui/levels.js
import { mountSidebar } from "./sidebar.js";
import { isLevelUnlocked, getLevelStars } from "../src/storage.js";

const BASE_PREFIX = "/drumschool";

/**
 * Lessons (Levels) screen inside a World
 * Requirements implemented:
 * - Rectangular lesson tiles with rounded corners (distinct from World circles)
 * - Reuse play + lock icons, visually on top (z-index overlay)
 * - World title uses existing .dsWorldH1
 * - Dotted divider line
 * - Show total lessons + unlocked lessons (total prefers world JSON; falls back to 9)
 * - Lesson description pulled from each level JSON (best-effort fields)
 * - Locked lessons not clickable (disabled + no handler)
 *
 * NOTE: This file only changes the lessons screen; other screens untouched.
 */
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

  const worldCode = normalizeWorldCode(worldId);

  // Initial skeleton (fast render)
  mainHost.innerHTML = `
    <div class="dsLevelSelectScreen">
      <div class="dsLevelTopRow">
        <button class="dsBackBtn" type="button" data-back>Terug</button>
      </div>

      <div class="dsLevelHeaderRow">
        <div class="dsWorldH1" data-world-title>${escapeHtml(getWorldTitleFallback(worldCode))}</div>
        <div class="dsLessonCount">
          <div class="dsLessonCountLabel">Lessen</div>
          <div class="dsLessonCountValue" data-lesson-count>0/0</div>
        </div>
      </div>

      <div class="dsDottedDivider"></div>

      <div class="dsLessonGrid" data-grid></div>
    </div>
  `;

  mainHost.querySelector("[data-back]")?.addEventListener("click", onBackToWorlds);

  // Async hydrate: world title, total lessons, lesson tiles & descriptions
  hydrate();

  async function hydrate() {
    // 1) Prefer "world JSON" at /levels/W1.json (if you add it later)
    //    Fallback: derive 9 lessons (W?-L1..W?-L9)
    const worldJsonPath = `${BASE_PREFIX}/levels/${worldCode}.json`;
    const worldJson = await loadJson(worldJsonPath);

    // title: prefer worldTitle from world JSON, else from W?-L1.json, else fallback
    let worldTitle = "";
    if (worldJson && typeof worldJson.worldTitle === "string") {
      worldTitle = worldJson.worldTitle;
    } else {
      const w1 = await loadJson(`${BASE_PREFIX}/levels/${worldCode}-L1.json`);
      if (w1 && typeof w1.worldTitle === "string") worldTitle = w1.worldTitle;
    }
    if (!worldTitle) worldTitle = getWorldTitleFallback(worldCode);

    const titleEl = mainHost.querySelector("[data-world-title]");
    if (titleEl) titleEl.textContent = worldTitle;

    // total lessons + list
    let lessonIds = [];

    if (worldJson && Array.isArray(worldJson.lessons)) {
      // Expected shape (future):
      // { lessons: [{ id: "W1-L1" }, ...] }
      lessonIds = worldJson.lessons
        .map((l) => String(l?.id || "").trim())
        .filter(Boolean);
    } else if (worldJson && Array.isArray(worldJson.levels)) {
      // Alternate shape (if you use "levels")
      lessonIds = worldJson.levels
        .map((l) => String(l?.id || "").trim())
        .filter(Boolean);
    } else {
      // fallback: 9 lessons
      lessonIds = Array.from({ length: 9 }, (_, i) => `${worldCode}-L${i + 1}`);
    }

    // Build a "worldLevels" array for unlock logic
    const worldLevels = lessonIds.map((id) => ({ id }));

    // Determine unlocked count using existing unlock rules (previous level >= 1 star)
    const unlockedFlags = lessonIds.map((id) => isLevelUnlocked(state, worldLevels, id));
    const unlockedCount = unlockedFlags.filter(Boolean).length;

    const countEl = mainHost.querySelector("[data-lesson-count]");
    if (countEl) countEl.textContent = `${unlockedCount}/${lessonIds.length}`;

    // Build tiles with descriptions from each level JSON
    const gridEl = mainHost.querySelector("[data-grid]");
    if (!gridEl) return;

    const tiles = await Promise.all(
      lessonIds.map(async (lessonId, idx) => {
        const unlocked = unlockedFlags[idx];
        const json = await loadJson(`${BASE_PREFIX}/levels/${lessonId}.json`);
        const desc = extractLessonDescription(json);
        const lessonNumber = idx + 1;

        // stars kept for now (user said ok)
        const stars = getLevelStars(state, lessonId);

        return renderLessonTile({
          lessonId,
          lessonNumber,
          description: desc,
          unlocked,
          stars
        });
      })
    );

    gridEl.innerHTML = tiles.join("");

    // Click handling (only unlocked)
    gridEl.querySelectorAll("[data-lesson]").forEach((btn) => {
      const locked = btn.getAttribute("data-locked") === "1";
      if (locked) return;

      btn.addEventListener("click", () => {
        const lessonKey = btn.getAttribute("data-lesson"); // e.g. "W1-L1"
        onOpenLevel(lessonKey);
      });
    });
  }

  function unmount() {
    sidebar.unmount();
    layout.remove();
  }

  return { unmount };
}

/* -------------------------
   Tile rendering
------------------------- */

function renderLessonTile({ lessonId, lessonNumber, description, unlocked, stars }) {
  const locked = !unlocked;

  const iconSrc = locked
    ? `${BASE_PREFIX}/assets/img/icons/ds_icon_lock.png`
    : `${BASE_PREFIX}/assets/img/icons/ds_icon_play.png`;

  // Stars can stay for now (visual placeholder)
  const starsHtml = renderStars(stars);

  return `
    <button
      type="button"
      class="dsLessonTile ${locked ? "locked" : ""}"
      data-lesson="${escapeAttr(lessonId)}"
      data-locked="${locked ? "1" : "0"}"
      ${locked ? "disabled" : ""}
    >
      <div class="dsLessonTileInner">
        <div class="dsLessonTitle">Les ${escapeHtml(String(lessonNumber))}</div>
        <div class="dsLessonDesc">${escapeHtml(description || "")}</div>
        <div class="dsLessonStars">${starsHtml}</div>
      </div>

      <img class="dsLessonIcon ${locked ? "lock" : "play"}"
           src="${escapeAttr(iconSrc)}"
           alt=""
           draggable="false" />
    </button>
  `;
}

function renderStars(n) {
  const v = Math.max(0, Math.min(5, Number(n || 0)));
  // Keep as simple placeholders; your mock uses star icons, but you said can stay for now.
  // If you already have star SVGs/icons in CSS, you can replace this later without changing logic.
  let out = "";
  for (let i = 0; i < 5; i++) out += (i < v ? "★" : "☆");
  return out;
}

/* -------------------------
   Data loading helpers
------------------------- */

async function loadJson(path) {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function extractLessonDescription(json) {
  if (!json) return "";
  if (typeof json.lessonDescription === "string") return json.lessonDescription;
  if (typeof json.description === "string") return json.description;
  if (typeof json.subtitle === "string") return json.subtitle;
  if (typeof json.title === "string" && typeof json.worldDescription !== "string") {
    // Don't use title as description; keep it separate
  }
  // Fallback: first intro text if present
  const intro0 = json?.intro?.[0]?.text;
  if (typeof intro0 === "string") return intro0;
  return "";
}

/* -------------------------
   Existing helpers (kept)
------------------------- */

function getWorldTitleFallback(worldCode) {
  const n = worldCode.replace("W", "");
  return `Wereld ${n}`;
}

function normalizeWorldCode(worldId) {
  const s = String(worldId || "").trim();
  if (/^W\d+$/i.test(s)) return s.toUpperCase();
  const m = s.match(/(\d+)/);
  if (m) return `W${m[1]}`;
  return "W1";
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str);
}

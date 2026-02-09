// src/app.js
import { createRouter } from "./router.js";
import { loadState, saveState, setPlayerName } from "./storage.js";

import { mountSplash } from "../ui/splash.js";
import { mountWorldSelect } from "../ui/worldSelect.js";
import { mountLevels } from "../ui/levels.js";
import { mountChatIntro } from "../ui/chatIntro.js";
import { openNameModal } from "../ui/nameModal.js";

import { loadLesson } from "../levels/loadLesson.js";
import { mountLessonPractice } from "../ui/lesson/lessonPractice.js";

const appRoot = document.getElementById("appRoot");

let state = loadState();
saveState(state);

const router = createRouter();
let currentScreen = null;

async function boot() {
  const splash = mountSplash({
    logoSrc: "./assets/img/logo.png",
    durationMs: 2500
  });
  await splash.waitDone();
  splash.destroy();

  if (!window.location.hash) window.location.hash = "#worlds";

  router.onChange((route) => render(route));

  if (!(state.player?.name || "").trim()) {
    openNameModal({
      initialName: "",
      onSave: (name) => {
        state = setPlayerName(state, name);
        saveState(state);
        render(router.getRoute(), true);
      },
      onCancel: () => {}
    });
  }

  render(router.getRoute(), true);
}

function clearScreen() {
  try { currentScreen?.unmount?.(); } catch {}
  currentScreen = null;
  appRoot.innerHTML = "";
}

function render(route, force = false) {
  if (!force && currentScreen && currentScreen.route === route) return;

  clearScreen();

  const wrapper = document.createElement("div");
  wrapper.className = "app";
  appRoot.appendChild(wrapper);

  if (route === "worlds") {
    const screen = mountWorldSelect({
      container: wrapper,
      state,
      onGoWorld: (worldId) => {
        state.nav = state.nav || {};
        state.nav.worldId = worldId; // expects "W1", "W2", ...
        saveState(state);
        window.location.hash = "#levels";
      },
      onEditName: () => {
        openNameModal({
          initialName: (state.player?.name || ""),
          onSave: (name) => {
            state = setPlayerName(state, name);
            saveState(state);
            render("worlds", true);
          },
          onCancel: () => {}
        });
      }
    });

    screen.route = "worlds";
    currentScreen = screen;
    return;
  }

  if (route === "levels") {
    const worldId = state?.nav?.worldId || "W1";

    const screen = mountLevels({
      container: wrapper,
      state,
      worldId,
      onBackToWorlds: () => (window.location.hash = "#worlds"),
      onOpenLevel: (lessonKey) => {
        state.nav = state.nav || {};
        state.nav.worldId = worldId;
        state.nav.lessonKey = lessonKey; // "W1-L1"
        saveState(state);
        window.location.hash = "#intro";
      }
    });

    screen.route = "levels";
    currentScreen = screen;
    return;
  }

  if (route === "intro") {
    const lessonKey = state?.nav?.lessonKey || "W1-L1";

    const screen = mountLessonIntro({
      container: wrapper,
      lessonKey,
      onStartLesson: () => (window.location.hash = "#lesson"),
      onBackToLevels: () => (window.location.hash = "#levels")
    });

    screen.route = "intro";
    currentScreen = screen;
    return;
  }

  if (route === "lesson") {
    const lessonKey = state?.nav?.lessonKey || "W1-L1";

    const screen = mountLessonScreen({
      container: wrapper,
      lessonKey,
      onExit: () => (window.location.hash = "#levels")
    });

    screen.route = "lesson";
    currentScreen = screen;
    return;
  }

  window.location.hash = "#worlds";
}

/* ---- Screens that load lesson JSON ---- */

function mountLessonIntro({ container, lessonKey, onStartLesson, onBackToLevels }) {
  const root = document.createElement("div");
  container.appendChild(root);

  let inner = null;
  let alive = true;

  root.innerHTML = `<div class="frame" style="padding:14px;">Lesson laden…</div>`;

  (async () => {
    try {
      const lesson = await loadLesson(lessonKey);
      if (!alive) return;

      // Context above the intro image
      const title = String(lesson?.worldTitle || lesson?.meta?.worldName || lesson?.worldName || "").trim();
      const subtitle = String(lesson?.meta?.levelName || lesson?.title || "").trim() || String(lessonKey);

      // Support intro as array of strings OR array of {text}
      const introLines = Array.isArray(lesson.intro) ? lesson.intro : [];
      const script = introLines
        .map((x) => (typeof x === "string" ? { text: x } : x))
        .map((x) => ({ text: String(x?.text || "").trim() }))
        .filter((x) => x.text);

      inner = mountChatIntro({
        container: root,
        title,
        subtitle,
        introImage: String(lesson?.introImage || "").trim(),
        script: script.length ? script : [{ text: "Geen intro tekst gevonden." }],
        autoAdvanceMs: 0,
        onDone: () => onStartLesson(),
        // Requirement: Overslaan should go directly into the lesson (not back to levels)
        onSkip: () => onStartLesson()
      });
    } catch (err) {
      if (!alive) return;
      root.innerHTML = `
        <div class="frame" style="padding:14px;">
          <div style="font-weight:900; margin-bottom:8px;">Kon lesson niet laden</div>
          <div style="opacity:0.85; margin-bottom:12px;">Level: ${escapeHtml(lessonKey)}</div>
          <div style="opacity:0.85; margin-bottom:14px;">${escapeHtml(err?.message || String(err))}</div>
          <button class="btn ghost" type="button" data-back>Terug naar levels</button>
        </div>
      `;
      root.querySelector("[data-back]")?.addEventListener("click", onBackToLevels);
    }
  })();

  function unmount() {
    alive = false;
    try { inner?.unmount?.(); } catch {}
    root.remove();
  }

  return { unmount };
}

function mountLessonScreen({ container, lessonKey, onExit }) {
  const root = document.createElement("div");
  container.appendChild(root);

  let inner = null;
  let alive = true;

  root.innerHTML = `<div class="frame" style="padding:14px;">Lesson laden…</div>`;

  (async () => {
    try {
      const lesson = await loadLesson(lessonKey);
      if (!alive) return;

      // Use lesson title if present
      const worldName = String(lesson?.meta?.worldName || lesson?.worldName || "Wereld");
      const levelName = String(lesson?.meta?.levelName || lesson?.title || lessonKey);

      inner = mountLessonPractice({
        container: root,
        lesson,
        worldName,
        levelName,
        onExit
      });
    } catch (err) {
      if (!alive) return;
      root.innerHTML = `
        <div class="frame" style="padding:14px;">
          <div style="font-weight:900; margin-bottom:8px;">Kon lesson niet laden</div>
          <div style="opacity:0.85; margin-bottom:12px;">Level: ${escapeHtml(lessonKey)}</div>
          <div style="opacity:0.85; margin-bottom:14px;">${escapeHtml(err?.message || String(err))}</div>
          <button class="btn ghost" type="button" data-back>Terug naar levels</button>
        </div>
      `;
      root.querySelector("[data-back]")?.addEventListener("click", onExit);
    }
  })();

  function unmount() {
    alive = false;
    try { inner?.unmount?.(); } catch {}
    root.remove();
  }

  return { unmount };
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

boot();

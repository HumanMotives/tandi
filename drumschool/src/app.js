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
    durationMs: 4500
  });
  await splash.waitDone();
  splash.destroy();

  if (!window.location.hash) window.location.hash = "#worlds";

  router.onChange((route) => {
    render(route);
  });

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
  if (currentScreen?.unmount) currentScreen.unmount();
  currentScreen = null;
  appRoot.innerHTML = "";
}

function render(route, force = false) {
  if (!force && currentScreen && currentScreen.route === route) return;

  clearScreen();

  const wrapper = document.createElement("div");
  wrapper.className = "app";
  appRoot.appendChild(wrapper);

  // -------- ROUTES --------

  if (route === "worlds") {
    const screen = mountWorldSelect({
      container: wrapper,
      state,
      onGoWorld: (worldId) => {
        state.nav = state.nav || {};
        state.nav.worldId = worldId; // keep as "w1" etc
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
    const worldId = state?.nav?.worldId || "w1";

    const screen = mountLevels({
      container: wrapper,
      state,
      worldId,
      onBackToWorlds: () => {
        window.location.hash = "#worlds";
      },
      onOpenLevel: (lessonKey) => {
        // lessonKey is now "W1-L1"
        state.nav = state.nav || {};
        state.nav.worldId = worldId;
        state.nav.lessonKey = lessonKey;
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

/* ---- Helpers that load JSON ---- */

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

      const title = "Drum School";
      const subtitle = `${lesson.worldId || ""} • ${lesson.title || lesson.id || lessonKey}`.trim();

      const introLines = Array.isArray(lesson.intro) ? lesson.intro : [];
      const script = introLines
        .map((x) => ({ from: "professor", text: String(x?.text || "").trim() }))
        .filter((x) => x.text);

      inner = mountChatIntro({
        container: root,
        title,
        subtitle,
        professorName: "Professor Octo",
        professorAvatarSrc: "./assets/img/professor_octo.png",
        script: script.length ? script : [{ from: "professor", text: "Geen intro tekst gevonden." }],
        autoAdvanceMs: 0,
        onDone: () => onStartLesson(),
        onSkip: () => onBackToLevels()
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

      // mountLessonPractice is jouw nieuwe practice in componenten
      inner = mountLessonPractice({
        container: root,
        lesson,
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

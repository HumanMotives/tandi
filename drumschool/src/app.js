// src/app.js
import { createRouter } from "./router.js";
import { loadState, saveState, setPlayerName } from "./storage.js";

import { mountSplash } from "../ui/splash.js";
import { mountWorldSelect } from "../ui/worldSelect.js";
import { mountLevels } from "../ui/levels.js";
import { mountChatIntro } from "../ui/chatIntro.js";
import { openNameModal } from "../ui/nameModal.js";

// NEW: lesson loader + lesson screen
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
        state.nav.worldId = worldId; // should match WORLDS id: "w1", "w2", etc.
        saveState(state);
        window.location.hash = "#levels";
      },
      onEditName: () => {
        openNameModal({
          initialName: state.player?.name || "",
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
    // IMPORTANT: default must match your WORLDS ids
    const worldId = state?.nav?.worldId || "w1";

    const screen = mountLevels({
      container: wrapper,
      state,
      worldId,
      onBackToWorlds: () => {
        window.location.hash = "#worlds";
      },
      onOpenLevel: (levelId) => {
        // We expect levelId like "W1-L1"
        state.nav = state.nav || {};
        state.nav.worldId = worldId;
        state.nav.levelId = levelId; // "W1-L1"
        saveState(state);
        window.location.hash = "#intro";
      }
    });

    screen.route = "levels";
    currentScreen = screen;
    return;
  }

  if (route === "intro") {
    const worldId = state?.nav?.worldId || "w1";
    const levelId = state?.nav?.levelId || "W1-L1";

    // Load lesson JSON for this level
    (async () => {
      try {
        const lesson = await loadLesson(levelId);

        // Use JSON-driven intro content
        const screen = mountChatIntro({
          container: wrapper,
          title: "Drum School",
          subtitle: `${worldTitleFromId(worldId)} • ${lesson.title || levelId}`,
          professorName: lesson.professorName || "Professor Octo",
          professorAvatarSrc: lesson.professorAvatarSrc || "./assets/img/professor_octo.png",
          script: Array.isArray(lesson.intro) ? lesson.intro : [],
          autoAdvanceMs: 0, // ✅ no auto advance

          onDone: () => {
            window.location.hash = "#lesson";
          },
          onSkip: () => {
            window.location.hash = "#lesson";
          }
        });

        screen.route = "intro";
        currentScreen = screen;
      } catch (err) {
        wrapper.innerHTML = `
          <div class="card" style="padding:14px;">
            <div style="font-weight:1000; font-size:18px;">Kon lesson niet laden</div>
            <div style="margin-top:8px; font-weight:900; opacity:0.8;">
              Level: ${escapeHtml(levelId)}
            </div>
            <div style="margin-top:8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; font-size:12px; white-space:pre-wrap;">
              ${escapeHtml(String(err?.message || err))}
            </div>
            <div style="margin-top:12px;">
              <button class="btn" id="backToLevelsBtn" type="button">Terug naar levels</button>
            </div>
          </div>
        `;
        const btn = wrapper.querySelector("#backToLevelsBtn");
        btn?.addEventListener("click", () => (window.location.hash = "#levels"));
      }
    })();

    // We set route immediately to avoid rerenders while async loads
    currentScreen = { route: "intro", unmount: () => {} };
    return;
  }

  if (route === "lesson") {
    const worldId = state?.nav?.worldId || "w1";
    const levelId = state?.nav?.levelId || "W1-L1";

    (async () => {
      try {
        const lesson = await loadLesson(levelId);

        const screen = mountLessonPractice({
          container: wrapper,
          worldName: worldTitleFromId(worldId),
          levelName: lesson.title || levelId,
          onExit: () => {
            window.location.hash = "#levels";
          },
          // later: pass lesson.ui + lesson.pattern into mountLessonPractice/mountLesson
          lesson
        });

        screen.route = "lesson";
        currentScreen = screen;
      } catch (err) {
        wrapper.innerHTML = `
          <div class="card" style="padding:14px;">
            <div style="font-weight:1000; font-size:18px;">Kon lesson niet laden</div>
            <div style="margin-top:8px; font-weight:900; opacity:0.8;">
              Level: ${escapeHtml(levelId)}
            </div>
            <div style="margin-top:8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; font-size:12px; white-space:pre-wrap;">
              ${escapeHtml(String(err?.message || err))}
            </div>
            <div style="margin-top:12px;">
              <button class="btn" id="backToLevelsBtn2" type="button">Terug naar levels</button>
            </div>
          </div>
        `;
        const btn = wrapper.querySelector("#backToLevelsBtn2");
        btn?.addEventListener("click", () => (window.location.hash = "#levels"));
      }
    })();

    currentScreen = { route: "lesson", unmount: () => {} };
    return;
  }

  // -------- FALLBACK --------
  window.location.hash = "#worlds";
}

function worldTitleFromId(worldId) {
  // Your ids are: w1..w5
  if (worldId === "w1") return "Wereld 1";
  if (worldId === "w2") return "Wereld 2";
  if (worldId === "w3") return "Wereld 3";
  if (worldId === "w4") return "Wereld 4";
  if (worldId === "w5") return "Wereld 5";
  return "Wereld";
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

// src/app.js
import { createRouter } from "./router.js";
import { loadState, saveState, setPlayerName } from "./storage.js";

import { mountSplash } from "../ui/splash.js";
import { mountWorldSelect } from "../ui/worldSelect.js";
import { mountLevels } from "../ui/levels.js";
import { mountChatIntro } from "../ui/chatIntro.js";
import { openNameModal } from "../ui/nameModal.js";

const appRoot = document.getElementById("appRoot");

let state = loadState();
saveState(state);

const router = createRouter();
let currentScreen = null;

async function boot() {
  // Splash first
  const splash = mountSplash({
    logoSrc: "./assets/img/logo.png",
    durationMs: 4500
  });
  await splash.waitDone();
  splash.destroy();

  // Default route
  if (!window.location.hash) window.location.hash = "#worlds";

  // Listen to route changes
  router.onChange((route) => {
    render(route);
  });

  // Ask name once (optional but useful)
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

  // Initial render
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
        state.nav.worldId = worldId;
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
      onOpenLevel: (levelId) => {
        state.nav = state.nav || {};
        state.nav.worldId = worldId;
        state.nav.levelId = levelId;
        saveState(state);
        window.location.hash = "#intro";
      }
    });

    screen.route = "levels";
    currentScreen = screen;
    return;
  }

  if (route === "intro") {
    // Minimal intro screen: content later becomes level-specific
    const worldId = state?.nav?.worldId || "w1";
    const levelId = state?.nav?.levelId || "l1";

    const screen = mountChatIntro({
      container: wrapper,
      title: "Drum School",
      subtitle: `${worldLabel(worldId)} • ${levelLabel(levelId)}`,
      professorName: "Professor Octo",
      professorAvatarSrc: "./assets/img/professor_octo.png",
      teacherName: "Teacher",
      teacherAvatarSrc: "./assets/img/drumteacher_01.png",
      script: [
        { from: "professor", text: "Welkom terug bij de Drum School!" },
        { from: "teacher", text: "In dit level oefenen we een ritme. Rustig aan, jij kan dit." },
        { from: "teacher", text: "Klik straks op Practice om te beginnen." }
      ],
      autoAdvanceMs: 5000,
      onDone: () => {
        // For now, go back to levels (practice screen comes later)
        window.location.hash = "#levels";
      },
      onSkip: () => {
        window.location.hash = "#levels";
      }
    });

    screen.route = "intro";
    currentScreen = screen;
    return;
  }

  // -------- FALLBACK --------
  window.location.hash = "#worlds";
}

function worldLabel(worldId) {
  if (worldId === "w1") return "Wereld 1";
  if (worldId === "w2") return "Wereld 2";
  if (worldId === "w3") return "Wereld 3";
  if (worldId === "w4") return "Wereld 4";
  return "Wereld";
}

function levelLabel(levelId) {
  if (levelId === "l1") return "Level 1";
  if (levelId === "l2") return "Level 2";
  if (levelId === "l3") return "Level 3";
  if (levelId === "l4") return "Level 4";
  return "Level";
}

boot();

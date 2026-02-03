import { createRouter } from "./router.js";
import { loadState, saveState, setPlayerName, setCurrentLevel, setStars, isLevelUnlocked } from "./storage.js";

import { mountSplash } from "../ui/splash.js";
import { mountWorldSelect } from "../ui/worldSelect.js";
import { mountMap } from "../ui/map.js";
import { openNameModal } from "../ui/nameModal.js";
import { mountChatIntro } from "../ui/chatIntro.js";
import { mountPractice } from "../ui/practice.js";
import { openCompleteOverlay } from "../ui/completeOverlay.js";

import { getWorld, findLevel } from "../data/levels.js";

const appRoot = document.getElementById("appRoot");
let state = loadState();
saveState(state);

const router = createRouter();
let currentScreen = null;

async function boot() {
  const splash = mountSplash({ logoSrc: "./assets/img/logo.png", durationMs: 1500 });
  await splash.waitDone();
  splash.destroy();

  if (!window.location.hash) window.location.hash = "#worlds";

  router.onChange((route) => render(route));

  if (!(state.player?.name || "").trim()) {
    openNameModal({
      initialName: "",
      onSave: (name) => {
        setPlayerName(state, name);
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

  if (route === "worlds") {
    const screen = mountWorldSelect({
      container: wrapper,
      state,
      onGoWorld: () => {
        window.location.hash = "#map";
      }
    });
    screen.route = "worlds";
    currentScreen = screen;
    return;
  }

  if (route === "map") {
    const screen = mountMap({
      container: wrapper,
      state,
      onEditName: () => {
        openNameModal({
          initialName: (state.player?.name || ""),
          onSave: (name) => {
            setPlayerName(state, name);
            render("map", true);
          },
          onCancel: () => {}
        });
      },
      onOpenLevel: (levelId) => {
        setCurrentLevel(state, levelId);
        window.location.hash = "#intro";
      }
    });
    screen.route = "map";
    currentScreen = screen;
    return;
  }

  if (route === "intro") {
    const found = findLevel(state.nav.currentLevel);
    const level = found?.level;

    const teacherId = state.avatar?.teacherId || "drumteacher_01";

    const screen = mountChatIntro({
      container: wrapper,
      title: "Drum School",
      subtitle: level ? `${level.label} • ${level.title}` : "Intro",
      teacherName: "Teacher",
      teacherAvatarSrc: `./assets/img/${teacherId}.png`,
      professorName: "Professor Octo",
      professorAvatarSrc: "./assets/img/professor_octo.png",
      typingSpeed: "fast",
      script: level?.introScript || [
        { from: "professor", text: "Welkom bij Drum School!" },
        { from: "teacher", text: "Let’s go!" }
      ],
      onDone: () => {
        window.location.hash = "#practice";
      },
      onSkip: () => {
        window.location.hash = "#practice";
      }
    });

    screen.route = "intro";
    currentScreen = screen;
    return;
  }

  if (route === "practice") {
    const found = findLevel(state.nav.currentLevel);
    const level = found?.level;

    const screen = mountPractice({
      container: wrapper,
      level,
      onBack: () => {
        window.location.hash = "#map";
      },
      onShowtime: () => {
        // In MVP: meteen “complete” overlay tonen en stars opslaan.
        // Later vervang je dit door echte fixed-bars showtime + muziek.
        openCompleteOverlay({
          state,
          levelTitle: level?.title || "Level",
          onSelectStars: (stars) => {
            if (stars > 0) {
              setStars(state, state.nav.currentLevel, stars);
            }
            window.location.hash = "#map";
          },
          onClose: () => {
            window.location.hash = "#map";
          }
        });
      }
    });

    screen.route = "practice";
    currentScreen = screen;
    return;
  }

  window.location.hash = "#worlds";
}

boot();

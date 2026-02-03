// src/app.js
import { createRouter } from "./router.js";
import { loadState, saveState, setPlayerName } from "./storage.js";

import { mountSplash } from "../ui/splash.js";
import { mountMap } from "../ui/map.js";
import { mountWorldSelect } from "../ui/worldSelect.js";
import { openNameModal } from "../ui/nameModal.js";
import { mountChatIntro } from "../ui/chatIntro.js";

// (Optional) if you already have practice screen module later:
// import { mountPractice } from "../ui/practice.js";

const appRoot = document.getElementById("appRoot");

let state = loadState();
saveState(state);

const router = createRouter();
let currentScreen = null;

async function boot() {
  // 1) Splash
  const splash = mountSplash({
    logoSrc: "./assets/img/logo.png",
    durationMs: 5000
  });
  await splash.waitDone();
  splash.destroy();

  // 2) Default route
  if (!window.location.hash) window.location.hash = "#worlds";

  // 3) Router change handler
  router.onChange((route) => {
    render(route);
  });

  // 4) Ask name once
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

  // 5) Initial render
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

  // IMPORTANT:
  // Put specific routes BEFORE fallback, otherwise #intro can get overwritten.
  if (route === "intro") {
    const screen = mountChatIntro({
      container: wrapper,
      title: "Drum School",
      subtitle: "Les 2 • De maat is vol!",
      professorName: "Professor Octo",
      professorAvatarSrc: "./assets/img/professor_octo.png",
      teacherName: "Teacher",
      teacherAvatarSrc: "./assets/img/drumteacher_01.png",
      script: [
        { from: "professor", text: "Hey hallo! Welkom op de Drum School!" },
        { from: "professor", text: "Wist je dat ritmes al eeuwen bestaan?" },
        { from: "teacher", text: "Ok grapje. Nu begint het pas echt..." },
        { from: "teacher", text: "Korte zinnen. 1 idee per bubble." }
      ],
      autoAdvanceMs: 5000,
      onDone: () => {
        // Later: go to practice screen
        window.location.hash = "#map";
      },
      onSkip: () => {
        window.location.hash = "#map";
      }
    });

    screen.route = "intro";
    currentScreen = screen;
    return;
  }

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
      onOpenLevel: () => {
        // For now: always show intro when clicking a level
        window.location.hash = "#intro";
      }
    });

    screen.route = "map";
    currentScreen = screen;
    return;
  }

  // Optional placeholder route (in case your router produces it)
  if (route === "practice") {
    // If you don’t have practice UI yet, keep it simple.
    const placeholder = document.createElement("div");
    placeholder.style.padding = "20px";
    placeholder.innerHTML = `
      <div style="font-weight:900;font-size:24px;">Practice</div>
      <div style="margin-top:10px;">(Coming next)</div>
      <button class="btn primary" style="margin-top:14px;" type="button">Back</button>
    `;
    placeholder.querySelector("button").addEventListener("click", () => {
      window.location.hash = "#map";
    });
    wrapper.appendChild(placeholder);

    currentScreen = { route: "practice", unmount: () => {} };
    return;
  }

  // Fallback route
  window.location.hash = "#worlds";
}

boot();

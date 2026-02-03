import { createRouter } from "./router.js";
import { loadState, saveState, setPlayerName } from "./storage.js";
import { mountSplash } from "./ui/splash.js";
import { mountMap } from "./ui/map.js";
import { openNameModal } from "./ui/nameModal.js";

const appRoot = document.getElementById("appRoot");

let state = loadState();
saveState(state);

const router = createRouter();

let currentScreen = null;

async function boot() {
  // Splash first
  const splash = mountSplash({ logoSrc: "./assets/img/logo.png", durationMs: 5000 });
  await splash.waitDone();
  splash.destroy();


  // Ensure we have a route
  if (!window.location.hash) window.location.hash = "#map";

  // Route changes
  router.onChange((route) => {
    render(route);
  });

  // Ask name once (optional)
  if (!(state.player?.name || "").trim()) {
    openNameModal({
      initialName: "",
      onSave: (name) => {
        setPlayerName(state, name);
        // re-render current route so greeting updates
        render(router.getRoute(), true);
      },
      onCancel: () => {}
    });
  }
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
      }
    });
    screen.route = "map";
    currentScreen = screen;
    return;
  }

  // fallback
  window.location.hash = "#map";
}

boot();

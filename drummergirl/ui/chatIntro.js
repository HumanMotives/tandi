// ui/chatIntro.js

export function mountChatIntro({
  container,
  title = "Drum School",
  subtitle = "",
  professorName = "Professor",
  professorAvatarSrc = "",
  script = [],
  autoAdvanceMs = 0, // ignored (manual only)
  onDone = () => {},
  onSkip = () => {}
}) {
  let index = 0;

  const root = document.createElement("div");
  root.className = "introScreen";
  container.appendChild(root);

  root.innerHTML = `
    <div class="introStage">
      <div class="introTopBar">
        <div class="introTopText">
          <div class="introTitle">${escapeHtml(title)}</div>
          ${subtitle ? `<div class="introSubtitle">${escapeHtml(subtitle)}</div>` : ""}
        </div>
      </div>

      <div class="introCenter">
        <div class="introCard">
          <div class="introBubbleWrap">
            <div class="introNameTag">${escapeHtml(professorName)}</div>

            <div class="introBubble">
              <div class="introBubbleText" id="introBubbleText"></div>

              <div class="introActions">
                <button class="btn primary introStartBtn" type="button" data-start>
                  Level Starten
                </button>

                <button class="btn ghost introNextBtn" type="button" data-next>
                  Volgende
                </button>
              </div>
            </div>

            ${
              professorAvatarSrc
                ? `<img class="introAvatar" src="${professorAvatarSrc}" alt="${escapeHtml(
                    professorName
                  )}" />`
                : ""
            }
          </div>
        </div>
      </div>
    </div>
  `;

  const bubbleTextEl = root.querySelector("#introBubbleText");
  const startBtn = root.querySelector("[data-start]");
  const nextBtn = root.querySelector("[data-next]");

  renderLine();

  startBtn?.addEventListener("click", async (e) => {
    e.stopPropagation();
    await startPracticeLevel();
  });

  nextBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    advanceOrDone();
  });

  // Tap anywhere to advance (except buttons)
  root.addEventListener("click", () => {
    advanceOrDone();
  });

  function renderLine() {
    if (!script.length) {
      bubbleTextEl.textContent = "Welkom! (Script is leeg)";
      return;
    }
    bubbleTextEl.textContent = script[index]?.text || "";
  }

  function advanceOrDone() {
    if (!script.length) return;

    const isLast = index >= script.length - 1;
    if (isLast) {
      onDone();
      return;
    }

    index += 1;
    renderLine();
  }

  async function startPracticeLevel() {
    // 1) Prefer a global hook if you already have one
    if (typeof window.startPractice === "function") {
      unmount();
      window.startPractice({ container });
      return;
    }
    if (window.dsApp && typeof window.dsApp.startPractice === "function") {
      unmount();
      window.dsApp.startPractice({ container });
      return;
    }

    // 2) Try dynamic import of practice.js (common project structure: /ui/chatIntro.js -> ../practice.js)
    try {
      const mod = await import("../ui/practice.js");

      const fn =
        mod.mountPractice ||
        mod.startPractice ||
        mod.initPractice ||
        mod.mountPracticeScreen ||
        mod.default;

      if (typeof fn === "function") {
        unmount();
        // Support both patterns: fn(container) or fn({container})
        try {
          fn({ container });
        } catch {
          fn(container);
        }
        return;
      }
    } catch (err) {
      // ignore and fall through
    }

    // 3) Fallback: you can customize this if you have routing
    // If your app uses hash routing, set something like: location.hash = "#practice"
    // Otherwise, just call onDone and let the app flow continue.
    onDone();
  }

  function unmount() {
    root.remove();
  }

  return { unmount };
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
   dinChatIntroText.replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

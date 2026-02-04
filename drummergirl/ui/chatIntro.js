// ui/chatIntro.js

export function mountChatIntro({
  container,
  title = "Drum School",
  subtitle = "",
  professorName = "Professor",
  professorAvatarSrc = "",
  script = [],
  autoAdvanceMs = 0, // 0 = no auto
  onDone = () => {},
  onSkip = () => {}
}) {
  let index = 0;
  let timer = null;

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

          <div class="introContentRow">
            <div class="introBubbleCol">
              <div class="introNameTag">${escapeHtml(professorName)}</div>

              <div class="introBubble">
                <div class="introBubbleText" id="introBubbleText"></div>
              </div>

              <div class="introFooterRow">
                <button class="introSkipInline" type="button" data-skip>
                  Overslaan
                  <span class="introSkipArrow" aria-hidden="true">↪</span>
                </button>

                <div class="introTapHint">Klik ergens op het scherm om door te gaan</div>
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
  const skipBtn = root.querySelector("[data-skip]");

  renderLine();

  skipBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    cleanupTimers();
    onSkip();
  });

  // Tap anywhere to advance (except when clicking skip)
  root.addEventListener("click", () => {
    advanceOrDone(false);
  });

  // Optional auto-advance every N ms
  if (autoAdvanceMs && autoAdvanceMs > 0) {
    timer = setInterval(() => {
      advanceOrDone(true);
    }, autoAdvanceMs);
  }

  function renderLine() {
    if (!script.length) {
      bubbleTextEl.textContent = "Welkom! (Script is leeg)";
      return;
    }

    const line = script[index]?.text || "";
    bubbleTextEl.textContent = line;
  }

  function advanceOrDone(fromAuto = false) {
    if (!script.length) return;

    const isLast = index >= script.length - 1;

    // Als we op de laatste regel zitten, dan is een tik "klaar"
    if (isLast) {
      cleanupTimers();
      onDone();
      return;
    }

    index += 1;
    renderLine();

    // Als auto-advance net de laatste regel bereikt heeft, laat die dan zien
    // en rond af bij de volgende tick, of door user tap
    if (fromAuto && index >= script.length - 1) {
      // niets extra, user kan nog lezen. Wil je dat hij meteen afsluit:
      // cleanupTimers(); onDone();
    }
  }

  function cleanupTimers() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function unmount() {
    cleanupTimers();
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

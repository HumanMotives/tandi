// ui/chatIntro.js

export function mountChatIntro({
  container,
  title = "Drum School",
  subtitle = "",
  professorName = "Professor",
  professorAvatarSrc = "",
  script = [],
  autoAdvanceMs = 0, // ignored now (manual only)
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
            </div>

            ${
              professorAvatarSrc
                ? `<img class="introAvatar" src="${professorAvatarSrc}" alt="${escapeHtml(
                    professorName
                  )}" />`
                : ""
            }
          </div>

          <div class="introFooterRow">
            <button class="introSkipInline" type="button" data-skip>
              Uitleg overslaan <span class="introSkipArrow" aria-hidden="true">↪</span>
            </button>

            <button class="introNextInline" type="button" data-next>
              Volgende <span class="introNextArrow" aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  const bubbleTextEl = root.querySelector("#introBubbleText");
  const skipBtn = root.querySelector("[data-skip]");
  const nextBtn = root.querySelector("[data-next]");

  renderLine();

  skipBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    onSkip();
  });

  nextBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    advanceOrDone();
  });

  // Tap anywhere to advance (except when clicking buttons)
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
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

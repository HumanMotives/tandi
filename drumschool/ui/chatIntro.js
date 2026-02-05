// ui/chatIntro.js

export function mountChatIntro({
  container,
  title = "Drum School",
  subtitle = "",
  professorName = "Professor",
  professorAvatarSrc = "",
  script = [],
  autoAdvanceMs = 0, // bewust genegeerd: alleen handmatig
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

            <div class="introBubbleBlock">
              <div class="introNameTag">${escapeHtml(professorName)}</div>

              <div class="introBubble">
                <div class="introBubbleText" id="introBubbleText"></div>
              </div>

              <div class="introControlsBelow">
                <button
                  class="btn primary"
                  type="button"
                  data-start
                >
                  Level Starten
                </button>

                <button
                  class="btn ghost"
                  type="button"
                  data-next
                >
                  Volgende
                </button>
              </div>
            </div>

            ${
              professorAvatarSrc
                ? `<img
                    class="introAvatar"
                    src="${professorAvatarSrc}"
                    alt="${escapeHtml(professorName)}"
                  />`
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
  updateButtons();

  startBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    onDone();
  });

  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    next();
  });

  function renderLine() {
    if (!script.length) {
      bubbleTextEl.textContent = "Welkom!";
      return;
    }
    bubbleTextEl.textContent = script[index]?.text || "";
  }

  function updateButtons() {
    const isLast = index >= script.length - 1;
    nextBtn.style.display = isLast ? "none" : "inline-flex";
    startBtn.style.display = isLast ? "inline-flex" : "none";
  }

  function next() {
    if (index >= script.length - 1) return;
    index += 1;
    renderLine();
    updateButtons();
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

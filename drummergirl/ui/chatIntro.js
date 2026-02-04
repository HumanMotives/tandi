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

  // Background wrapper (uses your global gradient/background)
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

              <div class="introControls">
                <button class="btn introBtn" type="button" data-next>Next</button>
                <button class="btn introBtnPrimary" type="button" data-start>Let’s Drum! 🥁</button>
              </div>

              <div class="introHint">Tip: tik op het scherm om door te gaan</div>
            </div>

            ${
              professorAvatarSrc
                ? `<img class="introAvatar" src="${professorAvatarSrc}" alt="${escapeHtml(
                    professorName
                  )}" />`
                : ""
            }
          </div>

          <button class="introSkip" type="button" data-skip>
            Uitleg overslaan
            <span class="introSkipArrow">↪</span>
          </button>
        </div>
      </div>
    </div>
  `;

  const bubbleTextEl = root.querySelector("#introBubbleText");
  const nextBtn = root.querySelector("[data-next]");
  const startBtn = root.querySelector("[data-start]");
  const skipBtn = root.querySelector("[data-skip]");

  // Render first line
  renderLine();

  // Interactions
  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    nextLine();
  });

  startBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    cleanupTimers();
    onDone();
  });

  skipBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    cleanupTimers();
    onSkip();
  });

  // Tap anywhere to advance (except when clicking buttons)
  root.addEventListener("click", () => {
    nextLine();
  });

  // Optional auto-advance every N ms
  if (autoAdvanceMs && autoAdvanceMs > 0) {
    timer = setInterval(() => {
      nextLine(true);
    }, autoAdvanceMs);
  }

  function renderLine() {
    const line = script[index]?.text || "";
    bubbleTextEl.textContent = line;

    // Disable "Next" if last line
    const isLast = index >= script.length - 1;
    nextBtn.disabled = isLast;

    // If there is no script, avoid weird empty state
    if (!script.length) {
      bubbleTextEl.textContent = "Welkom! (Script is leeg)";
      nextBtn.disabled = true;
    }
  }

  function nextLine(fromAuto = false) {
    if (!script.length) return;

    // If last line: do nothing on Next, but tapping could still do nothing
    if (index >= script.length - 1) {
      // On auto we stop to avoid infinite tries
      if (fromAuto) cleanupTimers();
      return;
    }

    index += 1;
    renderLine();
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

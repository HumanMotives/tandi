// ui/chatIntro.js

/**
 * Intro / tutorial chat (visual-only screen)
 *
 * Requirements (Feb 2026):
 * - One image per lesson (lesson JSON: `introImage`), optional.
 * - Small context line (world + level) above image.
 * - Speech bubble with text (from lesson JSON `intro`).
 * - Buttons: "Overslaan" -> go directly to lesson (same as done), "Volgende" / "Start".
 * - No professor/teacher avatar.
 * - Centered layout, mobile stacks naturally.
 */

export function mountChatIntro({
  container,

  // Context
  title = "", // e.g. "Wereld 1 - Jungle"
  subtitle = "", // e.g. "Klap mee in de maat"

  // Single image for the lesson intro
  introImage = "", // preferred
  // Backward compatibility (older callers)
  professorAvatarSrc = "",

  // Script lines: supports array of strings OR array of {text}
  script = [],

  autoAdvanceMs = 0, // intentionally ignored (manual only)
  onDone = () => {},
  onSkip = () => {}
}) {
  void autoAdvanceMs;

  let index = 0;

  const root = document.createElement("div");
  root.className = "introScreen";

  // Hard reset the container to avoid any legacy "Lesson laden" banners lingering
  // (visual only, does not affect logic elsewhere)
  container.innerHTML = "";
  container.appendChild(root);

  const imgSrc = String(introImage || professorAvatarSrc || "").trim();

  root.innerHTML = `
    <div class="introStage">

      <div class="introTopBar" style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
        <div class="introTopText">
          ${title ? `<div class="introTitle">${escapeHtml(title)}</div>` : ""}
          ${subtitle ? `<div class="introSubtitle">${escapeHtml(subtitle)}</div>` : ""}
        </div>

        <div style="display:flex; gap:10px;">
          <button class="btn ghost" type="button" data-skip>Overslaan</button>
        </div>
      </div>

      <div class="introCenter">
        <div class="introCard">
          <div class="introBubbleWrap" style="align-items:flex-start;">

            <div class="introBubbleBlock" style="width:min(720px, 92vw);">

              ${
                imgSrc
                  ? `<div class="introImageWrap" style="width:100%; display:flex; justify-content:center; margin: 0 0 14px 0;">
                       <img class="introLessonImage" src="${escapeHtml(imgSrc)}" alt="" draggable="false" style="width:100%; max-width:720px; height:auto; border-radius:18px; border:4px solid rgba(0,0,0,0.85); box-shadow: 0 10px 0 rgba(0,0,0,0.10); background: rgba(255,255,255,0.65);" />
                     </div>`
                  : ""
              }

              <div class="introBubble">
                <div class="introBubbleText" id="introBubbleText"></div>
              </div>

              <div class="introControlsBelow" style="justify-content:center;">
                <button class="btn primary" type="button" data-start>Start</button>
                <button class="btn ghost" type="button" data-next>Volgende</button>
              </div>

            </div>

          </div>
        </div>
      </div>

    </div>
  `;

  const bubbleTextEl = root.querySelector("#introBubbleText");
  const startBtn = root.querySelector("[data-start]");
  const nextBtn = root.querySelector("[data-next]");
  const skipBtn = root.querySelector("[data-skip]");

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

  skipBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    // Requirement: Overslaan should go directly into the lesson (same as done)
    try { onSkip(); } catch {}
    onDone();
  });

  function getLineText(line) {
    if (typeof line === "string") return line;
    if (line && typeof line === "object") return String(line.text || "");
    return "";
  }

  function renderLine() {
    if (!Array.isArray(script) || script.length === 0) {
      bubbleTextEl.textContent = "Welkom!";
      return;
    }
    bubbleTextEl.textContent = getLineText(script[index]) || "";
  }

  function updateButtons() {
    const hasScript = Array.isArray(script) && script.length > 0;
    const isLast = !hasScript || index >= script.length - 1;
    nextBtn.style.display = isLast ? "none" : "inline-flex";
    startBtn.style.display = isLast ? "inline-flex" : "none";
  }

  function next() {
    if (!Array.isArray(script) || index >= script.length - 1) return;
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
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ui/completeOverlay.js
export function openCompleteOverlay({
  state,
  levelTitle = "Level complete!",
  onSelectStars,
  onClose
} = {}) {
  const overlay = document.createElement("div");
  overlay.className = "overlay";

  overlay.innerHTML = `
    <div class="overlayCard">
      <div class="overlayTitle">LEVEL COMPLETE!</div>
      <div class="overlaySub">${escapeHtml(levelTitle)}</div>

      <div class="overlayStars" id="starsRow"></div>

      <div class="overlayBtns">
        <button class="btn orange" id="replayBtn">Replay</button>
        <button class="btn green" id="nextBtn">Next</button>
      </div>
    </div>
  `;

  const starsRow = overlay.querySelector("#starsRow");
  for (let i = 1; i <= 5; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "starPick";
    b.textContent = "★";
    b.addEventListener("click", () => {
      if (typeof onSelectStars === "function") onSelectStars(i);
      close();
    });
    starsRow.appendChild(b);
  }

  const replayBtn = overlay.querySelector("#replayBtn");
  const nextBtn = overlay.querySelector("#nextBtn");

  replayBtn.addEventListener("click", () => {
    if (typeof onSelectStars === "function") onSelectStars(0); // 0 means "no change"
    close();
  });

  nextBtn.addEventListener("click", () => {
    if (typeof onSelectStars === "function") onSelectStars(3); // default if they just want to continue
    close();
  });

  function close() {
    overlay.remove();
    if (typeof onClose === "function") onClose();
  }

  document.body.appendChild(overlay);

  return { close };
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

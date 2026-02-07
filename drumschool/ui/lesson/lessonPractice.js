// ui/lesson/lessonPractice.js
// PATCH: hide stubborn "Lesson laden..." banner + countdown overlay color + auto-hide after count-in
// NOTE: This file is intended as a drop-in replacement for the existing lessonPractice.js.
// It only changes visuals/DOM presentation (no lesson logic changes).

import { mountShell } from "../shell.js";
import { openBackpack } from "../backpack.js";

// (Your existing imports below this line should remain in your project.)
// If your project uses different relative paths, keep your original import block and
// only merge the PATCH functions + overlay behavior.
// ------------------------------------------------------------

// IMPORTANT: This patch assumes your current file already mounts the practice UI,
// metronome, and transport. We only add:
// 1) hideLessonLoaderBanner() call on mount + after start
// 2) countdown overlay element that hides itself after "4"
// 3) countdown color via CSS variable --count-color

const BASE_PREFIX = "/drumschool";

export function mountLessonPractice({
  container,
  state,
  lessonId,
  onBack = () => {},
  onEditName = () => {}
}) {
  const shell = mountShell({
    container,
    state,
    onEditName,
    onOpenBackpack: () => {
      openBackpack({
        state,
        onClose: () => shell.updateSidebar()
      });
    },
    onOpenSettings: () => {},
    onToggleAudio: () => {},
    onOpenInfo: () => {}
  });

  const main = document.createElement("div");
  main.className = "dsLessonPractice";

  shell.setMain(main);

  // PATCH: aggressively hide the loader banner if it exists anywhere
  hideLessonLoaderBanner();
  setTimeout(hideLessonLoaderBanner, 0);
  setTimeout(hideLessonLoaderBanner, 250);

  // Render (keep your existing render if different; this is minimal scaffold)
  main.innerHTML = `
    <div class="dsLessonTopBar">
      <button class="btn btn--yellow btnWithCoin dsStopBtn" type="button">
        <span class="btnCoin"><img src="${BASE_PREFIX}/assets/img/icons/ds_icon_close.png" alt="" /></span>
        <span class="btnLabel">Stop de les</span>
      </button>

      <button class="btn btn--red btnWithCoin dsShowtimeBtn" type="button">
        <span class="btnCoin"><img src="${BASE_PREFIX}/assets/img/icons/ds_icon_fastforward.png" alt="" /></span>
        <span class="btnLabel">Showtime!</span>
      </button>
    </div>

    <div class="dsDottedDivider dsDottedDivider--spaced"></div>

    <div class="dsLessonHeaderCard">
      <div class="dsLessonHeaderLeft">
        <button class="dsHeaderIconBtn dsHeaderIconBtn--play" type="button" aria-label="Play">
          <img src="${BASE_PREFIX}/assets/img/icons/ds_icon_play.png" alt="" />
        </button>
      </div>

      <div class="dsLessonHeaderRight">
        <button class="dsHeaderIconBtn" type="button" aria-label="Info">
          <img src="${BASE_PREFIX}/assets/img/icons/ds_icon_info.png" alt="" />
        </button>
        <button class="dsHeaderIconBtn" type="button" aria-label="Noten geluid">
          <img src="${BASE_PREFIX}/assets/img/icons/ds_icon_sound.png" alt="" />
        </button>
        <button class="dsHeaderIconBtn" type="button" aria-label="Loop">
          <img src="${BASE_PREFIX}/assets/img/icons/ds_icon_loop.png" alt="" />
        </button>
      </div>
    </div>

    <div class="dsPracticeStage">
      <!-- Your existing timeline/metronome UI renders here in your current code -->
    </div>

    <div id="dsCountOverlay" class="dsCountOverlay" aria-hidden="true"></div>
  `;

  // PATCH: also hide loader banner after we render
  hideLessonLoaderBanner();
  setTimeout(hideLessonLoaderBanner, 0);

  // Wire minimal buttons to existing behavior hooks if your original file has them.
  // We only keep back behavior (no new logic).
  const stopBtn = main.querySelector(".dsStopBtn");
  if (stopBtn) stopBtn.addEventListener("click", onBack);

  // Countdown overlay API (call from your existing metronome count-in callbacks)
  const overlay = main.querySelector("#dsCountOverlay");
  const countdown = createCountOverlayController(overlay);

  // Expose on main for your existing code to call without refactor:
  // window.__dsCountOverlay(1..4, doneBool)
  window.__dsCountOverlay = (n, done=false) => {
    if (!overlay) return;
    countdown.showNumber(n);
    if (done) countdown.hideSoon();
  };

  function unmount() {
    delete window.__dsCountOverlay;
    shell.unmount();
  }

  return { unmount };
}

/**
 * PATCH 1: Hide the stubborn loader banner anywhere in DOM.
 * This targets elements whose visible text starts with "Lesson laden".
 * It does not remove anything; it sets display:none.
 */
function hideLessonLoaderBanner(){
  const candidates = Array.from(document.querySelectorAll("body *"))
    .filter(el => {
      if (!el || !el.textContent) return false;
      const t = el.textContent.trim().toLowerCase();
      if (!t) return false;
      if (!t.startsWith("lesson laden")) return false;
      // avoid hiding large containers: keep it to "bar-like" elements
      const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      if (!r) return true;
      return r.height <= 120; // typical top banner height
    });

  candidates.forEach(el => {
    el.style.display = "none";
  });
}

/**
 * PATCH 2: Countdown overlay controller
 * - Shows big 1/2/3/4
 * - After count-in, auto hides and clears text
 */
function createCountOverlayController(el){
  let hideTimer = null;

  function showNumber(n){
    if (!el) return;
    clearTimeout(hideTimer);
    el.textContent = String(n);
    el.classList.add("isVisible");
    el.setAttribute("aria-hidden", "false");
  }

  function hideSoon(){
    if (!el) return;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      el.classList.remove("isVisible");
      el.setAttribute("aria-hidden", "true");
      // clear after fade
      setTimeout(() => {
        if (!el.classList.contains("isVisible")) el.textContent = "";
      }, 220);
    }, 250);
  }

  return { showNumber, hideSoon };
}

// ui/chatIntro.js
export function mountChatIntro({
  container,
  title = "Drum School",
  subtitle = "",
  professorName = "Professor Octo",
  professorAvatarSrc = "./assets/img/professor_octo.png",
  teacherName = "Teacher",
  teacherAvatarSrc = "./assets/img/drumteacher_01.png",
  script = [],
  autoAdvanceMs = 5000,
  onDone,
  onSkip
} = {}) {
  const root = document.createElement("div");
  root.className = "introScreen";

  // Convert to internal script items with speaker resolution
  const lines = (script || []).map((s) => {
    const from = (s.from || "professor").toLowerCase();
    const isProf = from === "professor";
    return {
      from,
      speakerName: isProf ? professorName : teacherName,
      avatarSrc: isProf ? professorAvatarSrc : teacherAvatarSrc,
      text: String(s.text || "")
    };
  });

  let index = 0;
  let timer = null;

  root.innerHTML = `
    <div class="introTop">
      <div class="introTitle">${escapeHtml(title)} <span class="introSub">${escapeHtml(subtitle)}</span></div>
      <button class="btn ghost introSkip" type="button">Skip</button>
    </div>

    <div class="introStage" id="introStage">
      <div class="introCharacterWrap">
        <img class="introCharacter" id="introCharacter" src="${escapeAttr(professorAvatarSrc)}" alt="">
      </div>

      <div class="introBubble">
        <div class="introBubbleName" id="introName">${escapeHtml(professorName)}</div>
        <div class="introBubbleText" id="introText"></div>

        <div class="introBubbleActions">
          <button class="btn primary" type="button" id="introNext">Next</button>
          <button class="btn ghost" type="button" id="introLets">Let's Drum! 🥁</button>
        </div>

        <div class="introHint">Tip: tik op het scherm om door te gaan</div>
      </div>
    </div>
  `;

  container.appendChild(root);

  const elChar = root.querySelector("#introCharacter");
  const elName = root.querySelector("#introName");
  const elText = root.querySelector("#introText");
  const stage = root.querySelector("#introStage");

  function renderLine(i) {
    const line = lines[i];
    if (!line) return;

    elChar.src = line.avatarSrc;
    elName.textContent = line.speakerName;

    // Typewriter-like but instant (fast + not laggy)
    elText.textContent = line.text;

    clearTimer();
    timer = setTimeout(() => {
      goNext();
    }, autoAdvanceMs);
  }

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function goNext() {
    index++;
    if (index >= lines.length) {
      clearTimer();
      if (typeof onDone === "function") onDone();
      return;
    }
    renderLine(index);
  }

  function goDoneNow() {
    clearTimer();
    if (typeof onDone === "function") onDone();
  }

  root.querySelector(".introSkip").addEventListener("click", () => {
    clearTimer();
    if (typeof onSkip === "function") onSkip();
    if (typeof onDone === "function") onDone();
  });

  root.querySelector("#introNext").addEventListener("click", goNext);
  root.querySelector("#introLets").addEventListener("click", goDoneNow);

  // Tap/click stage to advance
  stage.addEventListener("click", (e) => {
    // avoid double-advance when clicking buttons
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
    if (tag === "button") return;
    goNext();
  });

  // Start
  if (lines.length > 0) {
    renderLine(0);
  } else {
    elText.textContent = "Welkom!";
    clearTimer();
  }

  function unmount() {
    clearTimer();
    root.remove();
  }

  return { unmount };
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str);
}

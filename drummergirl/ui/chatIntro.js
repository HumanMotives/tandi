export function mountChatIntro({
  container,
  title = "Academy Intro",
  subtitle = "One tiny step at a time",
  teacherName = "Drum Teacher",
  teacherAvatarSrc = "./assets/img/drumteacher_01.png",
  professorName = "Professor Octo",
  professorAvatarSrc = "./assets/img/professor_octo.png",
  script = [],
  onDone,
  onSkip
} = {}) {
  const el = document.createElement("div");
  el.className = "screen dots";

  el.innerHTML = `
    <div class="chatScreen">
      <div class="chatHeader">
        <div class="chatHeaderLeft">
          <div class="chatHeaderBadge">
            <img src="${escapeAttr(professorAvatarSrc)}" alt="${escapeAttr(professorName)}" />
            <div class="meta">
              <strong>${escapeHtml(title)}</strong>
              <span>${escapeHtml(subtitle)}</span>
            </div>
          </div>
        </div>
        <div class="chatHeaderRight">
          <button class="btn ghost" id="skipBtn">Skip</button>
        </div>
      </div>

      <div class="chatBody" id="chatBody"></div>

      <div class="chatFooter">
        <div class="chatFooterLeft" id="hint">Tip: korte zinnen. 1 idee per bubble.</div>
        <div class="chatFooterRight">
          <button class="btn ghost" id="nextBtn">Next</button>
          <button class="btn green hidden" id="doneBtn">Let’s Drum! 🥁</button>
        </div>
      </div>
    </div>
  `;

  const chatBody = el.querySelector("#chatBody");
  const nextBtn = el.querySelector("#nextBtn");
  const doneBtn = el.querySelector("#doneBtn");
  const skipBtn = el.querySelector("#skipBtn");

  let idx = 0;
  let locked = false;
  let typingEl = null;

  // Default script if empty
  const lines = (script && script.length) ? script : [
    { from: "professor", text: "Welkom bij de Rhythm Academy! 🐙🥁" },
    { from: "teacher", text: "Hey! Ik ga je helpen. We doen steeds maar 1 klein ding." },
    { from: "teacher", text: "Vandaag: klappen op de BIG beats. Dat zijn er 4." },
    { from: "teacher", text: "Geen stress. Jij kiest wanneer je klaar bent voor Showtime." }
  ];

  function scrollToBottom() {
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function addTyping(from) {
    const row = document.createElement("div");
    row.className = "bubbleRow";
    row.innerHTML = `
      ${from === "player" ? "" : `
        <div class="bubbleAvatar">
          <img src="${escapeAttr(from === "professor" ? professorAvatarSrc : teacherAvatarSrc)}" alt="" />
        </div>
      `}
      <div class="typingBubble">
        <span class="typingDot"></span>
        <span class="typingDot"></span>
        <span class="typingDot"></span>
      </div>
    `;
    chatBody.appendChild(row);
    scrollToBottom();
    return row;
  }

  function addBubble(from, text) {
    const row = document.createElement("div");
    row.className = "bubbleRow";

    const isPlayer = from === "player";
    const bubbleClass = from === "professor" ? "bubble professor" : (isPlayer ? "bubble player" : "bubble teacher");
    const avatarHtml = isPlayer ? "" : `
      <div class="bubbleAvatar">
        <img src="${escapeAttr(from === "professor" ? professorAvatarSrc : teacherAvatarSrc)}" alt="" />
      </div>
    `;

    row.innerHTML = `
      ${avatarHtml}
      <div class="${bubbleClass}">
        <div class="bubbleTail"></div>
        ${escapeHtml(text)}
      </div>
    `;

    if (isPlayer) {
      // For player messages we want bubble on the right without avatar
      row.style.justifyContent = "flex-end";
    }

    chatBody.appendChild(row);
    scrollToBottom();
  }

  async function showNext() {
    if (locked) return;
    if (idx >= lines.length) return;

    locked = true;
    nextBtn.disabled = true;

    const line = lines[idx];
    typingEl = addTyping(line.from);

    // Typing delay scales with text length (feels natural)
    const delay = Math.min(1200, 520 + String(line.text).length * 18);

    await wait(delay);

    if (typingEl) typingEl.remove();
    typingEl = null;

    addBubble(line.from, line.text);
    idx++;

    locked = false;
    nextBtn.disabled = false;

    if (idx >= lines.length) {
      nextBtn.classList.add("hidden");
      doneBtn.classList.remove("hidden");
    }
  }

  function finish() {
    if (typeof onDone === "function") onDone();
  }

  function skip() {
    if (typeof onSkip === "function") onSkip();
    // Show everything instantly
    if (typingEl) typingEl.remove();
    typingEl = null;
    chatBody.innerHTML = "";
    lines.forEach(l => addBubble(l.from, l.text));
    idx = lines.length;
    nextBtn.classList.add("hidden");
    doneBtn.classList.remove("hidden");
  }

  nextBtn.addEventListener("click", showNext);
  doneBtn.addEventListener("click", finish);
  skipBtn.addEventListener("click", skip);

  // Auto-play first message
  container.appendChild(el);
  showNext();

  function unmount() {
    if (typingEl) typingEl.remove();
    el.remove();
  }

  return { unmount };
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
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
  // same as escapeHtml but kept separate for clarity
  return escapeHtml(str);
}

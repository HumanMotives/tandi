// ui/chatIntro.js

export function mountChatIntro({
  container,
  title = "Wereld",
  subtitle = "",
  professorName = "Professor", // compatibility: not used visually
  professorAvatarSrc = "",      // used as hero image
  script = [],
  autoAdvanceMs = 0,             // ignored: manual only
  onDone = () => {},
  onSkip = () => {}
}) {
  if (!container) throw new Error("mountChatIntro: container ontbreekt.");

  // Prevent a hard-to-kill "Lesson laden…" placeholder from staying visible
  // above the intro (introduced by some mounts). Clearing here is safe because
  // this screen fully owns the container while mounted.
  container.innerHTML = "";

  const lines = Array.isArray(script)
    ? script
        .map((l) => {
          if (l == null) return "";
          if (typeof l === "string") return l;
          if (typeof l === "object") {
            return String(l.text || l.msg || l.message || l.line || "");
          }
          return String(l);
        })
        .map((s) => String(s).trim())
        .filter(Boolean)
    : [];

  if (lines.length === 0) {
    lines.push("Klaar? Klik op Start.");
  }

  let idx = 0;

  const root = document.createElement("div");
  root.className = "introScreen";
  container.appendChild(root);

  const worldLine = String(title || "").trim();
  const levelLine = String(subtitle || "").trim();

  // Use professorAvatarSrc as the hero image to avoid changing callers
  const heroSrc = String(professorAvatarSrc || "").trim();

  root.innerHTML = `
    <div class="introStage" style="display:flex;align-items:center;justify-content:center;">
      <div class="introCard" style="width:min(980px,100%);">

        <div style="display:flex;flex-direction:column;gap:14px;align-items:center;">

          <div style="width:100%;text-align:left;max-width:980px;">
            <div style="font-family:var(--font-heading);font-weight:900;font-size:16px;opacity:0.9;">
              ${escapeHtml(worldLine)}${levelLine ? ` · ${escapeHtml(levelLine)}` : ""}
            </div>
          </div>

          ${heroSrc ? `
            <div style="width:min(920px,100%);">
              <div style="border:4px solid rgba(255,90,90,0.95);border-radius:28px;background:rgba(255,255,255,0.12);padding:0;overflow:hidden;">
                <img src="${escapeAttr(heroSrc)}" alt="" style="width:100%;height:auto;display:block;" draggable="false" />
              </div>
            </div>
          ` : ""}

          <div style="width:min(920px,100%);position:relative;">
            <div class="introBubble" style="background:rgba(255,255,255,0.92);border:4px solid rgba(0,0,0,0.92);border-radius:26px;box-shadow:none;padding:22px 22px 18px 22px;">
              <div class="introBubbleText" data-chat-line style="font-family:var(--font-body);font-size:clamp(18px,2.2vw,30px);line-height:1.25;padding-right:92px;">
                ${escapeHtml(lines[0])}
              </div>
            </div>

            <button type="button" data-next
              style="position:absolute;right:-12px;top:50%;transform:translateY(-50%);width:72px;height:72px;border-radius:999px;border:4px solid rgba(0,0,0,0.85);background:rgba(85,190,245,0.95);box-shadow:0 10px 0 rgba(0,0,0,0.18);display:grid;place-items:center;cursor:pointer;">
              <span aria-hidden="true" style="font-family:var(--font-display);font-size:34px;color:rgba(0,0,0,0.85);">→</span>
              <span class="hidden">Volgende</span>
            </button>
          </div>

          <div style="width:min(920px,100%);display:flex;justify-content:center;gap:10px;">
            <button type="button" class="btn" data-skip style="min-width:140px;">Overslaan</button>
          </div>

        </div>
      </div>
    </div>
  `;

  const lineEl = root.querySelector("[data-chat-line]");
  const nextBtn = root.querySelector("[data-next]");
  const skipBtn = root.querySelector("[data-skip]");

  function setLine(n) {
    if (!lineEl) return;
    lineEl.textContent = lines[n] || "";
  }

  function goNext() {
    if (idx < lines.length - 1) {
      idx += 1;
      setLine(idx);
      return;
    }
    cleanup();
    onDone();
  }

  function skip() {
    cleanup();
    // Skip should behave like "done": go straight into the lesson.
    // (The app can still decide what "done" means.)
    onDone();
  }

  if (nextBtn) nextBtn.addEventListener("click", goNext);
  if (skipBtn) skipBtn.addEventListener("click", skip);

  function onKey(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goNext();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      skip();
    }
  }

  window.addEventListener("keydown", onKey);

  function cleanup() {
    window.removeEventListener("keydown", onKey);
    try { root.remove(); } catch {}
  }

  function unmount() {
    cleanup();
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

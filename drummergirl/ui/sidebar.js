// ui/sidebar.js
export function mountSidebar({
  container,
  state,
  onOpenSettings,
  onToggleAudio,
  onOpenInfo,
  onOpenBackpack,
  onEditName
}) {
  const root = document.createElement("aside");
  root.className = "dsSidebar";

  function getPlayerName() {
    const name = (state.player?.name || "").trim();
    return name ? name.toUpperCase() : "PLAYER";
  }

  function getAvatarSrc() {
    // You can store this later in state.player.avatarId etc.
    // Fallback to rockbunny if present, else just empty.
    return state.player?.avatarSrc || "./assets/img/avatars/ds_avatar_rockbunny.png";
  }

  function formatInt(n) {
    const x = Number(n || 0);
    return x.toLocaleString("nl-NL");
  }

  function safe(n) {
    return Number.isFinite(Number(n)) ? Number(n) : 0;
  }

  function render() {
    const stars = safe(state.progress?.stars);
    const ticks = safe(state.progress?.ticks);
    const grooves = safe(state.progress?.grooves);

    root.innerHTML = `
      <div class="dsSidebarInner">
        <div class="dsSidebarLogoWrap">
          <img class="dsSidebarLogo" src="./assets/img/logo.png" alt="Drum School" />
        </div>

        <div class="dsPlayerCard">
          <button class="dsPlayerAvatarBtn" type="button" aria-label="Open Backpack">
            <img class="dsPlayerAvatar" src="${escapeAttr(getAvatarSrc())}" alt="Player avatar" />
          </button>

          <div class="dsPlayerMeta">
            <div class="dsPlayerNameRow">
              <div class="dsPlayerName">${escapeHtml(getPlayerName())}</div>
              <button class="dsNameEditBtn" type="button" title="Naam wijzigen" aria-label="Naam wijzigen">✎</button>
            </div>
          </div>
        </div>

        <div class="dsStatList">
          <div class="dsStatRow">
            <div class="dsStatLeft"><span class="dsStatEmoji">⭐</span> <span class="dsStatLabel">Stars</span></div>
            <div class="dsStatValue">${formatInt(stars)}</div>
          </div>
          <div class="dsStatRow">
            <div class="dsStatLeft"><span class="dsStatEmoji">✨</span> <span class="dsStatLabel">Ticks</span></div>
            <div class="dsStatValue">${formatInt(ticks)}</div>
          </div>
          <div class="dsStatRow">
            <div class="dsStatLeft"><span class="dsStatEmoji">🥁</span> <span class="dsStatLabel">Grooves</span></div>
            <div class="dsStatValue">${formatInt(grooves)}</div>
          </div>
        </div>

        <div class="dsSidebarButtons">
          <button class="dsIconBtn" type="button" data-action="settings" title="Settings" aria-label="Settings">⚙️</button>
          <button class="dsIconBtn" type="button" data-action="audio" title="Audio" aria-label="Audio">🔊</button>
          <button class="dsIconBtn" type="button" data-action="info" title="Info" aria-label="Info">ℹ️</button>
        </div>
      </div>
    `;

    root.querySelector(".dsPlayerAvatarBtn").addEventListener("click", () => {
      if (typeof onOpenBackpack === "function") onOpenBackpack();
    });

    root.querySelector(".dsNameEditBtn").addEventListener("click", () => {
      if (typeof onEditName === "function") onEditName();
    });

    root.querySelector('[data-action="settings"]').addEventListener("click", () => {
      if (typeof onOpenSettings === "function") onOpenSettings();
    });

    root.querySelector('[data-action="audio"]').addEventListener("click", () => {
      if (typeof onToggleAudio === "function") onToggleAudio();
    });

    root.querySelector('[data-action="info"]').addEventListener("click", () => {
      if (typeof onOpenInfo === "function") onOpenInfo();
    });
  }

  render();
  container.appendChild(root);

  function update() {
    render();
  }

  function unmount() {
    root.remove();
  }

  return { unmount, update, el: root };
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

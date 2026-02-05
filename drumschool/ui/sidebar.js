// ui/sidebar.js

export function mountSidebar({ container, state }) {
  const root = document.createElement("aside");
  root.className = "sidebar";

  const username = (state.player?.name || "Player").trim();
  const avatarSrc =
    state.player?.avatarSrc ||
    "./assets/img/avatars/ds_avatar_rockbunny.png";

  root.innerHTML = `
    <div class="sidebar-inner">
      <div class="sidebar-logo">
        <img src="./assets/img/logo.png" alt="Drum School Logo" />
      </div>

      <div class="sidebar-player">
        <div class="sidebar-avatar">
          <img src="${avatarSrc}" alt="Player avatar" />
        </div>
        <div class="sidebar-name">
          ${escapeHtml(username)}
        </div>
      </div>
    </div>
  `;

  container.appendChild(root);

  function unmount() {
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

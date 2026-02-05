// ui/backpack.js
export function openBackpack({
  state,
  onClose
} = {}) {
  const overlay = document.createElement("div");
  overlay.className = "dsModalOverlay";

  const tabs = [
    { id: "avatars", label: "Avatars" },
    { id: "drums", label: "Drums" },
    { id: "teachers", label: "Teachers" },
    { id: "music", label: "Music" }
  ];

  let activeTab = "avatars";

  overlay.innerHTML = `
    <div class="dsModalCard dsBackpackCard" role="dialog" aria-modal="true">
      <div class="dsBackpackHeader">
        <div class="dsBackpackTitle">Backpack</div>
        <button class="dsIconBtn" type="button" data-action="close" aria-label="Close">✖️</button>
      </div>

      <div class="dsBackpackTabs">
        ${tabs.map(t => `
          <button class="dsTabBtn" type="button" data-tab="${t.id}">${t.label}</button>
        `).join("")}
      </div>

      <div class="dsBackpackBody">
        <div class="dsBackpackGrid" id="dsBackpackGrid"></div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const grid = overlay.querySelector("#dsBackpackGrid");

  function getUnlockSet(key) {
    // Later you can store: state.unlocks = { avatars: {...}, drums: {...} }
    // For now: basic demo fallback.
    return state.unlocks?.[key] || {};
  }

  function renderGrid() {
    const unlocks = getUnlockSet(activeTab);

    // Demo items per tab for now.
    // You can replace these with real data later.
    const items = getItemsForTab(activeTab);

    grid.innerHTML = items.map((it) => {
      const isUnlocked = !!unlocks[it.id] || it.defaultUnlocked;
      return `
        <button class="dsItemTile ${isUnlocked ? "unlocked" : "locked"}" type="button" data-item="${it.id}">
          <div class="dsItemThumbWrap">
            ${it.img ? `<img class="dsItemThumb" src="${escapeAttr(it.img)}" alt="">` : `<div class="dsItemThumbPh">?</div>`}
            ${isUnlocked ? "" : `<div class="dsItemLock">🔒</div>`}
          </div>
          <div class="dsItemName">${escapeHtml(it.name)}</div>
        </button>
      `;
    }).join("");

    // Click behavior: only apply selection when unlocked
    grid.querySelectorAll(".dsItemTile").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-item");
        const item = items.find(x => x.id === id);
        const isUnlocked = !!unlocks[id] || item?.defaultUnlocked;

        if (!isUnlocked) return;

        // Example selection: store chosen avatar
        if (activeTab === "avatars" && item?.img) {
          state.player = state.player || {};
          state.player.avatarSrc = item.img;
          // Persist if you already do local storage
          try {
            localStorage.setItem("drumSchoolState", JSON.stringify(state));
          } catch (_) {}
        }

        // Visual feedback
        flash(btn);
      });
    });
  }

  function setActiveTab(tabId) {
    activeTab = tabId;
    overlay.querySelectorAll(".dsTabBtn").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-tab") === tabId);
    });
    renderGrid();
  }

  overlay.querySelector('[data-action="close"]').addEventListener("click", () => close());
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelectorAll(".dsTabBtn").forEach((b) => {
    b.addEventListener("click", () => setActiveTab(b.getAttribute("data-tab")));
  });

  function close() {
    overlay.remove();
    if (typeof onClose === "function") onClose();
  }

  // init
  setActiveTab(activeTab);

  return { close };
}

function getItemsForTab(tab) {
  if (tab === "avatars") {
    return [
      { id: "rockbunny", name: "Rock Bunny", img: "./assets/img/avatars/ds_avatar_rockbunny.png", defaultUnlocked: true },
      { id: "lion", name: "Lion", img: "./assets/img/avatars/ds_avatar_lion.png", defaultUnlocked: true }
    ];
  }
  if (tab === "drums") {
    return [
      { id: "drum1", name: "Snare Pop", img: "", defaultUnlocked: true },
      { id: "drum2", name: "Big Boom", img: "", defaultUnlocked: false }
    ];
  }
  if (tab === "teachers") {
    return [
      { id: "t1", name: "Teacher 01", img: "./assets/img/drumteacher_01.png", defaultUnlocked: true },
      { id: "t2", name: "Teacher 02", img: "./assets/img/drumteacher_02.png", defaultUnlocked: false }
    ];
  }
  if (tab === "music") {
    return [
      { id: "m1", name: "Showtime Pop", img: "", defaultUnlocked: true },
      { id: "m2", name: "Galaxy Beat", img: "", defaultUnlocked: false }
    ];
  }
  return [];
}

function flash(el) {
  el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 220);
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

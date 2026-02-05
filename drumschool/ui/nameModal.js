// ui/nameModal.js
export function openNameModal({ initialName = "", onSave, onCancel } = {}) {
  const overlay = document.createElement("div");
  overlay.className = "modalOverlay";

  overlay.innerHTML = `
    <div class="modalCard" role="dialog" aria-modal="true">
      <div class="modalTitle">Hoe heet jij?</div>
      <div class="modalSub">Dit zetten we op jouw Drum School pasje.</div>

      <input class="modalInput" type="text" maxlength="18" placeholder="Bijv. Lotty" value="${escapeAttr(initialName)}" />

      <div class="modalActions">
        <button class="btn ghost" type="button" data-action="cancel">Later</button>
        <button class="btn primary" type="button" data-action="save">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const input = overlay.querySelector(".modalInput");
  input.focus();
  input.select();

  const cleanup = () => {
    overlay.remove();
    window.removeEventListener("keydown", onKeyDown);
  };

  const doCancel = () => {
    cleanup();
    if (typeof onCancel === "function") onCancel();
  };

  const doSave = () => {
    const name = (input.value || "").trim();
    cleanup();
    if (typeof onSave === "function") onSave(name);
  };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) doCancel();
  });

  overlay.querySelector('[data-action="cancel"]').addEventListener("click", doCancel);
  overlay.querySelector('[data-action="save"]').addEventListener("click", doSave);

  function onKeyDown(e) {
    if (e.key === "Escape") doCancel();
    if (e.key === "Enter") doSave();
  }
  window.addEventListener("keydown", onKeyDown);
}

function escapeAttr(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

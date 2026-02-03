export function openNameModal({ initialName = "", onSave, onCancel } = {}) {
  const overlay = document.createElement("div");
  overlay.className = "modalOverlay";
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <h3>Hoe heet jij?</h3>
      <p>Kies je naam. We onthouden dit op dit apparaat.</p>

      <div class="field">
        <input class="input" id="nameInput" type="text" placeholder="Bijv. Lot" maxlength="24" value="${escapeHtml(initialName)}" />
      </div>

      <div class="modalActions">
        <button class="btn ghost" id="cancelBtn">Later</button>
        <button class="btn primary" id="saveBtn">Start!</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const input = overlay.querySelector("#nameInput");
  const saveBtn = overlay.querySelector("#saveBtn");
  const cancelBtn = overlay.querySelector("#cancelBtn");

  input.focus();

  function close() {
    overlay.remove();
  }

  function doSave() {
    const name = String(input.value || "").trim();
    if (!name) {
      input.focus();
      input.style.borderColor = "rgba(255,45,149,0.8)";
      return;
    }
    close();
    if (typeof onSave === "function") onSave(name);
  }

  saveBtn.addEventListener("click", doSave);
  cancelBtn.addEventListener("click", () => {
    close();
    if (typeof onCancel === "function") onCancel();
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      close();
      if (typeof onCancel === "function") onCancel();
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSave();
    if (e.key === "Escape") {
      close();
      if (typeof onCancel === "function") onCancel();
    }
  });

  return { close };
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ui/practice.js
// TODO: hier hang je jouw bestaande metronoom/beat module in.
// Voor nu: simpele placeholder met 2 knoppen.

export function mountPractice({ container, level, onShowtime, onBack } = {}) {
  const root = document.createElement("div");
  root.className = "screen practiceScreen dots";

  root.innerHTML = `
    <div class="practiceHeader">
      <div class="practiceTitle">${escapeHtml(level?.title || "Practice")}</div>
      <div class="practiceBtns">
        <button class="btn ghost" id="backBtn">Back</button>
        <button class="btn orange" id="showtimeBtn">Showtime!</button>
      </div>
    </div>

    <div class="practiceBody">
      <div class="practiceCard">
        <div style="font-weight:900; font-size:18px; margin-bottom:10px;">Practice module placeholder</div>
        <div style="opacity:.8; font-weight:700;">
          Plak hier jouw bestaande metronoom/notes UI. <br>
          Level settings: BPM ${escapeHtml(level?.practice?.bpmDefault ?? "")}, hits ${escapeHtml(level?.practice?.hits ?? "")}
        </div>
      </div>
    </div>
  `;

  root.querySelector("#backBtn").addEventListener("click", () => onBack && onBack());
  root.querySelector("#showtimeBtn").addEventListener("click", () => onShowtime && onShowtime());

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

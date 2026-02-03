// ui/splash.js
export function mountSplash({ logoSrc = "./assets/img/logo.png", durationMs = 4000 } = {}) {
  const root = document.createElement("div");
  root.className = "splashScreen";

  root.innerHTML = `
    <div class="splashInner">
      <img class="splashLogo" src="${escapeAttr(logoSrc)}" alt="Drum School" />
      <div class="splashBar">
        <div class="splashBarFill"></div>
      </div>
      <div class="splashHint">Loading the groove…</div>
    </div>
  `;

  document.body.appendChild(root);

  const fill = root.querySelector(".splashBarFill");
  // animate progress fill exactly durationMs
  requestAnimationFrame(() => {
    fill.style.transitionDuration = `${durationMs}ms`;
    fill.style.width = "100%";
  });

  let doneResolve;
  const donePromise = new Promise((res) => (doneResolve = res));

  const timer = setTimeout(() => {
    doneResolve();
  }, durationMs);

  function destroy() {
    clearTimeout(timer);
    root.remove();
  }

  function waitDone() {
    return donePromise;
  }

  return { waitDone, destroy };
}

function escapeAttr(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

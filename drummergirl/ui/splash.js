export function mountSplash({ logoSrc = "/assets/img/logo.png", durationMs = 5000 } = {}) {
  const el = document.createElement("div");
  el.className = "splash";
  el.innerHTML = `
    <div class="splashInner">
      <img class="splashLogo" src="${logoSrc}" alt="Drummer Girl" />
      <div class="loadingTrack" aria-label="Loading">
        <div class="loadingBar"></div>
      </div>
      <div class="loadingText">Loading drums…</div>
    </div>
  `;

  document.body.appendChild(el);

  function destroy() {
    el.remove();
  }

  function waitDone() {
    return new Promise((resolve) => {
      setTimeout(() => resolve(), durationMs);
    });
  }

  return { destroy, waitDone };
}

export function mountMap({ container, state, onEditName } = {}) {
  const el = document.createElement("div");
  el.className = "screen";

  const playerName = (state?.player?.name || "").trim();
  const greeting = playerName ? `Hi ${playerName}!` : "Hi drummer!";

  el.innerHTML = `
    <div class="topbar">
      <div class="brand">
        <div class="brandMark" aria-hidden="true"></div>
        <div class="brandTitle">
          <h1>Drummer Girl</h1>
          <div>${greeting} Ready for a level?</div>
        </div>
      </div>
      <button class="btn alt" id="nameBtn">${playerName ? "Naam wijzigen" : "Naam kiezen"}</button>
    </div>

    <div class="mapHeader">
      <div>
        <h2>World 1: Big Beats</h2>
        <div class="sub">Begin super simpel. 1 idee per level.</div>
      </div>
      <div class="sub">Progress: (later)</div>
    </div>

    <div class="tileGrid" id="grid"></div>

    <div class="footerNote">
      Dit is nog de nieuwe basis. Hierna bouwen we: levels uit JSON, chat-intro, practice en exam flow.
    </div>
  `;

  const grid = el.querySelector("#grid");
  const nameBtn = el.querySelector("#nameBtn");

  nameBtn.addEventListener("click", () => {
    if (typeof onEditName === "function") onEditName();
  });

  // Dummy tiles
  const tiles = [
    { id:"w1-1", name:"1. Clap the Beat", desc:"Alleen 1–2–3–4.", locked:false },
    { id:"w1-2", name:"2. Right Hand Hero", desc:"Eerst 1 hand.", locked:true },
    { id:"w1-3", name:"3. Left Hand Legend", desc:"Andere hand.", locked:true },
    { id:"w1-4", name:"4. R L R L", desc:"Om en om.", locked:true },
  ];

  tiles.forEach(t => {
    const tile = document.createElement("div");
    tile.className = "tile" + (t.locked ? " locked" : "");
    tile.innerHTML = `
      <div class="name">${t.name}</div>
      <div class="desc">${t.desc}</div>
      <div class="desc">${t.locked ? "Locked" : "Tap to open (later)"}</div>
    `;
    grid.appendChild(tile);
  });

  container.appendChild(el);

  function unmount() {
    el.remove();
  }

  return { unmount };
}

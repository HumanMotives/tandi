let ARTICLES = [];
let CURRENT_INDEX = 0;

function articleUrl(id) {
  // voor nu fake url. later kun je echte route/hash gebruiken.
  return `${location.origin}${location.pathname}#article/${id}`;
}

window.initHome = async function () {
  const hero = document.getElementById("homeHero");
  const list = document.getElementById("homeList");
  if (!ARTICLES.length) return;

  const a = ARTICLES[0];

  hero.innerHTML = `
    <img src="${a.heroImage}" alt="">
    <div class="hero-inner">
      <div class="hero-kicker"><span class="dot"></span> Laatste editie</div>
      <div class="hero-title">${a.title}</div>
      <div class="hero-sub">${a.excerpt}</div>
      <div style="margin-top:6px;">
        <button class="btn btn-primary" id="readHeroBtn">Lees artikel</button>
      </div>
    </div>
  `;

  document.getElementById("readHeroBtn").onclick = () => {
    CURRENT_INDEX = 0;
    loadRoute("article");
  };

  list.innerHTML = ARTICLES.slice(1).map((x, idx) => `
    <div class="card">
      <div class="row">
        <div class="thumb"><img src="${x.thumbImage}" alt=""></div>
        <div class="row-main">
          <div class="h3">${x.title}</div>
          <div class="p">${x.excerpt}</div>
          <div class="meta">
            <span>${x.author} • ${x.readTime}</span>
            <button class="link" data-open="${idx+1}">Lees</button>
          </div>
        </div>
      </div>
    </div>
  `).join("");

  list.querySelectorAll("[data-open]").forEach(btn => {
    btn.addEventListener("click", () => {
      CURRENT_INDEX = Number(btn.dataset.open);
      loadRoute("article");
    });
  });
};

window.initArticles = async function () {
  const list = document.getElementById("articlesList");
  list.innerHTML = ARTICLES.map((x, idx) => `
    <div class="card">
      <div class="row">
        <div class="thumb"><img src="${x.thumbImage}" alt=""></div>
        <div class="row-main">
          <div class="h3">${x.title}</div>
          <div class="p">${x.excerpt}</div>
          <div class="meta">
            <span>${x.date} • ${x.readTime}</span>
            <button class="link" data-open="${idx}">Lees</button>
          </div>
        </div>
      </div>
    </div>
  `).join("");

  list.querySelectorAll("[data-open]").forEach(btn => {
    btn.addEventListener("click", () => {
      CURRENT_INDEX = Number(btn.dataset.open);
      loadRoute("article");
    });
  });
};

window.initArticle = async function () {
  const a = ARTICLES[CURRENT_INDEX] || ARTICLES[0];

  document.getElementById("articleHero").innerHTML = `<img src="${a.heroImage}" alt="">`;
  document.getElementById("articleTitle").textContent = a.title;
  document.getElementById("articleMeta").textContent = `${a.author} • ${a.date} • ${a.readTime}`;

  document.getElementById("articleBody").innerHTML =
    (a.body || []).map(p => `<p>${p}</p>`).join("");

  document.getElementById("shareArticleBtn").onclick = () => {
    shareText({
      title: a.title,
      text: a.excerpt,
      url: articleUrl(a.id)
    });
  };

  document.getElementById("nextArticleBtn").onclick = () => {
    CURRENT_INDEX = (CURRENT_INDEX + 1) % ARTICLES.length;
    loadRoute("article");
  };
};

function wireTabs() {
  document.querySelectorAll("[data-route]").forEach(el => {
    el.addEventListener("click", (e) => {
      const route = el.dataset.route;
      if (!route) return;
      loadRoute(route);
    });
  });

  // topbar share (app-level)
  document.getElementById("shareAppBtn").addEventListener("click", () => {
    shareText({
      title: "De Pionier – Jong Nederland",
      text: "Prototype van De Pionier (digitaal magazine).",
      url: location.href
    });
  });
}

async function boot() {
  // Splash animatie
  const splashBar = document.getElementById("splashBar");
  setTimeout(() => splashBar.style.width = "35%", 100);
  setTimeout(() => splashBar.style.width = "70%", 450);
  setTimeout(() => splashBar.style.width = "100%", 900);

  ARTICLES = await loadArticles();

  setTimeout(() => {
    document.getElementById("splash").style.display = "none";
    document.getElementById("app").classList.remove("hidden");
    wireTabs();
    loadRoute("home");
  }, 1200);
}

boot();

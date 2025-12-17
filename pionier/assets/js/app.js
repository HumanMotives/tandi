let ARTICLES = [];
let CURRENT_INDEX = 0;
let COVER_INDEX = 0;

function articleUrl(id) {
  return `${location.origin}${location.pathname}#article/${id}`;
}

function formatMeta(a) {
  return `${a.date} • ${a.author}`;
}

function renderCover(index) {
  const a = ARTICLES[index];
  const slide = document.getElementById("coverSlide");
  if (!a || !slide) return;

  const safeTitle = (a.title || "").replace(/\n/g, "<br>");

  slide.innerHTML = `
    <div class="cover-bg">
      <img src="${a.heroImage}" alt="">
    </div>
    <div class="cover-gradient"></div>
    <div class="cover-inner">
      <div class="cover-mark">
        <img class="cover-logo" src="./assets/logowhite.png" alt="De Pionier">
        <div class="cover-brand">DE PIONIER</div>
      </div>
      <div class="cover-title">${safeTitle}</div>
      <div class="cover-sub">${a.excerpt || ""}</div>
    </div>
  `;

  const dots = document.getElementById("coverDots");
  if (dots) {
    dots.innerHTML = ARTICLES.map((_, i) => `
      <div class="dot ${i === index ? "active" : ""}" data-dot="${i}"></div>
    `).join("");

    dots.querySelectorAll("[data-dot]").forEach(d => {
      d.addEventListener("click", () => {
        COVER_INDEX = Number(d.dataset.dot);
        renderCover(COVER_INDEX);
      });
    });
  }
}

function nextCover(dir) {
  if (!ARTICLES.length) return;
  const n = ARTICLES.length;
  COVER_INDEX = (COVER_INDEX + dir + n) % n;
  renderCover(COVER_INDEX);
}

function wireCoverSwipe() {
  const cover = document.getElementById("cover");
  if (!cover) return;

  let startX = 0;
  let active = false;

  const onStart = (x) => { startX = x; active = true; };
  const onEnd = (x) => {
    if (!active) return;
    active = false;
    const dx = x - startX;
    if (Math.abs(dx) < 45) return;
    if (dx < 0) nextCover(1);
    else nextCover(-1);
  };

  cover.addEventListener("touchstart", (e) => onStart(e.touches[0].clientX), { passive: true });
  cover.addEventListener("touchend", (e) => onEnd(e.changedTouches[0].clientX));

  cover.addEventListener("mousedown", (e) => onStart(e.clientX));
  cover.addEventListener("mouseup", (e) => onEnd(e.clientX));
}

window.initHome = async function () {
  if (!ARTICLES.length) return;

  renderCover(COVER_INDEX);
  wireCoverSwipe();

  const btn = document.getElementById("coverReadBtn");
  if (btn) {
    btn.onclick = () => {
      CURRENT_INDEX = COVER_INDEX;
      loadRoute("article");
    };
  }

  const list = document.getElementById("homeList");
  if (list) {
    const rest = ARTICLES.slice(0);
    list.innerHTML = rest.map((x, idx) => `
      <div class="card">
        <div class="row">
          <div class="thumb"><img src="${x.thumbImage}" alt=""></div>
          <div class="row-main">
            <div class="h3">${(x.title || "").replace(/\n/g, " ")}</div>
            <div class="p">${x.excerpt || ""}</div>
            <div class="meta">
              <span>${x.date} • ${x.readTime || ""}</span>
              <button class="link" data-open="${idx}">Lees meer</button>
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
  }
};

window.initArticles = async function () {
  const view = document.getElementById("view");
  const list = document.getElementById("articlesList");
  if (!list) return;

  list.innerHTML = ARTICLES.map((x, idx) => `
    <div class="card">
      <div class="row">
        <div class="thumb"><img src="${x.thumbImage}" alt=""></div>
        <div class="row-main">
          <div class="h3">${(x.title || "").replace(/\n/g, " ")}</div>
          <div class="p">${x.excerpt || ""}</div>
          <div class="meta">
            <span>${x.date} • ${x.readTime || ""}</span>
            <button class="link" data-open="${idx}">Lees meer</button>
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
  if (!a) return;

  const cover = document.getElementById("articleCover");
  if (cover) {
    const safeTitle = (a.title || "").replace(/\n/g, "<br>");
    cover.innerHTML = `
      <img src="${a.heroImage}" alt="">
      <div class="cover-gradient"></div>
      <div class="cover-inner">
        <div class="cover-mark">
          <img class="cover-logo" src="./assets/logowhite.png" alt="De Pionier">
          <div class="cover-brand">DE PIONIER</div>
        </div>
        <div class="cover-title">${safeTitle}</div>
        <div class="cover-sub">${a.excerpt || ""}</div>
      </div>
    `;
  }

  const meta = document.getElementById("articleMeta");
  if (meta) meta.textContent = formatMeta(a);

  const quote = document.getElementById("articleQuote");
  if (quote) quote.textContent = a.quote || "";

  const body = document.getElementById("articleBody");
  if (body) {
    body.innerHTML = (a.body || []).map(p => `<p>${p}</p>`).join("");
  }

  const shareBtn = document.getElementById("shareArticleBtn");
  if (shareBtn) {
    shareBtn.onclick = () => {
      shareText({
        title: (a.title || "").replace(/\n/g, " "),
        text: a.excerpt || "",
        url: articleUrl(a.id)
      });
    };
  }

  const nextBtn = document.getElementById("nextArticleBtn");
  if (nextBtn) {
    nextBtn.onclick = () => {
      CURRENT_INDEX = (CURRENT_INDEX + 1) % ARTICLES.length;
      loadRoute("article");
    };
  }

  const likeBtn = document.getElementById("likeBtn");
  if (likeBtn) {
    likeBtn.onclick = () => {
      likeBtn.classList.toggle("active");
    };
  }
};

function wireTabs() {
  document.querySelectorAll("[data-route]").forEach(el => {
    el.addEventListener("click", (e) => {
      const route = el.dataset.route;
      if (!route) return;
      loadRoute(route);
    });
  });

  const shareAppBtn = document.getElementById("shareAppBtn");
  if (shareAppBtn) {
    shareAppBtn.addEventListener("click", () => {
      shareText({
        title: "De Pionier – Jong Nederland",
        text: "Prototype van De Pionier (digitaal bulletin).",
        url: location.href
      });
    });
  }
}

async function boot() {
  const splashBar = document.getElementById("splashBar");
  const splash = document.getElementById("splash");
  const app = document.getElementById("app");

  setTimeout(() => splashBar.style.width = "20%", 300);
  setTimeout(() => splashBar.style.width = "45%", 900);
  setTimeout(() => splashBar.style.width = "65%", 1700);
  setTimeout(() => splashBar.style.width = "85%", 2600);
  setTimeout(() => splashBar.style.width = "100%", 3600);

  ARTICLES = await loadArticles();

  setTimeout(() => {
    splash.style.display = "none";
    app.classList.remove("hidden");
    wireTabs();
    loadRoute("home");
  }, 4000);
}

boot();

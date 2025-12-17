const routes = {
  home: "./pages/home.html",
  articles: "./pages/articles.html",
  article: "./pages/article.html",
  poll: "./pages/poll.html",
  badges: "./pages/badges.html",
  colofon: "./pages/colofon.html"
};

async function loadRoute(routeName) {
  const view = document.getElementById("view");
  const path = routes[routeName] || routes.home;
  const html = await (await fetch(path)).text();
  view.innerHTML = html;

  document.querySelectorAll(".tab").forEach(t => {
    t.classList.toggle("active", t.dataset.route === routeName);
  });

  // Page init hooks
  if (routeName === "home") window.initHome?.();
  if (routeName === "articles") window.initArticles?.();
  if (routeName === "article") window.initArticle?.();
}

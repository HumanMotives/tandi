async function loadArticles() {
  const res = await fetch("./data/articles.json");
  const json = await res.json();
  return json.articles || [];
}

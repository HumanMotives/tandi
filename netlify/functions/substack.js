<script>
(async function loadSubstack() {
  const list = document.getElementById("substack-list");
  try {
    const res = await fetch("/.netlify/functions/substack");
    if (!res.ok) throw new Error("Feed fetch failed");
    const xmlText = await res.text();

    const doc = new DOMParser().parseFromString(xmlText, "application/xml");
    const items = Array.from(doc.querySelectorAll("item")).slice(0, 5);

    if (!items.length) {
      list.innerHTML = '<li class="substack-post"><em>No posts yet.</em></li>';
      return;
    }

    const html = items.map((item) => {
      const title = item.querySelector("title")?.textContent?.trim() || "Untitled";
      const link = item.querySelector("link")?.textContent?.trim() || "#";
      const pubDate = item.querySelector("pubDate")?.textContent || "";
      const dateStr = pubDate ? new Date(pubDate).toLocaleDateString() : "";

      // Full body or description
      const fullNode = item.getElementsByTagName("content:encoded")[0];
      const raw = (fullNode?.textContent || item.querySelector("description")?.textContent || "").trim();

      // Try to extract first image
      let image = "";
      const imgMatch = raw.match(/<img[^>]+src="([^">]+)"/i);
      if (imgMatch && imgMatch[1]) {
        image = imgMatch[1];
      }

      // Strip HTML → snippet
      const textOnly = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      const snippet = textOnly.length > 160 ? textOnly.slice(0, 160) + "…" : textOnly;

      return `
        <li class="substack-post">
          ${image ? `<a href="${link}" target="_blank" rel="noopener"><img src="${image}" alt="" class="substack-image"></a>` : ""}
          <h3 class="substack-title"><a href="${link}" target="_blank" rel="noopener">${title}</a></h3>
          ${dateStr ? `<time class="substack-meta" datetime="${new Date(pubDate).toISOString()}">${dateStr}</time>` : ""}
          ${snippet ? `<p class="substack-snippet">${snippet}</p>` : ""}
          <p class="substack-read"><a href="${link}" target="_blank" rel="noopener">Read on Substack →</a></p>
        </li>
      `;
    }).join("");

    list.innerHTML = html;
  } catch (e) {
    console.error(e);
    list.innerHTML = '<li class="substack-post"><em>Couldn’t load notes right now.</em></li>';
  }
})();
</script>

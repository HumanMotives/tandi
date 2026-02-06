// levels/loadLesson.js

export async function loadLesson(levelId) {
  if (!levelId) throw new Error("loadLesson: levelId ontbreekt.");

  // Dit maakt het pad robuust onder /drumschool/ (GitHub Pages / Netlify subfolder deploy)
  // Verwacht: /drumschool/levels/W1-L1.json
  const url = new URL(`../levels/${encodeURIComponent(levelId)}.json`, import.meta.url);

  let res;
  try {
    res = await fetch(url.href, { cache: "no-store" });
  } catch (e) {
    throw new Error(`Lesson JSON fetch faalde: ${url.href}`);
  }

  if (!res.ok) {
    throw new Error(`Lesson JSON niet gevonden: ${url.pathname} (${res.status})`);
  }

  const json = await res.json();
  if (!json || typeof json !== "object") {
    throw new Error(`Lesson JSON ongeldig: ${url.pathname}`);
  }

  return json;
}

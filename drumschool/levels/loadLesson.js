// levels/loadLesson.js
export async function loadLesson(lessonKey) {
  const key = String(lessonKey || "").trim();
  if (!key) throw new Error("Missing lessonKey");

  // Resolves correctly for:
  // - https://domain.com/drumschool/
  // - https://domain.com/drumschool/index.html
  // - localhost
  const base = new URL("./", window.location.href);
  const url = new URL(`levels/${encodeURIComponent(key)}.json`, base).toString();

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Lesson JSON niet gevonden: ${url} (${res.status})`);
  }
  return await res.json();
}

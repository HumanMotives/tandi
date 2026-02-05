// levels/loadLesson.js
export async function loadLesson(lessonKey) {
  const key = String(lessonKey || "").trim();
  if (!key) throw new Error("Missing lessonKey");

  // Works for:
  // - http://localhost:.../drumschool/
  // - https://humanmotives.org/drumschool/
  // and also if you ever deploy at domain root.
  const base = new URL("./", window.location.href); // directory of current page
  const url = new URL(`levels/${encodeURIComponent(key)}.json`, base).toString();

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Lesson JSON niet gevonden: ${url} (${res.status})`);
  }

  return await res.json();
}

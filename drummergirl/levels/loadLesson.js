// src/drummergirl/levels/loadLesson.js
export async function loadLesson(lessonId) {
  const url = `./drummergirl/levels/${encodeURIComponent(lessonId)}.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Lesson JSON niet gevonden: ${url} (${res.status})`);
  return await res.json();
}

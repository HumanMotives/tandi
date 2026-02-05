// levels/loadLesson.js
export async function loadLesson(lessonKey) {
  const key = String(lessonKey || "").trim();
  if (!key) throw new Error("Missing lessonKey");

  const url = `/levels/${encodeURIComponent(key)}.json`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const msg = `Lesson JSON niet gevonden: ${url} (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.url = url;
    throw err;
  }

  const data = await res.json();
  return data;
}

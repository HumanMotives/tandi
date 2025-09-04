// netlify/functions/substack.js
export async function handler() {
  const FEED_URL = process.env.SUBSTACK_FEED_URL || "https://YOUR-HANDLE.substack.com/feed";
  try {
    const res = await fetch(FEED_URL);
    if (!res.ok) {
      return { statusCode: res.status, body: `Feed fetch failed (${res.status})` };
    }
    const xml = await res.text();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/xml", "Access-Control-Allow-Origin": "*" },
      body: xml,
    };
  } catch (err) {
    return { statusCode: 500, body: `Error: ${err.message}` };
  }
}

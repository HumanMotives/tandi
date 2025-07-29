async function fetchRandomTitle() {
  // adjust this URL to wherever your Pitchdork API lives
  const res = await fetch('/api/generate-title', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'Generate a poetic radio show title in 3–5 words'
    })
  });
  const { title } = await res.json();
  document.getElementById('title-text').textContent = title;
}

// When includes are in place...
document.getElementById('generate-title').addEventListener('click', fetchRandomTitle);

// Optionally fetch one at startup:
fetchRandomTitle();

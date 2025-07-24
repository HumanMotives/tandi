// netlify/functions/generate-review.js
exports.handler = async (event) => {
  try {
    const { spotifyUrl } = JSON.parse(event.body);

    // ——— Step 1: Fetch Spotify metadata ———
    const id = spotifyUrl.split('/').pop().split('?')[0];
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const { access_token } = await tokenRes.json();
    const isAlbum = spotifyUrl.includes('/album/');
    const endpoint = isAlbum ? 'albums' : 'tracks';
    const infoRes = await fetch(
      `https://api.spotify.com/v1/${endpoint}/${id}`,
      { headers: { Authorization: 'Bearer ' + access_token } }
    );
    const info = await infoRes.json();

    // ——— Step 2: Build the “brutal” prompt ———
    const title = info.name;
    const artist = (info.artists || [])[0]?.name || 'Unknown Artist';
    const artImages = isAlbum
      ? info.images
      : info.album?.images || [];
    const artUrl = artImages[0]?.url || '';

    const prompt = `
You are a savage, irreverent music critic. 
Write a short, punchy, brutal one-paragraph roast of the ${isAlbum ? 'album' : 'track'}
"${title}" by ${artist}. Feel free to use casual swears or absurd insults (“This auditory vomit-fest…”, “Why his mom ever said he was good at singing”). 
At the end, on its own line, include "Score: X" where X is any number—even as low as zero point one. No other commentary. Aim to avoid repeating the same puns and methapors`;

    // ——— Step 3: Call OpenAI’s REST API ———
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.9,      // high creativity
        top_p: 0.9,
      }),
    });
    const aiJson = await aiRes.json();
    if (aiJson.error) throw new Error(aiJson.error.message);

    const text = aiJson.choices[0].message.content.trim();

    // ——— Step 4: Extract the score ———
    // Look for a line like "Score: -35" or "Score: 2"
    const scoreMatch = text.match(/Score:\s*(-?\d+(\.\d+)?)/i);
    const score = scoreMatch ? scoreMatch[1] : '–';

    // ——— Step 5: Strip out the "Score:" line from the review ———
    const review = text.replace(/Score:\s*-?\d+(\.\d+)?/i, '').trim();

    return {
      statusCode: 200,
      body: JSON.stringify({
        artUrl,
        title: `${title} by ${artist}`,
        review,
        rating: score,
      }),
    };
  } catch (err) {
    console.error('Error in generate-review:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

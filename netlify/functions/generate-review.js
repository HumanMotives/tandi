// netlify/functions/generate-review.js
exports.handler = async (event) => {
  try {
    const { spotifyUrl } = JSON.parse(event.body);
    const id = spotifyUrl.split('/').pop().split('?')[0];

    // 1) Get Spotify token
    const tokenRes = await fetch(
      'https://accounts.spotify.com/api/token',
      {
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
      }
    );
    const { access_token } = await tokenRes.json();

    // 2) Fetch album or track info
    const isAlbum = spotifyUrl.includes('/album/');
    const endpoint = isAlbum ? 'albums' : 'tracks';
    const infoRes = await fetch(
      `https://api.spotify.com/v1/${endpoint}/${id}`,
      { headers: { Authorization: 'Bearer ' + access_token } }
    );
    const info = await infoRes.json();

    // 3) Fetch artist genres
    const artistId = info.artists[0].id;
    const artistRes = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}`,
      { headers: { Authorization: 'Bearer ' + access_token } }
    );
    const artistInfo = await artistRes.json();
    const genres = artistInfo.genres || [];

    // 4) If it's a track, fetch audio features
    let features = null;
    if (!isAlbum) {
      const featRes = await fetch(
        `https://api.spotify.com/v1/audio-features/${id}`,
        { headers: { Authorization: 'Bearer ' + access_token } }
      );
      features = await featRes.json();
    }

    // 5) Build a fact‐packed prompt
    const title = info.name;
    const artistName = artistInfo.name;
    const popularity = info.popularity; // 0–100
    const featureText = features
      ? `It clocks in at ${features.tempo.toFixed(0)} BPM with danceability ${features.danceability.toFixed(2)}, energy ${features.energy.toFixed(2)}, valence ${features.valence.toFixed(2)}.`
      : '';
    const genreText =
      genres.length > 0
        ? `Genres: ${genres.slice(0, 3).join(', ')}.`
        : '';

    const prompt = `
You are a ruthless, hilarious music critic.  
Facts: "${title}" by ${artistName}, popularity ${popularity}/100.  
${genreText}  
${featureText}  

Write a **short**, **punchy**, **brutal** one‐paragraph roast.  
Feel free to drop casual swears and absurd insults (e.g. “absolute turd-fest”, “did your mom green-light this?”).  
Then on its own line put “Score: X” where X can be any integer, even negative (down to –50).  
No other filler.
`;

    // 6) Call OpenAI
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
        temperature: 0.9,
        top_p: 0.9,
      }),
    });
    const aiJson = await aiRes.json();
    if (aiJson.error) throw new Error(aiJson.error.message);

    // 7) Parse result
    const text = aiJson.choices[0].message.content.trim();
    const scoreMatch = text.match(/Score:\s*(-?\d+)/i);
    const score = scoreMatch ? scoreMatch[1] : '–';
    const review = text.replace(/Score:\s*-?\d+/i, '').trim();

    // 8) Pick image URL
    const images = isAlbum
      ? info.images
      : info.album?.images || [];
    const artUrl = images[0]?.url || '';

    return {
      statusCode: 200,
      body: JSON.stringify({
        artUrl,
        title: `${title} by ${artistName}`,
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

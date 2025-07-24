// netlify/functions/generate-review.js

// No SDK imports—use global fetch
exports.handler = async (event) => {
  try {
    const { spotifyUrl } = JSON.parse(event.body);

    // 1) Fetch Spotify data
    const id = spotifyUrl.split('/').pop().split('?')[0];
    // Get Spotify token
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
    // Determine album vs track
    const isAlbum = spotifyUrl.includes('/album/');
    const endpoint = isAlbum ? 'albums' : 'tracks';
    const infoRes = await fetch(
      `https://api.spotify.com/v1/${endpoint}/${id}`,
      { headers: { Authorization: 'Bearer ' + access_token } }
    );
    const info = await infoRes.json();

    // 2) Build prompt
    const title = info.name;
    const artist = (info.artists || [])[0]?.name || 'Unknown Artist';
    const prompt = `
Write a snarky, Pitchfork-style review of the ${isAlbum ? 'album' : 'track'}
"${title}" by ${artist}. End with "Rating: X.X/10".`;

    // 3) Call OpenAI REST endpoint
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.8,
      }),
    });
    const aiData = await aiRes.json();
    if (aiData.error) throw new Error(aiData.error.message);

    const text = aiData.choices[0].message.content.trim();
    // 4) Extract rating & review
    const ratingMatch = text.match(/Rating:\s*([0-9]\.?[0-9]?)/i);
    const rating = ratingMatch ? ratingMatch[1] : '–';
    const review = text.replace(/Rating:\s*[0-9]\.?[0-9]?\/?10?$/i, '').trim();

    // 5) Get artwork
    const images = isAlbum ? info.images : info.album?.images || [];
    const artUrl = images[0]?.url || '';

    return {
      statusCode: 200,
      body: JSON.stringify({
        artUrl,
        title: `${title} by ${artist}`,
        review,
        rating,
      }),
    };
  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

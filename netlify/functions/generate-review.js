// netlify/functions/generate-review.js
const { Configuration, OpenAIApi } = require('openai');

// Init OpenAI
const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

async function fetchSpotify(spotifyUrl) {
  const id = spotifyUrl.split('/').pop().split('?')[0];

  // 1) Get a token
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

  // 2) Fetch either album or track
  const isAlbum = spotifyUrl.includes('/album/');
  const endpoint = isAlbum ? 'albums' : 'tracks';
  const infoRes = await fetch(
    `https://api.spotify.com/v1/${endpoint}/${id}`,
    { headers: { Authorization: 'Bearer ' + access_token } }
  );
  const info = await infoRes.json();
  return { info, isAlbum };
}

exports.handler = async (event) => {
  try {
    const { spotifyUrl } = JSON.parse(event.body);
    const { info, isAlbum } = await fetchSpotify(spotifyUrl);

    // Pick name/artist
    const title = info.name;
    const artist = (info.artists || [])[0]?.name || 'Unknown Artist';

    // Artwork lives on info.images for albums, info.album.images for tracks
    const images = isAlbum
      ? info.images
      : info.album?.images || [];
    const artUrl = images[0]?.url || '';

    // Build our snarky prompt
    const prompt = `
Write a snarky, Pitchfork-style review of the ${isAlbum ? 'album' : 'track'}
"${title}" by ${artist}. End with "Rating: X.X/10".`;

    // Call OpenAI
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.8,
    });

    const text = completion.data.choices[0].message.content.trim();

    // Extract rating (e.g. “Rating: 6.7/10”)
    const ratingMatch = text.match(/Rating:\s*([0-9]\.?[0-9]?)/i);
    const rating = ratingMatch ? ratingMatch[1] : '–';

    // Strip the rating line from the review
    const review = text.replace(/Rating:\s*[0-9]\.?[0-9]?\/?10?$/i, '').trim();

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

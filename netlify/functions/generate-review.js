const { Configuration, OpenAIApi } = require('openai');

// Initialize OpenAI client
const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

// Helper: fetch Spotify data using global fetch
async function fetchSpotify(spotifyUrl) {
  const id = spotifyUrl.split('/').pop().split('?')[0];
  // Get token
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' +
        Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const { access_token } = await tokenRes.json();

  // Fetch album or track
  const apiType = spotifyUrl.includes('/album/') ? 'albums' : 'tracks';
  const infoRes = await fetch(
    `https://api.spotify.com/v1/${apiType}/${id}`,
    { headers: { Authorization: 'Bearer ' + access_token } }
  );
  return infoRes.json();
}

exports.handler = async (event) => {
  try {
    const { spotifyUrl } = JSON.parse(event.body);
    const info = await fetchSpotify(spotifyUrl);

    const title = info.name;
    const artist = (info.artists || [])[0]?.name || '';
    const artUrl = info.images?.[0]?.url || '';

    const prompt = `
Write a snarky, Pitchfork-style review of the ${info.album_type || info.type}
"${title}" by ${artist}. Use pretentious irony, then finish with "Rating: X.X/10".
    `;

    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.8,
    });

    const text = completion.data.choices[0].message.content.trim();
    const match = text.match(/Rating:\s*([0-9]\.?[0-9]?)\/10$/m);
    const rating = match ? match[1] : '–';
    const review = text.replace(/Rating:\s*[0-9]\.?[0-9]?\/10$/, '').trim();

    return {
      statusCode: 200,
      body: JSON.stringify({ artUrl, title: `${title} by ${artist}`, review, rating }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

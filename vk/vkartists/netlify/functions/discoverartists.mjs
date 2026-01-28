export const config = {
  // Monthly on the 1st at 09:00 UTC
  schedule: "0 9 1 * *",
};

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function lastfmGetTopArtistsByTag({ tag, page = 1, limit = 50 }) {
  const apiKey = requiredEnv("LASTFM_API_KEY");
  const url = new URL("https://ws.audioscrobbler.com/2.0/");
  url.searchParams.set("method", "tag.gettopartists");
  url.searchParams.set("tag", tag);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("page", String(page));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Last.fm error: ${res.status} ${txt}`);
  }
  return res.json();
}

async function musicbrainzSearchArtist({ name }) {
  // Optional enrichment: get an MBID + URL for the artist name.
  // MB search is fuzzy; you’ll get better results if you refine later.
  const url = new URL("https://musicbrainz.org/ws/2/artist/");
  url.searchParams.set("query", `artist:"${name}"`);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: {
      // MusicBrainz requests a User-Agent identifying your app
      "User-Agent": "VOIDKULTUR-Leads/1.0 (contact: you@example.com)",
    },
  });

  if (!res.ok) return null;
  const json = await res.json();
  const hit = json?.artists?.[0];
  if (!hit?.id) return null;

  return {
    mbid: hit.id,
    musicbrainz_url: `https://musicbrainz.org/artist/${hit.id}`,
  };
}

async function supabaseUpsertLeads(leads) {
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  const res = await fetch(
    `${supabaseUrl}/rest/v1/artist_leads?on_conflict=source,lastfm_name`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(leads),
    }
  );

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase upsert error: ${res.status} ${txt}`);
  }
}

export default async function handler(event) {
  try {
    // Tune to your lane
    const tags = [
      "ebm",
      "electro-industrial",
      "industrial",
      "industrial techno",
      "dark electro",
      "aggrotech",
      "darkwave",
    ];

    // These are NOT followers. They are Last.fm “listeners” as a proxy.
    // Adjust after you see real output.
    const minListeners = 100;
    const maxListeners = 10000;

    const pagesPerTag = 3; // 3 pages * 50 = 150 artists per tag

    let kept = 0;
    let fetched = 0;

    for (const tag of tags) {
      for (let page = 1; page <= pagesPerTag; page++) {
        const data = await lastfmGetTopArtistsByTag({ tag, page, limit: 50 });
        const items = data?.topartists?.artist || [];
        fetched += items.length;

        const leads = [];
        for (const a of items) {
          const name = a?.name?.trim();
          if (!name) continue;

          const listeners = Number(a?.listeners ?? 0);
          const playcount = Number(a?.playcount ?? 0);

          if (listeners < minListeners || listeners > maxListeners) continue;

          // Optional MB enrichment (costs requests, keep modest)
          const mb = await musicbrainzSearchArtist({ name });

          leads.push({
            source: "lastfm",
            lastfm_name: name,
            lastfm_url: a?.url ?? null,
            listeners,
            playcount,
            mbid: mb?.mbid ?? null,
            musicbrainz_url: mb?.musicbrainz_url ?? null,
            tags: [tag],
            website_url: null,
            instagram_url: null,
            contact_email: null,
            notes: null,
          });
        }

        if (leads.length) {
          kept += leads.length;
          await supabaseUpsertLeads(leads);
        }

        // Stop if Last.fm says there are no more pages
        const totalPages = Number(data?.topartists?.["@attr"]?.totalPages ?? 1);
        if (page >= totalPages) break;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Discovery run complete (Last.fm + optional MusicBrainz)",
        fetched,
        kept_in_range: kept,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err?.message || err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

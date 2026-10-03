// Netlify Function op /vkminer/api/run
// GET  = status van de laatste run
// POST = nieuwe run starten (wachtwoord vereist)
// Nodig in Netlify (Site configuration → Environment variables):
//   GITHUB_TOKEN, GITHUB_REPO (bijv. chris/humanmotives), VKMINER_PASSWORD

export const config = { path: '/vkminer/api/run' };

const WORKFLOW = 'vkminer.yml';
const PRESETS = ['otr-scifi', 'ufo-interviews', 'bmovies', 'prelinger', 'custom'];
const MODELS = ['base.en', 'small.en', 'medium.en'];

const env = k => (globalThis.Netlify?.env?.get(k) ?? process.env[k] ?? '').trim();
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

function gh(path, init = {}) {
  return fetch(`https://api.github.com/repos/${env('GITHUB_REPO')}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env('GITHUB_TOKEN')}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'vkminer',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
}

async function latestRuns() {
  const r = await gh(`/actions/workflows/${WORKFLOW}/runs?per_page=5`);
  if (!r.ok) throw new Error(`GitHub gaf ${r.status}`);
  return (await r.json()).workflow_runs || [];
}

export default async (req) => {
  if (!env('GITHUB_TOKEN') || !env('GITHUB_REPO') || !env('VKMINER_PASSWORD')) {
    return json({ error: req.method === 'GET' ? 'not-configured' : 'Startknop is nog niet ingesteld in Netlify.' }, 500);
  }

  if (req.method === 'GET') {
    try {
      const run = (await latestRuns())[0];
      if (!run) return json({ run: null });
      return json({ run: {
        status: run.status, conclusion: run.conclusion, url: run.html_url,
        started: run.run_started_at || run.created_at, updated: run.updated_at,
      } });
    } catch (e) {
      return json({ error: e.message }, 502);
    }
  }

  if (req.method !== 'POST') return json({ error: 'Niet toegestaan.' }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Ongeldig verzoek.' }, 400); }
  if (!body || body.password !== env('VKMINER_PASSWORD')) return json({ error: 'Wachtwoord klopt niet.' }, 401);

  const i = body.inputs || {};
  const clamp = (v, lo, hi, d) => {
    const n = parseInt(v, 10);
    return String(Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d);
  };
  const inputs = {
    preset: PRESETS.includes(i.preset) ? i.preset : 'otr-scifi',
    query: String(i.query || '').slice(0, 300),
    max_items: clamp(i.max_items, 1, 20, 5),
    max_files: clamp(i.max_files, 1, 10, 3),
    whisper_model: MODELS.includes(i.whisper_model) ? i.whisper_model : 'base.en',
    pd_only: i.pd_only === false ? 'false' : 'true',
  };

  try {
    if ((await latestRuns()).some(r => r.status !== 'completed')) {
      return json({ error: 'Er loopt al een run. Wacht tot die klaar is.' }, 409);
    }
  } catch (e) {
    return json({ error: `GitHub niet bereikbaar: ${e.message}. Controleer token en reponaam.` }, 502);
  }

  const repo = await gh('');
  const ref = repo.ok ? (await repo.json()).default_branch : 'main';
  const r = await gh(`/actions/workflows/${WORKFLOW}/dispatches`, {
    method: 'POST', body: JSON.stringify({ ref, inputs }),
  });
  if (!r.ok) return json({ error: `GitHub weigerde de start (${r.status}). Controleer token en reponaam.` }, 502);
  return json({ ok: true });
};

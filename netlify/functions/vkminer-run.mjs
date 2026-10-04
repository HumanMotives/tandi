// Netlify Function op /vkminer/api/run
// GET  = status van de laatste runs
// POST = run starten: {kind: "run" | "cuts", request: {...}, password?}
// Nodig in Netlify (Site configuration → Environment variables):
//   GITHUB_TOKEN  token met Actions: Read and write op de repo
//   GITHUB_REPO   HumanMotives/tandi
//   VKMINER_PASSWORD  optioneel; als ingevuld moet de pagina dit meesturen

export const config = { path: '/vkminer/api/run' };

const WORKFLOWS = { run: 'vkminer.yml', cuts: 'vkminer-cuts.yml' };

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

async function ghError(r) {
  let msg = '';
  try { msg = (await r.json()).message || ''; } catch {}
  return `${r.status}${msg ? ': ' + msg : ''}`;
}

async function latest(kind) {
  const r = await gh(`/actions/workflows/${WORKFLOWS[kind]}/runs?per_page=3`);
  if (!r.ok) throw new Error(`${WORKFLOWS[kind]} gaf ${await ghError(r)}`);
  const run = ((await r.json()).workflow_runs || [])[0];
  return run ? {
    id: run.id, status: run.status, conclusion: run.conclusion, url: run.html_url,
    started: run.run_started_at || run.created_at, updated: run.updated_at,
  } : null;
}

export default async (req) => {
  if (!env('GITHUB_TOKEN') || !env('GITHUB_REPO')) {
    return json({ error: 'De startknop is nog niet ingesteld (GITHUB_TOKEN en GITHUB_REPO in Netlify).' }, 500);
  }
  const needsPassword = !!env('VKMINER_PASSWORD');

  if (req.method === 'GET') {
    try {
      const [run, cuts] = await Promise.all([latest('run'), latest('cuts').catch(() => null)]);
      return json({ needsPassword, run, cuts });
    } catch (e) {
      return json({ needsPassword, error: e.message }, 502);
    }
  }
  if (req.method !== 'POST') return json({ error: 'Niet toegestaan.' }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Ongeldig verzoek.' }, 400); }
  if (needsPassword && body?.password !== env('VKMINER_PASSWORD')) {
    return json({ error: 'Wachtwoord klopt niet.' }, 401);
  }
  const kind = body?.kind === 'cuts' ? 'cuts' : 'run';
  const request = JSON.stringify(body?.request || {});
  if (request.length > 20000) return json({ error: 'Verzoek is te groot.' }, 400);

  if (kind === 'run') {
    try {
      const r = await latest('run');
      if (r && r.status !== 'completed') return json({ error: 'Er loopt al een batch. Wacht tot die klaar is.' }, 409);
    } catch (e) {
      return json({ error: `GitHub: ${e.message}` }, 502);
    }
  }

  const repo = await gh('');
  const ref = repo.ok ? (await repo.json()).default_branch : (env('GITHUB_BRANCH') || 'main');
  const r = await gh(`/actions/workflows/${WORKFLOWS[kind]}/dispatches`, {
    method: 'POST', body: JSON.stringify({ ref, inputs: { request } }),
  });
  if (!r.ok) return json({ error: `GitHub weigerde de start (${WORKFLOWS[kind]} op ${ref}: ${await ghError(r)})` }, 502);
  return json({ ok: true });
};

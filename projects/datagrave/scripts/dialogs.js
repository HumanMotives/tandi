/* dialogs.js — loads dialog lines & gives no-repeat random picks */
(function () {
  const DEFAULT_URL = '/projects/datagrave/content/dialogs.json';
  console.log('[dialogs] init');

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function makeBag(key, items) {
    const LS_KEY = `dg:bag:${key}`;
    let bag = null;

    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (saved && Array.isArray(saved) && saved.every(i => typeof i === 'number')) {
        bag = saved.map(i => items[i]).filter(Boolean);
      }
    } catch {}

    if (!bag || bag.length === 0) {
      bag = shuffle(items);
      try {
        const idxs = bag.map(v => items.indexOf(v));
        localStorage.setItem(LS_KEY, JSON.stringify(idxs));
      } catch {}
    }

    return {
      next() {
        if (!bag.length) bag = shuffle(items);
        const val = bag.shift();
        try {
          const idxs = bag.map(v => items.indexOf(v));
          localStorage.setItem(LS_KEY, JSON.stringify(idxs));
        } catch {}
        return val;
      }
    };
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`dialogs fetch ${res.status}`);
    return res.json();
  }

  async function load(url = DEFAULT_URL) {
    if (window.__dgDialogs?.__ready) return window.__dgDialogs;
    console.log('[dialogs] loading from', url);
    const data = await fetchJSON(url);

    const packs = {
      snarky_comments: Array.isArray(data.snarky_comments) ? data.snarky_comments : [],
      fake_genres: Array.isArray(data.fake_genres) ? data.fake_genres : [],
      epitaph_suggestions: Array.isArray(data.epitaph_suggestions) ? data.epitaph_suggestions : []
    };

    const bags = {
      snark: makeBag('snark', packs.snarky_comments),
      genre: makeBag('genre', packs.fake_genres),
      epitaph: makeBag('epitaph', packs.epitaph_suggestions)
    };

    window.__dgDialogs = {
      __ready: true,
      all: packs,
      pick(kind) {
        if (kind === 'snarky_comments' || kind === 'snark')   return bags.snark.next();
        if (kind === 'fake_genres' || kind === 'genre')        return bags.genre.next();
        if (kind === 'epitaph_suggestions' || kind === 'epitaph') return bags.epitaph.next();
        return '';
      },
      randomSnark:   () => bags.snark.next(),
      randomGenre:   () => bags.genre.next(),
      randomEpitaph: () => bags.epitaph.next()
    };

    console.log('[dialogs] loaded ok');
    return window.__dgDialogs;
  }

  window.dgDialogs = { load };
})();

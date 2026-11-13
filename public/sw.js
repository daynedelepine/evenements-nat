// Service worker du site public : fonctionne hors ligne (coque de l'application).
// - Pages (navigation) : réseau d'abord (4 s), sinon la dernière copie.
// - /assets/* (noms empreints) et polices : copie locale d'abord.
// - Rien d'autre n'est intercepté : Firebase, /admin et les requêtes non GET passent directement.
// Les événements eux-mêmes sont gardés par le site (stockage local), pas ici.
const CACHE = 'nat-shell-v2';   // v2 : force la mise à jour des appareils restés sur l'ancien code (mur d'idées)
const PAGE = '/';

const urlsIn = text => [...text.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(m => m[1]);
const cssUrls = text => [...text.matchAll(/url\(([^)]+)\)/g)].map(m => m[1].replace(/["']/g, '')).filter(u => u.startsWith('/') || u.startsWith('./'));

// Met à jour la coque à partir de la page d'accueil et retire les anciens fichiers empreints.
async function sync(html) {
  const cache = await caches.open(CACHE);
  const wanted = new Set(urlsIn(html));
  for (const u of [...wanted]) {
    if (!u.endsWith('.css')) continue;
    try {
      const css = await (await fetch(u)).text();
      cssUrls(css).forEach(f => wanted.add(new URL(f, location.origin + u).pathname));
    } catch { /* CSS indisponible : tant pis pour les polices */ }
  }
  wanted.add('/manifest.webmanifest'); wanted.add('/favicon.svg'); wanted.add('/icon-192.png');
  await Promise.all([...wanted].map(async u => { if (!(await cache.match(u))) { try { await cache.add(u); } catch { /* sera mis en cache à l'usage */ } } }));
  for (const req of await cache.keys()) {
    const p = new URL(req.url).pathname;
    if (p.startsWith('/assets/') && !wanted.has(p)) await cache.delete(req);
  }
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const res = await fetch(PAGE, { cache: 'reload' });
    const cache = await caches.open(CACHE);
    await cache.put(PAGE, res.clone());
    await sync(await res.text());
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys(), upgrade = keys.some(k => k !== CACHE);
    for (const k of keys) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
    // Mise à jour d'une ancienne version : les pages déjà ouvertes (onglet, application installée) sont rechargées une fois.
    if (upgrade) for (const c of await self.clients.matchAll({ type: 'window' })) { try { await c.navigate(c.url); } catch { /* page fermée */ } }
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/admin')) return;

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(no, 4000))]);
        if (res.ok && url.pathname === '/') { cache.put(PAGE, res.clone()); res.clone().text().then(sync).catch(() => {}); }
        return res;
      } catch {
        return (await cache.match(PAGE)) || Response.error();
      }
    })());
    return;
  }

  if (url.pathname.startsWith('/assets/') || /\.(png|svg|webmanifest|woff2?)$/.test(url.pathname)) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE), hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
  }
});

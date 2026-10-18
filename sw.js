/* Cocina del Mundo - service worker
   Estrategia: la app y las recetas se piden primero a internet (así siempre ves las recetas nuevas)
   y, si no hay conexión, se usan las copias guardadas. Los íconos salen directo de la copia guardada. */
const VERSION = 'cocina-v2';
const CORE = [
  './', './index.html', './recetas.json', './manifest.json',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(req) {
  return new Promise((resolve) => {
    let settled = false;
    const fromCache = () => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html'));
    const timer = setTimeout(() => {
      if (!settled) fromCache().then((hit) => { if (hit && !settled) { settled = true; resolve(hit); } });
    }, 4000);
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        if (!settled) { settled = true; clearTimeout(timer); resolve(res); }
      })
      .catch(() => {
        clearTimeout(timer);
        if (!settled) fromCache().then((hit) => { settled = true; resolve(hit || Response.error()); });
      });
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (/\.(png|ico|svg|jpe?g|webp)$/.test(url.pathname)) {
    /* Íconos y fotos de países: salen de la copia guardada y se guardan la primera vez que se ven */
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }
  e.respondWith(networkFirst(req));
});

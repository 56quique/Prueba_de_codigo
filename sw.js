/* Service worker — Mujeres de Acción
   - Archivos de la app: se sirven de la copia guardada y se actualizan en segundo plano.
   - Datos (.json) y páginas: primero la red (así aparece el contenido nuevo); sin conexión, la copia guardada.
   - Tipografías de Google: se guardan la primera vez para funcionar sin internet.
   Si agregás archivos nuevos a PRECARGA o querés forzar una limpieza, subí el número de VERSION. */
const VERSION = 'mda-v4';
const PRECARGA = [
  './', 'index.html', 'manifest.json',
  'articulos.html', 'articulo.html', 'devocional.html', 'testimonio.html', 'recursos.html', 'contacto.html', 'editoras.html',
  'css/estilos.css',
  'js/app.js', 'js/devocional.js', 'js/novedades.js', 'js/comun.js', 'js/paginas.js', 'js/github.js', 'js/editor.js',
  'icons/icon-192.png', 'icons/icon-512.png'
];
const HOSTS_FUENTES = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(PRECARGA.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function guardable(res) { return res && (res.ok || res.type === 'opaque'); }

function conTimeout(p, ms) {
  return new Promise((ok, no) => {
    const t = setTimeout(() => no(new Error('timeout')), ms);
    p.then(r => { clearTimeout(t); ok(r); }, er => { clearTimeout(t); no(er); });
  });
}

async function primeroRed(req, opciones) {
  const cache = await caches.open(VERSION);
  try {
    const res = await conTimeout(fetch(req), 4000);
    if (guardable(res)) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const copia = await cache.match(req, opciones);
    if (copia) return copia;
    if (req.mode === 'navigate') {
      const inicio = await cache.match('index.html');
      if (inicio) return inicio;
    }
    throw err;
  }
}

async function copiaYActualiza(req) {
  const cache = await caches.open(VERSION);
  const copia = await cache.match(req);
  const red = fetch(req).then(res => { if (guardable(res)) cache.put(req, res.clone()); return res; }).catch(() => null);
  return copia || (await red) || Response.error();
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') return e.respondWith(primeroRed(req, { ignoreSearch: true }));
    if (url.pathname.endsWith('.json') && !url.pathname.endsWith('manifest.json')) return e.respondWith(primeroRed(req));
    return e.respondWith(copiaYActualiza(req));
  }
  if (HOSTS_FUENTES.includes(url.hostname)) return e.respondWith(copiaYActualiza(req));
});

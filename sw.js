/* Wasteland service worker: offline app shell + capped map-tile cache. Only registered over http(s). */
const VERSION = 'wl-v3';
const SHELL = `${VERSION}-shell`, TILES = `${VERSION}-tiles`, MAX_TILES = 1500;
const SHELL_FILES = ['./', './index.html', './css/style.css', './js/data.js', './js/core.js', './js/world.js', './js/actions.js', './js/ui.js',
  './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => Promise.all(SHELL_FILES.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const isTile = u => /server\.arcgisonline\.com\/ArcGIS\/rest\/services\/.+\/tile\/|tile\.opentopomap\.org/.test(u);
const isAPI = u => /overpass|nominatim|photon\.komoot/.test(u);
let trimming = false;
async function trimTiles() {
  if (trimming) return; trimming = true;
  try { const c = await caches.open(TILES); const ks = await c.keys(); for (let i = 0; i < ks.length - MAX_TILES; i++) await c.delete(ks[i]); } finally { trimming = false; }
}
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = req.url;
  if (isAPI(url)) return; // always network (game has its own localStorage cache)
  if (isTile(url)) {
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(req); if (hit) return hit;
      try { const res = await fetch(req); if (res.ok || res.type === 'opaque') { c.put(req, res.clone()); trimTiles(); } return res; }
      catch (err) { return new Response('', { status: 504, statusText: 'offline' }); }
    }));
    return;
  }
  // app shell & fonts: stale-while-revalidate
  e.respondWith(caches.open(SHELL).then(async c => {
    const hit = await c.match(req, { ignoreSearch: url.startsWith(self.location.origin) });
    const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net; if (res) return res;
    if (req.mode === 'navigate') { const idx = await c.match('./index.html'); if (idx) return idx; }
    return new Response('', { status: 504, statusText: 'offline' });
  }));
});

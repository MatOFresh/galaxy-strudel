// Service worker minimal : met en cache la coque de l'app pour l'offline.
// Les samples Strudel viennent du réseau (CDN) au 1er lancement.
const CACHE = 'galaxie-v1';
const SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/strudel-engine.js',
  './js/sounds.js',
  './js/music.js',
  './js/visuals.js',
  './js/ui.js',
  './js/modes/sequencer.js',
  './js/modes/pads.js',
  './js/modes/blocks.js',
  './manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Ne pas intercepter le CDN Strudel / samples (réseau direct).
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});

// Service worker : coque en cache pour l'offline, avec mise à jour automatique.
// Stratégie "stale-while-revalidate" : on sert vite depuis le cache, et on
// rafraîchit le cache en tâche de fond -> les correctifs poussés arrivent au
// lancement suivant sans vider le cache à la main.
// Les samples Strudel viennent du réseau (CDN) au 1er lancement.
const CACHE = 'galaxie-v20';
const SHELL = [
  './',
  './index.html',
  './css/fonts.css',
  './css/styles.css',
  './js/app.js',
  './js/strudel-engine.js',
  './js/sounds.js',
  './js/music.js',
  './js/visuals.js',
  './js/visualizer.js',
  './js/icons.js',
  './js/voice.js',
  './js/draw.js',
  './js/feelings.js',
  './js/ui.js',
  './js/djfx.js',
  './js/modes/sequencer.js',
  './js/modes/pads.js',
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
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(e.request).then((hit) => {
        // Rafraîchit le cache en tâche de fond (revalidate).
        const fetching = fetch(e.request).then((res) => {
          if (res && res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => hit || cache.match('./index.html'));
        // Sert le cache tout de suite si dispo, sinon attend le réseau.
        return hit || fetching;
      })
    )
  );
});

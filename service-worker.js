/* Sailors PWA service worker
   Strategy:
   - App files (HTML/manifest/icons): cached so the app opens offline.
   - HTML uses network-first so you always get the latest version when online,
     falling back to cache when offline.
   - Bump CACHE_VERSION whenever you upload a new sailors_9.html to force a refresh.
*/
const CACHE_VERSION = 'sailors-v1';
const APP_SHELL = [
  './',
  './sailors_9.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  const isHTML = req.mode === 'navigate' || req.destination === 'document' || url.pathname.endsWith('.html');

  if (isHTML) {
    // Network-first: latest when online, cached when offline
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./sailors_9.html')))
    );
  } else {
    // Cache-first for icons/manifest/static
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached))
    );
  }
});

const CACHE = 'stoked-v34';

// Only cache static assets — never app.js or index.html
// so code updates are always picked up immediately
const STATIC = [
  '/stoked-command-center/logo.svg',
  '/stoked-command-center/icon-192.png',
  '/stoked-command-center/icon-512.png',
];

// These always go network-first so updates land instantly
const ALWAYS_NETWORK = [
  '/stoked-command-center/',
  '/stoked-command-center/index.html',
  '/stoked-command-center/app.js',
  '/stoked-command-center/styles.css',
  '/stoked-command-center/manifest.json',
  '/stoked-command-center/logo-mark.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Pass through Firebase / Google / font requests
  if (url.hostname.includes('firebase') || url.hostname.includes('google') || url.hostname.includes('gstatic')) {
    return;
  }

  const path = url.pathname;

  // Core app files — network first (bypassing HTTP cache), fall back to cache
  if (ALWAYS_NETWORK.includes(path)) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Static assets — cache first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

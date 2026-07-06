const CACHE = 'stoked-v40';

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

// ── FIREBASE MESSAGING (background push) ──────
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyBIfsac4gqRxCEoU8655AnrajxmRQOSDo4',
  authDomain:        'stoked-brotherhood-app.firebaseapp.com',
  projectId:         'stoked-brotherhood-app',
  storageBucket:     'stoked-brotherhood-app.firebasestorage.app',
  messagingSenderId: '243670203554',
  appId:             '1:243670203554:web:adfed8e3bcb431368f6bfb',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification || {};
  if (!title) return;
  self.registration.showNotification(title, {
    body,
    icon:  '/stoked-command-center/icon-192.png',
    badge: '/stoked-command-center/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: 'https://boysclubcabo-prog.github.io/stoked-command-center/' },
  });
});

// Tapping a notification opens/focuses the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = e.notification.data?.url || '/stoked-command-center/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes('stoked-command-center'));
      if (existing) return existing.focus();
      return clients.openWindow(target);
    })
  );
});

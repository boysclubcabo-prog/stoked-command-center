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

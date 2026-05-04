/* Auto-generated — do not edit. Regenerated on every build. */
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBjmRgm4uGfSs_hVXN1pSgyncKn_A7T6uo",
  authDomain: "1:573340015027:web:1d05e678f1ba90dca293c6",
  projectId: "amynest-836ff",
  appId: "1:573340015027:web:1d05e678f1ba90dca293c6",
  messagingSenderId: "573340015027",
});

const messaging = firebase.messaging();

// Activate immediately on install so users get the updated SW (and its
// fresh Firebase config) right after a new deployment, without needing
// to close all tabs first.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'AmyNest';
  const options = {
    body: payload.notification?.body ?? '',
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    // tag deduplicates: same category replaces the previous banner instead
    // of stacking multiple identical notifications.
    tag: (payload.data && payload.data.category) ? payload.data.category : 'amynest',
    renotify: true,
    data: payload.data ?? {},
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const deepLink = (event.notification.data && event.notification.data.deepLink)
    ? event.notification.data.deepLink
    : '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing app window rather than opening a duplicate tab.
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.navigate(deepLink);
            return client.focus();
          }
        }
        // No existing window — open a new one.
        return self.clients.openWindow(deepLink);
      })
  );
});

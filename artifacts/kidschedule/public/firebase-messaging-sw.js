/* Auto-generated — do not edit. Regenerated on every build. */
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBjmRgm4uGfSs_hVXN1pSgyncKn_A7T6uo",
  authDomain: "amynest-836ff.firebaseapp.com",
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

/**
 * Resolve a deep-link value from the FCM dispatch service to a full URL.
 *
 * The dispatch service sends deepLink as a path (e.g. "/routine", "/hub").
 * WindowClient.navigate() and clients.openWindow() require an absolute URL
 * on all browsers — relative paths fail silently in some engines.
 */
function resolveDeepLink(raw) {
  if (!raw) return 'https://amynest.in/';
  // Already an absolute URL.
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  // Root-relative path → prepend origin.
  return 'https://amynest.in' + (raw.startsWith('/') ? raw : '/' + raw);
}

messaging.onBackgroundMessage((payload) => {
  // Title/body come from data (data-only messages) or notification payload.
  const title = payload.data?.title ?? payload.notification?.title ?? 'AmyNest AI';
  const body  = payload.data?.body  ?? payload.notification?.body  ?? '';
  const options = {
    body,
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

  // Always use an absolute URL — relative paths fail silently in some browsers.
  const targetUrl = resolveDeepLink(deepLink);

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing app window rather than opening a duplicate tab.
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url.startsWith('https://amynest.in') && 'focus' in client) {
            // Navigate to the deep link path within the existing window.
            if ('navigate' in client) {
              client.navigate(targetUrl);
            }
            return client.focus();
          }
        }
        // No existing window — open a new one at the deep link.
        return self.clients.openWindow(targetUrl);
      })
  );
});

/**
 * AmyNest root service worker.
 *
 * Purpose: satisfy Chrome's WebAPK install criteria on Android so that
 * "Install app" / "Add to Home Screen" mints a real WebAPK (not just a
 * launcher shortcut). This is what makes installed-PWA push notifications
 * appear under the AmyNest app name + icon instead of the generic
 * "Chrome" header with the Chrome logo.
 *
 * Chrome's WebAPK install criteria require a service worker registered
 * at the page scope ("/") that has a `fetch` event listener. The
 * Firebase messaging SW (firebase-messaging-sw.js) is registered by the
 * Firebase SDK at its own narrow scope and does NOT have a fetch
 * handler — so Chrome was previously falling back to the shortcut path.
 *
 * This SW is a network pass-through. It deliberately does NOT cache
 * anything, so it cannot serve stale JS/CSS after a deployment. The
 * fetch handler exists purely to satisfy the install criteria.
 *
 * Deep-link / FCM push handling stays in firebase-messaging-sw.js — the
 * two SWs coexist at different scopes and do not conflict.
 */

self.addEventListener('install', () => {
  // Activate immediately on first install / update so users get the
  // current SW without needing to close all tabs.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through: never intercept, never cache. Required only so the
  // browser sees a fetch listener and treats the site as a full PWA
  // (installable as WebAPK on Android Chrome).
  // Intentionally not calling event.respondWith — the browser handles
  // the request normally.
  void event;
});

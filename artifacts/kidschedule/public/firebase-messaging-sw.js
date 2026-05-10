/*
 * Push notifications are delivered exclusively through the native FCM layer
 * in the KidSchedule Android WebView wrapper. This service worker is a
 * no-op placeholder kept for cache-busting on devices that previously
 * registered the old Firebase messaging worker.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

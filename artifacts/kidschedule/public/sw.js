/**
 * AmyNest root service worker.
 *
 * Pass-through only (no caching). Satisfies Chrome WebAPK install criteria.
 * On activate, clears old caches so a deploy cannot strand users on stale
 * chunk URLs after Render redirect/rewrite changes.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if ('caches' in self) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  // Required for WebAPK install criteria; do not intercept — browser handles network.
  void event;
});

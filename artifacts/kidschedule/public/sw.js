/* Auto-generated on build — do not edit. Cache: amynest-v3-1779052041831 */
/**
 * AmyNest root service worker (source — built to /sw.js with a deploy-specific cache id).
 *
 * - skipWaiting + clients.claim on every deploy
 * - Versioned cache (amynest-v3-*); purge all other cache names on activate
 * - Navigation: always network (never serve cached index.html)
 * - Static hashed assets: browser/CDN cache only (SW does not intercept)
 * - FCM block appended at build time via importScripts snippet
 */

/* global self, caches, clients, importScripts, firebase */

const CACHE_NAME = "amynest-v3-1779052041831";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        }),
      );
      await self.clients.claim();
    })(),
  );
});

function isNavigationRequest(request) {
  if (request.mode === "navigate") return true;
  const accept = request.headers.get("accept") || "";
  return request.method === "GET" && accept.includes("text/html");
}

function isAssetPath(pathname) {
  return /\.[a-z0-9]{1,12}$/i.test(pathname);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // Hashed bundles and static files — browser HTTP cache + CDN only.
  if (isAssetPath(url.pathname)) return;

  if (!isNavigationRequest(request)) return;

  // Never serve a cached shell — always fetch the latest index.html from network.
  event.respondWith(
    fetch(request, { cache: "no-store" }).catch(() =>
      fetch(request.url, { cache: "reload" }),
    ),
  );
});



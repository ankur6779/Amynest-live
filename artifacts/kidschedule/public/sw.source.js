/**
 * AmyNest root service worker (source — built to /sw.js with a deploy-specific cache id).
 *
 * - skipWaiting + clients.claim on every deploy
 * - Versioned cache; purge all other cache names on activate
 * - Navigation: network-first index.html (never cache stale JS/CSS)
 * - FCM block appended at build time via importScripts snippet
 */

/* global self, caches, clients, importScripts, firebase */

const CACHE_NAME = "__AMYNEST_CACHE_NAME__";
const INDEX_URL = new URL("index.html", self.location.origin).href;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      fetch(INDEX_URL, { cache: "no-store" })
        .then((res) => {
          if (res.ok) return cache.put(INDEX_URL, res);
        })
        .catch(() => undefined),
    ),
  );
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

async function fetchIndexFromNetwork() {
  return fetch(INDEX_URL, { cache: "no-store" });
}

async function fetchIndexFallback() {
  try {
    const res = await fetchIndexFromNetwork();
    if (res.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(INDEX_URL, res.clone());
      return res;
    }
  } catch {
    /* network failed */
  }
  const cached = await caches.match(INDEX_URL);
  if (cached) return cached;
  return new Response("Offline", { status: 503, statusText: "Offline" });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // Never intercept hashed bundles — browser HTTP cache + CDN only.
  if (isAssetPath(url.pathname)) return;

  if (!isNavigationRequest(request)) return;

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(request, { cache: "no-store" });
        if (networkResponse.ok) return networkResponse;
        if (networkResponse.status === 404) {
          return fetchIndexFallback();
        }
        return networkResponse;
      } catch {
        return fetchIndexFallback();
      }
    })(),
  );
});

/* __AMYNEST_FCM_BLOCK__ */

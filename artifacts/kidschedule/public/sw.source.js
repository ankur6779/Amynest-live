/**
 * AmyNest root service worker (source — built to /sw.js with a deploy-specific cache id).
 *
 * - skipWaiting + clients.claim on every deploy
 * - Versioned cache (amynest-v7); purge shell cache on activate
 * - Navigation: always network (never serve cached index.html)
 * - Immutable audio API clips: cache-first (Layer 3 edge CDN in browser)
 * - Static hashed assets: browser/CDN cache only (SW does not intercept)
 * - FCM block appended at build time via importScripts snippet
 */

/* global self, caches, clients, importScripts, firebase */

const CACHE_NAME = "__AMYNEST_CACHE_NAME__";
/** Immutable hash-keyed audio — preserved across shell deploys. */
const AUDIO_CACHE_NAME = "amynest-audio-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (event.data?.type === "PRECACHE_AUDIO_URLS" && Array.isArray(event.data.urls)) {
    event.waitUntil(precacheAudioUrls(event.data.urls));
  }
});

/** Cache API rejects partial (206) and opaque responses — never cache.put those. */
function canCacheAudioResponse(response) {
  if (!response || !response.ok) return false;
  if (response.status === 206) return false;
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("audio");
}

async function safeCacheAudioPut(cache, request, response) {
  if (!canCacheAudioResponse(response)) return;
  try {
    await cache.put(request, response.clone());
  } catch {
    /* partial / quota / opaque */
  }
}

async function precacheAudioUrls(urls) {
  const cache = await caches.open(AUDIO_CACHE_NAME);
  const batch = urls.slice(0, 200);
  for (const rawUrl of batch) {
    if (typeof rawUrl !== "string" || !rawUrl.trim()) continue;
    try {
      const request = new Request(rawUrl, { credentials: "include", mode: "cors" });
      const existing = await cache.match(request);
      if (existing) continue;
      const response = await fetch(request);
      await safeCacheAudioPut(cache, request, response);
    } catch {
      /* skip failed clip */
    }
  }
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.map((name) => {
          if (name === CACHE_NAME || name === AUDIO_CACHE_NAME) return undefined;
          return caches.delete(name);
        }),
      ).then(() => self.clients.claim()),
    ),
  );
});

function isImmutableAudioApiPath(pathname) {
  return (
    /^\/api\/static-audio\/[a-f0-9]{32}\.mp3$/i.test(pathname) ||
    /^\/api\/phonics-library\/.+\.mp3$/i.test(pathname) ||
    /^\/api\/spelling-library\/.+\.mp3$/i.test(pathname)
  );
}

async function cacheFirstAudio(request) {
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set("X-AmyNest-Sw-Cache", "HIT");
      return new Response(cached.body, { status: cached.status, headers });
    }

    const response = await fetch(request);
    await safeCacheAudioPut(cache, request, response);
    const headers = new Headers(response.headers);
    headers.set("X-AmyNest-Sw-Cache", "MISS");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch {
    return fetch(request);
  }
}

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

  if (request.method === "GET" && isImmutableAudioApiPath(url.pathname)) {
    event.respondWith(cacheFirstAudio(request));
    return;
  }

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

/* __AMYNEST_FCM_BLOCK__ */

/**
 * Cloudflare Worker — proxy /api/* + edge CDN cache for immutable audio.
 *
 * Cacheable (365d at edge + Cache API):
 *   /api/static-audio/{hash}.mp3
 *   /api/phonics-library/…/*.mp3
 *   /api/spelling-library/…/*.mp3
 *
 * Deploy: wrangler deploy (see wrangler.toml)
 */
const DEFAULT_BACKEND = "https://amynest-backend-dykj.onrender.com";

const STATIC_AUDIO_RE = /^\/api\/static-audio\/[a-f0-9]{32}\.mp3$/i;
const PHONICS_LIBRARY_RE = /^\/api\/phonics-library\/.+\.mp3$/i;
const SPELLING_LIBRARY_RE = /^\/api\/spelling-library\/.+\.mp3$/i;

/** @param {string} pathname */
function isCacheableAudioPath(pathname) {
  return (
    STATIC_AUDIO_RE.test(pathname) ||
    PHONICS_LIBRARY_RE.test(pathname) ||
    SPELLING_LIBRARY_RE.test(pathname)
  );
}

/** @param {Request} request @param {Record<string, string>} env @param {URL} url */
async function proxyToBackend(request, env, url) {
  const backend = (env.BACKEND_ORIGIN ?? DEFAULT_BACKEND).replace(/\/$/, "");
  const target = new URL(`${url.pathname}${url.search}`, backend);

  const headers = new Headers(request.headers);
  headers.delete("host");

  /** @type {RequestInit} */
  const init = {
    method: request.method,
    headers,
    redirect: "follow",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  const response = await fetch(target.toString(), init);

  const out = new Headers(response.headers);
  out.set("Access-Control-Allow-Origin", url.origin);
  out.set("Access-Control-Allow-Credentials", "true");

  if (isCacheableAudioPath(url.pathname) && response.ok) {
    out.set(
      "Cache-Control",
      out.get("Cache-Control") ??
        "public, max-age=31536000, stale-while-revalidate=86400, immutable",
    );
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: out,
  });
}

/**
 * Edge cache — second request for the same clip should not hit Render.
 * @param {Request} request @param {Record<string, string>} env @param {ExecutionContext} ctx @param {URL} url
 */
async function fetchWithEdgeCache(request, env, ctx, url) {
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), request);

  const cached = await cache.match(cacheKey);
  if (cached) {
    const headers = new Headers(cached.headers);
    headers.set("X-AmyNest-Edge-Cache", "HIT");
    headers.set("Access-Control-Allow-Origin", url.origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    return new Response(cached.body, {
      status: cached.status,
      statusText: cached.statusText,
      headers,
    });
  }

  const response = await proxyToBackend(request, env, url);
  const contentType = response.headers.get("content-type") ?? "";

  if (response.ok && contentType.includes("audio")) {
    const toStore = response.clone();
    ctx.waitUntil(cache.put(cacheKey, toStore));
  }

  const headers = new Headers(response.headers);
  headers.set("X-AmyNest-Edge-Cache", "MISS");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** @param {Request} request @param {Record<string, string>} env @param {ExecutionContext} ctx */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) {
      return fetch(request);
    }

    if (
      (request.method === "GET" || request.method === "HEAD") &&
      isCacheableAudioPath(url.pathname)
    ) {
      return fetchWithEdgeCache(request, env, ctx, url);
    }

    return proxyToBackend(request, env, url);
  },
};

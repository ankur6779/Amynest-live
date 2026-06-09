/**
 * Cloudflare Worker — proxy /api/* + edge CDN cache for immutable media.
 *
 * Cacheable at edge (Cache API + long TTL from origin):
 *   /api/tts/audio/{sha256}.mp3       (immutable dynamic TTS — full GET only)
 *   /api/static-audio/{hash}.mp3
 *   /api/phonics-library/…/*.mp3
 *   /api/spelling-library/…/*.mp3
 *   /api/worlds-library/*
 *   /api/animal-world-library/*
 *   /api/stories/stream/{id}  (full GET only; Range proxied to origin)
 *
 * Deploy: wrangler deploy (see wrangler.toml)
 */
const DEFAULT_BACKEND = "https://amynest-backend-dykj.onrender.com";

const TTS_AUDIO_RE = /^\/api\/tts\/audio\/[a-f0-9]{64}\.mp3$/i;
const STATIC_AUDIO_RE = /^\/api\/static-audio\/[a-f0-9]{32}\.mp3$/i;
const PHONICS_LIBRARY_RE = /^\/api\/phonics-library\/.+\.mp3$/i;
const SPELLING_LIBRARY_RE = /^\/api\/spelling-library\/.+\.mp3$/i;
const WORLDS_LIBRARY_RE = /^\/api\/worlds-library\/.+$/i;
const ANIMAL_WORLD_LIBRARY_RE = /^\/api\/animal-world-library\/.+$/i;
const STORIES_STREAM_RE = /^\/api\/stories\/stream\/[a-zA-Z0-9_-]+$/;

const MEDIA_CACHE_TTL_FALLBACK =
  "public, max-age=31536000, stale-while-revalidate=86400, immutable";

/** @param {string} pathname */
function isCacheableAudioPath(pathname) {
  return (
    TTS_AUDIO_RE.test(pathname) ||
    STATIC_AUDIO_RE.test(pathname) ||
    PHONICS_LIBRARY_RE.test(pathname) ||
    SPELLING_LIBRARY_RE.test(pathname)
  );
}

/** @param {string} pathname */
function isCacheableMediaPath(pathname) {
  return (
    isCacheableAudioPath(pathname) ||
    isSignedUrlMetadataPath(pathname) ||
    WORLDS_LIBRARY_RE.test(pathname) ||
    ANIMAL_WORLD_LIBRARY_RE.test(pathname) ||
    STORIES_STREAM_RE.test(pathname)
  );
}

const SIGNED_URL_METADATA_RE = /^\/api\/audio\/signed-url\/[a-z0-9-]+$/i;
const RHYMES_CATALOG_RE = /^\/api\/audio\/rhymes\/catalog$/i;

/** @param {string} pathname */
function isSignedUrlMetadataPath(pathname) {
  return SIGNED_URL_METADATA_RE.test(pathname) || RHYMES_CATALOG_RE.test(pathname);
}

/** @param {string} pathname @param {string} contentType */
function shouldStoreInEdgeCache(pathname, contentType) {
  if (!contentType) return false;
  if (isSignedUrlMetadataPath(pathname)) return contentType.includes("json");
  if (isCacheableAudioPath(pathname)) return contentType.includes("audio");
  if (WORLDS_LIBRARY_RE.test(pathname) || ANIMAL_WORLD_LIBRARY_RE.test(pathname)) {
    return contentType.includes("audio") || contentType.includes("image");
  }
  if (STORIES_STREAM_RE.test(pathname)) return contentType.includes("video");
  return false;
}

/** Cache key ignores Range so one object per story/asset URL. */
function mediaCacheRequest(url) {
  return new Request(url.toString(), { method: "GET" });
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

  if (isCacheableMediaPath(url.pathname) && response.ok) {
    const existing = out.get("Cache-Control");
    if (!existing || !existing.includes("max-age")) {
      out.set("Cache-Control", MEDIA_CACHE_TTL_FALLBACK);
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: out,
  });
}

/**
 * @param {Response} cached
 * @param {URL} url
 * @param {"HIT" | "MISS"} edgeLabel
 */
function withEdgeCacheHeaders(cached, url, edgeLabel) {
  const headers = new Headers(cached.headers);
  headers.set("X-AmyNest-Edge-Cache", edgeLabel);
  headers.set("Access-Control-Allow-Origin", url.origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  return new Response(cached.body, {
    status: cached.status,
    statusText: cached.statusText,
    headers,
  });
}

/**
 * Edge cache — repeat requests for the same clip/video should not hit Render.
 * Range requests are always proxied (video players); full GET responses are stored.
 * @param {Request} request @param {Record<string, string>} env @param {ExecutionContext} ctx @param {URL} url
 */
async function fetchWithEdgeCache(request, env, ctx, url) {
  const cache = caches.default;
  const cacheKey = mediaCacheRequest(url);
  const hasRange = Boolean(request.headers.get("Range"));

  if (!hasRange) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      return withEdgeCacheHeaders(cached, url, "HIT");
    }
  }

  const response = await proxyToBackend(request, env, url);
  const contentType = response.headers.get("content-type") ?? "";

  if (
    !hasRange &&
    request.method === "GET" &&
    response.ok &&
    response.status === 200 &&
    shouldStoreInEdgeCache(url.pathname, contentType)
  ) {
    const toStore = response.clone();
    ctx.waitUntil(cache.put(cacheKey, toStore));
  }

  const headers = new Headers(response.headers);
  headers.set("X-AmyNest-Edge-Cache", hasRange ? "BYPASS-RANGE" : "MISS");
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
      isCacheableMediaPath(url.pathname)
    ) {
      return fetchWithEdgeCache(request, env, ctx, url);
    }

    return proxyToBackend(request, env, url);
  },
};

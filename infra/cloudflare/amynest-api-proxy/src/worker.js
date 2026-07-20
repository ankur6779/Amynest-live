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
 *   /api/reels/stream/{id}    (Phase 2B — GCS via Worker when REELS_GCS_ORIGIN=1)
 *
 * Deploy: wrangler deploy (see wrangler.toml)
 */
import {
  fetchReelsStreamWithEdgeCache,
  isReelsGcsOriginEnabled,
  REELS_STREAM_RE,
} from "./reels-gcs-origin.js";
import { selectBackend } from "./canary.js";

const DEFAULT_BACKEND =
  "https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io";
const COACH_GENERATE_TRACE_HEADER = "x-amynest-coach-trace-id";
const COACH_TRACE_PATHS = ["/api/coach/generate", "/api/coach/generate-fallback", "/api/result/"];

/** @param {string} pathname */
function isCoachTracePath(pathname) {
  return COACH_TRACE_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

/** @param {string} stage @param {Record<string, unknown>} event */
function logCoachTrace(stage, event) {
  console.log(JSON.stringify({ evt: "coach_generate_trace", stage, ...event }));
}

const TTS_AUDIO_RE = /^\/api\/tts\/audio\/[a-f0-9]{64}\.mp3$/i;
const STATIC_AUDIO_RE = /^\/api\/static-audio\/[a-f0-9]{32}\.mp3$/i;
const PHONICS_LIBRARY_RE = /^\/api\/phonics-library\/.+\.mp3$/i;
const SPELLING_LIBRARY_RE = /^\/api\/spelling-library\/.+\.mp3$/i;
const WORLDS_LIBRARY_RE = /^\/api\/worlds-library\/.+$/i;
const ANIMAL_WORLD_LIBRARY_RE = /^\/api\/animal-world-library\/.+$/i;
const STORIES_STREAM_RE = /^\/api\/stories\/stream\/[a-zA-Z0-9_-]+$/;

const MEDIA_CACHE_TTL_FALLBACK =
  "public, max-age=31536000, stale-while-revalidate=86400, immutable";

/** Fail-fast upstream proxy — must exceed coach gateway (65s) but bound hung backends. */
const PROXY_UPSTREAM_TIMEOUT_MS = 70_000;

/** Match Express cors-origins.ts — Capacitor iOS/Android cross-origin API calls. */
const ALLOWED_CORS_ORIGINS = new Set([
  "https://www.amynest.in",
  "https://amynest.in",
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "https://localhost",
]);

/** @param {Request} request @param {URL} url */
function resolveAccessControlOrigin(request, url) {
  const clientOrigin = request.headers.get("Origin");
  if (clientOrigin && ALLOWED_CORS_ORIGINS.has(clientOrigin)) {
    return clientOrigin;
  }
  if (clientOrigin) {
    try {
      const host = new URL(clientOrigin).hostname.toLowerCase();
      if (host === "amynest.in" || host.endsWith(".amynest.in")) {
        return clientOrigin;
      }
    } catch {
      /* ignore malformed Origin */
    }
  }
  return url.origin;
}

/** @param {string} pathname */
function isCacheableAudioPath(pathname) {
  return (
    TTS_AUDIO_RE.test(pathname) ||
    STATIC_AUDIO_RE.test(pathname) ||
    PHONICS_LIBRARY_RE.test(pathname) ||
    SPELLING_LIBRARY_RE.test(pathname) ||
    RHYMES_STREAM_RE.test(pathname)
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
const RHYMES_STREAM_RE = /^\/api\/audio\/stream\/[a-z0-9-]+$/i;
const RHYMES_CATALOG_RE = /^\/api\/audio\/rhymes\/catalog$/i;

/** @param {string} pathname */
function isSignedUrlMetadataPath(pathname) {
  return SIGNED_URL_METADATA_RE.test(pathname) || RHYMES_CATALOG_RE.test(pathname);
}

/**
 * Never persist placeholder / no-store responses in the Worker Cache API.
 * A prior incident cached 256-byte placeholders under real hash URLs forever.
 * @param {string} pathname
 * @param {string} contentType
 * @param {Headers} [headers]
 */
function shouldStoreInEdgeCache(pathname, contentType, headers) {
  if (!contentType) return false;
  const source = headers?.get("x-amynest-static-source") ?? "";
  if (source === "placeholder") return false;
  const cc = headers?.get("cache-control") ?? "";
  if (/no-store|no-cache|private/i.test(cc)) return false;
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
  const { url: backend, lane } = selectBackend(env, request);
  const target = new URL(`${url.pathname}${url.search}`, backend);
  const cfStarted = Date.now();
  const coachTrace = isCoachTracePath(url.pathname);
  const traceId =
    request.headers.get(COACH_GENERATE_TRACE_HEADER) ??
    request.headers.get("x-request-id") ??
    undefined;

  if (coachTrace) {
    logCoachTrace("cloudflare.request_received", {
      traceId,
      timestamp: new Date(cfStarted).toISOString(),
      durationMs: 0,
      layer: "cloudflare",
      meta: { path: url.pathname, method: request.method },
    });
  }

  const headers = new Headers(request.headers);
  headers.delete("host");
  if (traceId) {
    headers.set(COACH_GENERATE_TRACE_HEADER, traceId);
    headers.set("x-request-id", traceId);
  }

  /** @type {RequestInit} */
  const init = {
    method: request.method,
    headers,
    redirect: "follow",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  const controller = new AbortController();
  init.signal = controller.signal;
  const timeoutHandle = setTimeout(() => controller.abort("upstream_timeout"), PROXY_UPSTREAM_TIMEOUT_MS);

  if (coachTrace) {
    logCoachTrace("cloudflare.request_forwarded", {
      traceId,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - cfStarted,
      layer: "cloudflare",
      meta: { backend: backend.replace(/^https?:\/\//, "").slice(0, 40) },
    });
  }

  let response;
  try {
    response = await fetch(target.toString(), init);
  } catch (err) {
    clearTimeout(timeoutHandle);
    const cfMs = Date.now() - cfStarted;
    const isTimeout =
      controller.signal.aborted ||
      (err instanceof Error && /abort|timeout/i.test(err.message));
    if (coachTrace) {
      logCoachTrace("cloudflare.upstream_timeout", {
        traceId,
        timestamp: new Date().toISOString(),
        durationMs: cfMs,
        layer: "cloudflare",
        httpStatus: 504,
        contentType: "application/json",
        meta: { path: url.pathname, timeoutMs: PROXY_UPSTREAM_TIMEOUT_MS, classification: isTimeout ? "upstream_timeout" : "upstream_error" },
      });
    }
    return new Response(
      JSON.stringify({
        error: "edge_upstream_timeout",
        message: "The request took too long. Please retry.",
        fallback: true,
        traceId,
        timeoutMs: PROXY_UPSTREAM_TIMEOUT_MS,
      }),
      {
        status: 504,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": resolveAccessControlOrigin(request, url),
          "Access-Control-Allow-Credentials": "true",
          ...(traceId ? { [COACH_GENERATE_TRACE_HEADER]: traceId } : {}),
          "x-amynest-trace-cf-ms": String(cfMs),
        },
      },
    );
  } finally {
    clearTimeout(timeoutHandle);
  }

  const cfMs = Date.now() - cfStarted;

  if (coachTrace) {
    const contentType = response.headers.get("content-type") ?? "";
    logCoachTrace("cloudflare.response_returned", {
      traceId,
      timestamp: new Date().toISOString(),
      durationMs: cfMs,
      layer: "cloudflare",
      httpStatus: response.status,
      contentType: contentType.slice(0, 80),
      meta: { cfMs },
    });
  }

  const out = new Headers(response.headers);
  const corsOrigin = resolveAccessControlOrigin(request, url);
  out.set("Access-Control-Allow-Origin", corsOrigin);
  out.set("Access-Control-Allow-Credentials", "true");
  if (traceId) out.set(COACH_GENERATE_TRACE_HEADER, traceId);
  out.set("x-amynest-trace-cf-ms", String(cfMs));
  out.set("x-amynest-backend", lane);

  const staticSource = out.get("x-amynest-static-source") ?? "";
  const contentLength = Number(out.get("content-length") || 0);
  const isPlaceholderAudio =
    staticSource === "placeholder" ||
    (isCacheableAudioPath(url.pathname) && contentLength > 0 && contentLength <= 512);

  // Never let Cloudflare CDN cache placeholder stubs as immutable.
  if (isPlaceholderAudio) {
    out.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
    out.set("CDN-Cache-Control", "no-store");
    out.set("Cloudflare-CDN-Cache-Control", "no-store");
    out.set("Surrogate-Control", "no-store");
  } else if (isCacheableMediaPath(url.pathname) && response.ok) {
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
function withEdgeCacheHeaders(cached, url, edgeLabel, request) {
  const headers = new Headers(cached.headers);
  headers.set("X-AmyNest-Edge-Cache", edgeLabel);
  const corsOrigin = resolveAccessControlOrigin(request, url);
  headers.set("Access-Control-Allow-Origin", corsOrigin);
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
      const source = cached.headers.get("x-amynest-static-source") ?? "";
      const contentLength = Number(cached.headers.get("content-length") || 0);
      // Never serve poisoned placeholder stubs from the Worker Cache API.
      const isPoison =
        source === "placeholder" ||
        (contentLength > 0 && contentLength <= 512);
      if (!isPoison) {
        return withEdgeCacheHeaders(cached, url, "HIT", request);
      }
      ctx.waitUntil(cache.delete(cacheKey));
    }
  }

  const response = await proxyToBackend(request, env, url);
  const contentType = response.headers.get("content-type") ?? "";

  if (
    !hasRange &&
    request.method === "GET" &&
    response.ok &&
    response.status === 200 &&
    shouldStoreInEdgeCache(url.pathname, contentType, response.headers)
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
      isReelsGcsOriginEnabled(env) &&
      REELS_STREAM_RE.test(url.pathname) &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      return fetchReelsStreamWithEdgeCache(request, env, ctx, url);
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

/**
 * Phase 2B — Art & Craft reels: Worker → GCS (private bucket, SA auth).
 * Catalog source of truth: reels-hub/phase1/catalog.v1.json
 */

export const REELS_STREAM_RE = /^\/api\/reels\/stream\/[a-zA-Z0-9_-]+$/;
export const REELS_ID_RE = /^[a-zA-Z0-9_-]+$/;

const DEFAULT_GCS_BUCKET = "amynest-audio-storage";
const DEFAULT_CATALOG_PATH = "reels-hub/phase1/catalog.v1.json";
const GCS_SCOPE = "https://www.googleapis.com/auth/devstorage.read_only";
const TOKEN_AUD = "https://oauth2.googleapis.com/token";

const REELS_CACHE_CONTROL = "public, max-age=31536000, stale-while-revalidate=86400, immutable";

/** @type {{ token: string | null, expMs: number, saEmail: string | null }} */
let tokenCache = { token: null, expMs: 0, saEmail: null };

/** @type {{ loadedAt: number, byId: Map<string, { objectKey: string, contentType: string, active: boolean }> } | null} */
let catalogMemoryCache = null;
const CATALOG_TTL_MS = 5 * 60 * 1000;

export function isReelsGcsOriginEnabled(env) {
  const raw = (env.REELS_GCS_ORIGIN ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function base64UrlEncode(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncodeString(str) {
  return base64UrlEncode(new TextEncoder().encode(str));
}

function pemToPkcs8ArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** @param {Record<string, string>} env */
function parseServiceAccount(env) {
  const raw = env.GCS_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** @param {Record<string, string>} env */
async function getGcsAccessToken(env) {
  const sa = parseServiceAccount(env);
  if (!sa?.client_email || !sa?.private_key) {
    throw new Error("gcs_service_account_missing");
  }

  const nowMs = Date.now();
  if (tokenCache.token && tokenCache.expMs > nowMs + 60_000 && tokenCache.saEmail === sa.client_email) {
    return tokenCache.token;
  }

  const iat = Math.floor(nowMs / 1000);
  const exp = iat + 3600;
  const header = base64UrlEncodeString(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncodeString(
    JSON.stringify({
      iss: sa.client_email,
      scope: GCS_SCOPE,
      aud: TOKEN_AUD,
      iat,
      exp,
    }),
  );
  const unsigned = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8ArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${base64UrlEncode(new Uint8Array(sig))}`;

  const tokenRes = await fetch(TOKEN_AUD, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`gcs_token_${tokenRes.status}`);
  }
  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token;
  if (!accessToken) throw new Error("gcs_token_empty");

  tokenCache = {
    token: accessToken,
    expMs: nowMs + Number(tokenJson.expires_in ?? 3600) * 1000,
    saEmail: sa.client_email,
  };
  return accessToken;
}

function gcsBucket(env) {
  return (env.GCS_BUCKET ?? env.DEFAULT_OBJECT_STORAGE_BUCKET_ID ?? DEFAULT_GCS_BUCKET).trim();
}

function catalogPath(env) {
  return (env.REELS_CATALOG_GCS_PATH ?? DEFAULT_CATALOG_PATH).trim();
}

function gcsMediaUrl(bucket, objectKey) {
  const encodedObject = encodeURIComponent(objectKey);
  return `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodedObject}?alt=media`;
}

/** @param {Record<string, string>} env */
async function fetchGcsBytes(env, objectKey, method = "GET", rangeHeader = null) {
  const token = await getGcsAccessToken(env);
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  if (rangeHeader) headers.set("Range", rangeHeader);
  return fetch(gcsMediaUrl(gcsBucket(env), objectKey), { method, headers });
}

/** @param {Record<string, string>} env */
async function loadReelsCatalog(env) {
  const now = Date.now();
  if (catalogMemoryCache && now - catalogMemoryCache.loadedAt < CATALOG_TTL_MS) {
    return catalogMemoryCache.byId;
  }

  const objectKey = catalogPath(env);
  const res = await fetchGcsBytes(env, objectKey, "GET");
  if (!res.ok) throw new Error(`catalog_fetch_${res.status}`);
  const raw = await res.json();
  if (!raw || raw.version !== 1 || !Array.isArray(raw.entries)) {
    throw new Error("catalog_invalid");
  }

  /** @type {Map<string, { objectKey: string, contentType: string, active: boolean }>} */
  const byId = new Map();
  for (const entry of raw.entries) {
    if (!entry?.id || !entry?.objectKey) continue;
    byId.set(String(entry.id), {
      objectKey: String(entry.objectKey),
      contentType: String(entry.contentType ?? "video/mp4"),
      active: entry.active !== false,
    });
  }
  catalogMemoryCache = { loadedAt: now, byId };
  return byId;
}

/** @param {Request} request @param {URL} url @param {Record<string, string>} env */
async function resolveReelObjectKey(request, env, url) {
  const reelId = url.pathname.split("/").pop() ?? "";
  if (!REELS_ID_RE.test(reelId)) return { error: "invalid_id", status: 400 };

  const catalog = await loadReelsCatalog(env);
  const entry = catalog.get(reelId);
  if (!entry || !entry.active) return { error: "not_found", status: 404 };

  return { reelId, entry };
}

/**
 * @param {Response} response
 * @param {Request} request
 * @param {URL} url
 * @param {"HIT" | "MISS" | "BYPASS-RANGE"} cacheLabel
 */
export function withReelsStreamHeaders(response, request, url, cacheLabel) {
  const headers = new Headers(response.headers);
  headers.set("X-AmyNest-Reels-Origin", "GCS");
  headers.set("X-AmyNest-Reels-Cache", cacheLabel);
  headers.delete("x-render-origin-server");

  const corsOrigin = resolveAccessControlOrigin(request, url);
  headers.set("Access-Control-Allow-Origin", corsOrigin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Accept-Ranges", headers.get("Accept-Ranges") ?? "bytes");

  if (response.ok && !headers.get("Cache-Control")?.includes("max-age")) {
    headers.set("Cache-Control", REELS_CACHE_CONTROL);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** @param {Request} request @param {URL} url */
function resolveAccessControlOrigin(request, url) {
  const ALLOWED = new Set([
    "https://www.amynest.in",
    "https://amynest.in",
    "capacitor://localhost",
    "ionic://localhost",
    "http://localhost",
    "https://localhost",
  ]);
  const clientOrigin = request.headers.get("Origin");
  if (clientOrigin && ALLOWED.has(clientOrigin)) return clientOrigin;
  if (clientOrigin) {
    try {
      const host = new URL(clientOrigin).hostname.toLowerCase();
      if (host === "amynest.in" || host.endsWith(".amynest.in")) return clientOrigin;
    } catch {
      /* ignore */
    }
  }
  return url.origin;
}

function reelsCacheRequest(url) {
  return new Request(url.toString(), { method: "GET" });
}

/** @param {Request} request @param {Record<string, string>} env @param {URL} url */
async function fetchReelFromGcs(request, env, url) {
  const resolved = await resolveReelObjectKey(request, env, url);
  if ("error" in resolved) {
    return new Response(JSON.stringify({ error: resolved.error }), {
      status: resolved.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = await getGcsAccessToken(env);
  const bucket = gcsBucket(env);
  const objectKey = resolved.entry.objectKey;
  const objectEncoded = encodeURIComponent(objectKey);

  if (request.method === "HEAD") {
    const metaUrl = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${objectEncoded}`;
    const metaRes = await fetch(metaUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaRes.ok) {
      return new Response(null, { status: metaRes.status === 404 ? 404 : 502 });
    }
    const meta = await metaRes.json();
    const headers = new Headers();
    headers.set("Content-Type", resolved.entry.contentType || meta.contentType || "video/mp4");
    headers.set("Content-Length", String(meta.size ?? "0"));
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", REELS_CACHE_CONTROL);
    return new Response(null, { status: 200, headers });
  }

  const rangeHeader = request.headers.get("Range");
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  if (rangeHeader) headers.set("Range", rangeHeader);

  const gcsRes = await fetch(gcsMediaUrl(bucket, objectKey), {
    method: "GET",
    headers,
  });

  const out = new Headers(gcsRes.headers);
  const ct = resolved.entry.contentType || out.get("Content-Type") || "video/mp4";
  out.set("Content-Type", ct.split(";")[0]);

  return new Response(gcsRes.body, {
    status: gcsRes.status,
    statusText: gcsRes.statusText,
    headers: out,
  });
}

/**
 * Edge cache for reels full GET; Range bypasses cache (like stories).
 * @param {Request} request @param {Record<string, string>} env @param {ExecutionContext} ctx @param {URL} url
 */
export async function fetchReelsStreamWithEdgeCache(request, env, ctx, url) {
  const cache = caches.default;
  const cacheKey = reelsCacheRequest(url);
  const hasRange = Boolean(request.headers.get("Range"));

  if (!hasRange && request.method === "GET") {
    const cached = await cache.match(cacheKey);
    if (cached) {
      return withReelsStreamHeaders(cached, request, url, "HIT");
    }
  }

  const response = await fetchReelFromGcs(request, env, url);
  const contentType = response.headers.get("content-type") ?? "";

  if (
    !hasRange &&
    request.method === "GET" &&
    response.ok &&
    response.status === 200 &&
    contentType.includes("video")
  ) {
    const toStore = response.clone();
    ctx.waitUntil(cache.put(cacheKey, toStore));
  }

  const cacheLabel = hasRange ? "BYPASS-RANGE" : "MISS";
  return withReelsStreamHeaders(response, request, url, cacheLabel);
}

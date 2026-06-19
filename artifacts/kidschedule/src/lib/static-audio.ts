import { getApiUrl, resolveApiMediaUrl } from "@/lib/api";
import { isAmyVoiceAudioDebugEnabled, logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";
import { validateAudioBlobDecodable } from "@/lib/amy-voice-audio-start";
import { audioManager } from "@/lib/audio-manager";
import {
  assertStaticAudioUrl,
  assertStaticPlaybackUrl,
  forbidDirectGcsUrl,
  isStaticAudioProxyUrl,
} from "@/lib/static-audio-guard";
import {
  emitStaticAudioVisualFallback,
  isClientStaticAudioCircuitOpen,
  isStaticAudioDebug,
  recordStaticAudioPlaybackSuccess,
  reportStaticAudioMissingUrl,
  reportStaticAudioPlayFailed,
  reportStaticAudioProxyFailed,
} from "@/lib/static-audio-telemetry";
import {
  isStaticTtsText,
  normalizeStaticAudioKey,
  normalizeSpeakTextForLookup,
  staticAudioMissingKey,
  type StaticAudioMode,
} from "@workspace/static-audio/browser";
import { replaceCoachPersonalNameWithFriend } from "@workspace/speech-coach";
import { isMobileStaticAudioDevice } from "@/lib/static-audio-edge";
import {
  isPlaceholderStaticAsset,
  STATIC_AUDIO_SOURCE_HEADER,
} from "@/lib/static-audio-placeholder-guard";

function audioDebugLog(...args: unknown[]): void {
  if (import.meta.env.DEV || isStaticAudioDebug() || isAmyVoiceAudioDebugEnabled()) {
    console.log(...args);
  }
}

export {
  assertStaticAudioUrl,
  assertStaticPlaybackUrl,
  forbidDirectGcsUrl,
  installStaticAudioConstructorGuard,
  installStaticAudioGuards,
} from "@/lib/static-audio-guard";

export {
  checkStaticAudioHealthOnBoot,
  emitStaticAudioVisualFallback,
  getSessionStaticAudioFailureCount,
  installStaticAudioDevTools,
  isClientStaticAudioCircuitOpen,
  isStaticAudioDebug,
  onStaticAudioVisualFallback,
  reportStaticAudioEvent,
} from "@/lib/static-audio-telemetry";

export function isStaticAudioPlaybackPaused(): boolean {
  return isClientStaticAudioCircuitOpen();
}

type StaticAudioMapFile = {
  default: Record<string, string>;
  phonics: Record<string, string>;
};

const missingKeys = new Set<string>();
const loggedMissing = new Set<string>();
const loggedViolations = new Set<string>();

const STATIC_GCS_HASH_RE = /\/static-audio\/([a-f0-9]{32})\.mp3$/i;

function indexByNormalizedKey(bucket: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!bucket) return out;
  for (const [key, url] of Object.entries(bucket)) {
    const trimmedUrl = (url ?? "").trim();
    if (!trimmedUrl) continue;
    const aliases = [
      normalizeStaticAudioKey(key),
      normalizeSpeakTextForLookup(key),
    ].filter(Boolean);
    const seenAlias = new Set<string>();
    for (const normalized of aliases) {
      if (seenAlias.has(normalized)) continue;
      seenAlias.add(normalized);
      const existing = out[normalized];
      if (existing && existing !== trimmedUrl && import.meta.env.DEV) {
        console.warn("[static-audio] normalized alias collision", {
          normalized,
          existing: existing.slice(-48),
          incoming: trimmedUrl.slice(-48),
          rawKey: key.slice(0, 80),
        });
      }
      if (!existing) out[normalized] = trimmedUrl;
    }
  }
  return out;
}

let map: { default: Record<string, string>; phonics: Record<string, string> } | null =
  null;

let staticAudioMapLoadPromise: Promise<void> | null = null;

function buildMapFromRaw(raw: StaticAudioMapFile): void {
  map = {
    default: indexByNormalizedKey(raw.default),
    phonics: indexByNormalizedKey(raw.phonics),
  };
}

/** Lazy-load static-audio-map.json (separate chunk — not in main bundle). */
export function ensureStaticAudioMapLoaded(): Promise<void> {
  if (map) return Promise.resolve();
  if (!staticAudioMapLoadPromise) {
    staticAudioMapLoadPromise = import("@/data/static-audio-map.json")
      .then((mod) => {
        const raw = (mod.default ?? mod) as StaticAudioMapFile;
        buildMapFromRaw(raw);
      })
      .catch((err) => {
        staticAudioMapLoadPromise = null;
        console.error("[static-audio] map load failed", err);
        throw err;
      });
  }
  return staticAudioMapLoadPromise;
}

export function isStaticAudioMapReady(): boolean {
  return map !== null;
}

export function normalize(text: string): string {
  return normalizeStaticAudioKey(text);
}

export function isStaticAudioStrictMode(): boolean {
  if (import.meta.env.VITE_STATIC_AUDIO_STRICT_MODE === "true") return true;
  if (import.meta.env.VITE_STATIC_AUDIO_STRICT_MODE === "false") return false;
  return import.meta.env.PROD;
}

export function isCatalogPhrase(rawText: string, mode: StaticAudioMode = "default"): boolean {
  const text = rawText.trim();
  if (!text) return false;
  return isStaticTtsText(text, mode);
}

function warnOnce(key: string, message: string, ...args: unknown[]): void {
  if (loggedMissing.has(key)) return;
  loggedMissing.add(key);
  console.warn(message, ...args);
}

function recordMissingStaticAudio(
  normalized: string,
  mode: StaticAudioMode,
  text: string,
  priority = 25,
  enqueueServer = true,
): void {
  if (!normalized) return;
  const key = staticAudioMissingKey(mode, normalized);
  missingKeys.add(key);
  warnOnce(`missing:${key}`, "Missing static audio:", normalized, `(p${priority})`);
  if (import.meta.env.PROD && enqueueServer) {
    reportMissingToServer(key, priority);
  }
  if (import.meta.env.PROD || isStaticAudioStrictMode()) {
    console.error("CRITICAL: Missing static audio in production", { text, mode, normalized });
  }
}

/**
 * Auto-learning — queue phrase for static audio generation after synthesis/visual fallback.
 * Prefer queueAmyVoiceLearning() for priority-aware batching.
 */
export function queueAmyVoiceStaticGeneration(
  rawText: string,
  mode: StaticAudioMode = "default",
  reason?: string,
  priority = 25,
): void {
  const text = (rawText ?? "").trim();
  if (!text) return;
  const normalized = normalizeStaticAudioKey(text);
  if (!normalized) return;
  logAmyVoiceDiag("auto_learn_queue", {
    text: text.slice(0, 100),
    mode,
    reason: reason ?? "fallback",
    priority,
  });
  recordMissingStaticAudio(normalized, mode, text, priority);
}

let reportQueue: Array<{ key: string; priority: number }> = [];
let reportTimer: ReturnType<typeof setTimeout> | null = null;

function flushMissingReports(): void {
  const merged = new Map<string, number>();
  for (const entry of reportQueue) {
    merged.set(entry.key, Math.max(merged.get(entry.key) ?? 0, entry.priority));
  }
  reportQueue = [];
  reportTimer = null;
  if (merged.size === 0) return;

  const sorted = [...merged.entries()].sort((a, b) => b[1] - a[1]);
  const keys = sorted.map(([k]) => k);
  const priorities = Object.fromEntries(sorted);

  void Promise.all([
    import("@/lib/api"),
    import("@/lib/firebase"),
  ])
    .then(async ([{ getApiUrl: apiUrl }, { getFirebaseAuth }]) => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      if (!token) return;
      headers.Authorization = `Bearer ${token}`;
      return fetch(apiUrl("/api/static-audio/missing"), {
        method: "POST",
        headers,
        body: JSON.stringify({ keys, priorities }),
        keepalive: true,
      });
    })
    .catch(() => {});
}

function reportMissingToServer(key: string, priority = 25): void {
  reportQueue.push({ key, priority });
  if (reportTimer) return;
  reportTimer = setTimeout(flushMissingReports, 500);
}

/** Batched prioritized learning reports from amy-voice-learning. */
export function reportAmyVoiceLearningBatch(
  entries: ReadonlyArray<{
    key: string;
    text: string;
    mode: StaticAudioMode;
    priority: number;
    reason: string;
  }>,
): void {
  for (const entry of entries) {
    const normalized = normalizeStaticAudioKey(entry.text);
    if (!normalized) continue;
    recordMissingStaticAudio(normalized, entry.mode, entry.text, entry.priority, false);
    if (import.meta.env.PROD) {
      reportMissingToServer(entry.key, entry.priority);
    }
  }
}

export function getMissingStaticAudioKeys(): string[] {
  return [...missingKeys].sort();
}

export function extractStaticAudioHashFromUrl(url: string): string | null {
  const match = url.match(STATIC_GCS_HASH_RE);
  return match?.[1]?.toLowerCase() ?? null;
}

function staticAudioProxyPath(hash: string): string {
  return `/api/static-audio/${hash}.mp3`;
}

/** Silent — true when the URL is already an API static-audio stream route. */
export function isValidStaticPlaybackUrl(url: string): boolean {
  return isStaticAudioProxyUrl(url);
}

export function resolveStaticPlaybackUrl(
  urlOrMapEntry: string,
  context?: { text?: string; mode?: StaticAudioMode },
): string | null {
  const trimmed = (urlOrMapEntry ?? "").trim();
  if (!trimmed) return null;

  if (isStaticAudioProxyUrl(trimmed)) {
    const resolved = trimmed.startsWith("http") ? trimmed : getApiUrl(trimmed);
    if (import.meta.env.DEV || isStaticAudioDebug()) {
      console.log("[STATIC AUDIO PROXY]", resolved);
    }
    return resolved;
  }

  const hash = extractStaticAudioHashFromUrl(trimmed);
  if (!hash) {
    console.error("STATIC AUDIO PROXY FAILED", { hash: null, input: trimmed });
    reportStaticAudioProxyFailed({ input: trimmed }, context?.text, context?.mode);
    return null;
  }

  const resolved = getApiUrl(staticAudioProxyPath(hash));
  if (import.meta.env.DEV || isStaticAudioDebug()) {
    console.log("[STATIC AUDIO PROXY]", resolved);
  }
  return resolved;
}

function resolveMapEntry(
  rawText: string,
  mode: StaticAudioMode,
): { mapEntry: string; normalized: string } | null {
  const text = rawText.trim();
  if (!text) return null;

  const coachCanonical = replaceCoachPersonalNameWithFriend(text);
  const keys = [
    normalizeStaticAudioKey(text),
    normalizeSpeakTextForLookup(text),
    normalizeStaticAudioKey(coachCanonical),
    normalizeSpeakTextForLookup(coachCanonical),
  ];
  const seen = new Set<string>();
  for (const normalized of keys) {
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    const mapEntry = map?.[mode]?.[normalized];
    if (mapEntry) return { mapEntry, normalized };
  }
  return null;
}

function lookupStaticAudioUrlForMode(
  rawText: string,
  mode: StaticAudioMode,
): string | null {
  const text = rawText.trim();
  const resolved = resolveMapEntry(text, mode);
  if (!resolved) return null;

  const { mapEntry, normalized } = resolved;
  const proxyUrl = resolveStaticPlaybackUrl(mapEntry, { text, mode });
  if (!proxyUrl || !isStaticAudioProxyUrl(proxyUrl)) {
    const hash = extractStaticAudioHashFromUrl(mapEntry);
    console.error("STATIC AUDIO PROXY FAILED", { hash, proxyUrl });
    reportStaticAudioProxyFailed({ hash, mapEntry: mapEntry.slice(0, 120) }, text, mode);
    if (isCatalogPhrase(text, mode)) {
      recordMissingStaticAudio(normalized, mode, text);
    }
    return null;
  }

  if (import.meta.env.DEV || isStaticAudioDebug() || isAmyVoiceAudioDebugEnabled()) {
    console.log("[STATIC AUDIO LOOKUP]", { text, normalized, mode, url: proxyUrl });
  }

  return proxyUrl;
}

/** Single catalog bucket only — no phonics↔default cross-fallback (required for tile playback). */
export function lookupStaticAudioUrlStrict(
  rawText: string,
  mode: StaticAudioMode,
): string | null {
  return lookupStaticAudioUrlForMode(rawText.trim(), mode);
}

export function lookupStaticAudioUrl(
  rawText: string,
  mode: StaticAudioMode = "default",
): string | null {
  const text = rawText.trim();
  const altMode: StaticAudioMode = mode === "phonics" ? "default" : "phonics";

  for (const tryMode of [mode, altMode]) {
    const proxyUrl = lookupStaticAudioUrlForMode(text, tryMode);
    if (proxyUrl) {
      if (tryMode !== mode) {
        logAmyVoiceDiag("lookup_alt_mode", { text: text.slice(0, 80), primary: mode, hit: tryMode });
      }
      return proxyUrl;
    }
  }

  const normalized = normalizeSpeakTextForLookup(text);
  if (normalized && isCatalogPhrase(text, mode)) {
    recordMissingStaticAudio(normalized, mode, text);
    reportStaticAudioMissingUrl(text, mode);
  }

  logAmyVoiceDiag("lookup_miss", {
    text: text.slice(0, 120),
    normalized,
    mode,
    catalog: isCatalogPhrase(text, mode),
  });

  return null;
}

export function getStaticAudioUrl(rawText: string, mode: StaticAudioMode = "default"): string | null {
  return lookupStaticAudioUrl(rawText, mode);
}

export function hasStaticAudio(rawText: string, mode: StaticAudioMode = "default"): boolean {
  return lookupStaticAudioUrl(rawText, mode) !== null;
}

/**
 * Catalog phrases prefer static audio but always fall back to TTS / emergency layers.
 * @deprecated Blocking removed — returns false so callers never skip fallback chain.
 */
export function mustUseStaticOnly(_rawText: string, _mode: StaticAudioMode = "default"): boolean {
  return false;
}

export function shouldBlockStaticTtsFallback(
  _rawText: string,
  _mode: StaticAudioMode = "default",
): boolean {
  return false;
}

export function logDynamicTtsViolation(rawText: string, mode: StaticAudioMode = "default"): void {
  if (!isCatalogPhrase(rawText, mode)) return;
  const key = staticAudioMissingKey(mode, normalizeStaticAudioKey(rawText));
  if (loggedViolations.has(key)) return;
  loggedViolations.add(key);
  console.error("[TTS VIOLATION] Blocked ElevenLabs fallback for catalog phrase", {
    text: rawText,
    mode,
    strict: isStaticAudioStrictMode(),
  });
}

const prefetchedUrls = new Set<string>();
const bootPrefetchedUrls = new Set<string>();
const BOOT_PREFETCH_CAP = 200;

function getPrefetchLimit(max?: number): number {
  if (max !== undefined) return max;
  if (typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
    return 2;
  }
  return 5;
}

/** Fetch-only warm — fills CDN/browser cache without decoding audio. */
function fetchStaticAudioPrefetch(proxyUrl: string): void {
  const fetchUrl = resolveApiMediaUrl(proxyUrl);
  void fetch(fetchUrl, {
    method: "GET",
    mode: "cors",
    credentials: "include",
    cache: "force-cache",
  })
    .then((res) => {
      void import("@/lib/static-audio-telemetry").then((t) =>
        t.recordClientCdnCacheStatus(fetchUrl, res),
      );
    })
    .catch(() => {});
}

export function prefetchStaticAudioUrl(proxyUrl: string): void {
  if (!proxyUrl || prefetchedUrls.has(proxyUrl)) return;
  prefetchedUrls.add(proxyUrl);
  const cap = getPrefetchLimit() * 2;
  if (prefetchedUrls.size > cap) {
    const first = prefetchedUrls.values().next().value;
    if (first) prefetchedUrls.delete(first);
  }
  fetchStaticAudioPrefetch(proxyUrl);
}

/** Layer 5 boot/route batch — higher cap than per-tap prefetch. */
export function prefetchStaticAudioUrlsBatch(urls: readonly string[]): void {
  for (const raw of urls) {
    const proxyUrl = raw?.trim();
    if (!proxyUrl || bootPrefetchedUrls.has(proxyUrl)) continue;
    bootPrefetchedUrls.add(proxyUrl);
    if (bootPrefetchedUrls.size > BOOT_PREFETCH_CAP) {
      const first = bootPrefetchedUrls.values().next().value;
      if (first) bootPrefetchedUrls.delete(first);
    }
    if (!prefetchedUrls.has(proxyUrl)) {
      prefetchedUrls.add(proxyUrl);
    }
    fetchStaticAudioPrefetch(proxyUrl);
  }
}

export function preloadStaticAudioUrls(urls: string[], max?: number): void {
  const limit = getPrefetchLimit(max);
  for (const url of urls.slice(0, limit)) {
    if (url) prefetchStaticAudioUrl(url);
  }
}

export function preloadStaticPhrases(
  phrases: string[],
  mode: StaticAudioMode = "default",
  max?: number,
): void {
  const limit = getPrefetchLimit(max);
  for (const phrase of phrases.slice(0, limit)) {
    const url = lookupStaticAudioUrl(phrase, mode);
    if (url) prefetchStaticAudioUrl(url);
  }
}

/** Android PWA/WebView: call from pointerdown before async speak(). */
export function primeStaticAudioInUserGesture(
  rawText: string,
  mode: StaticAudioMode = "default",
): void {
  const text = (rawText ?? "").trim();
  if (!text) return;
  const proxyUrl = lookupStaticAudioUrl(text, mode);
  if (!proxyUrl) return;
  audioManager.primeSpeechUrlInUserGesture(proxyUrl);
  void import("@/lib/local-tts-cache").then((m) =>
    m.warmLocalCacheFromUrl(m.localCacheKeyForPhrase(text, mode), proxyUrl),
  );
}

function createFreshAudio(proxyUrl: string): HTMLAudioElement {
  assertStaticPlaybackUrl(proxyUrl);
  return audioManager.create(proxyUrl);
}

function getOrCreateCachedAudio(proxyUrl: string): HTMLAudioElement {
  assertStaticPlaybackUrl(proxyUrl);
  return audioManager.getCached(proxyUrl, { forceReload: false });
}

export type SafePlayAudioOptions = {
  /** Enables one retry with a fresh Audio element after failure. */
  proxyUrl?: string;
  phrase?: string;
  mode?: StaticAudioMode;
  /** Suppress visual fallback event (pipeline handles layer 5). */
  quiet?: boolean;
};

async function verifyStaticAudioEndpoint(proxyUrl: string): Promise<number | null> {
  if (!import.meta.env.DEV && !isStaticAudioDebug()) return null;
  try {
    const res = await fetch(proxyUrl, { method: "GET", credentials: "omit", cache: "no-store" });
    console.log("[AUDIO RESPONSE STATUS]", res.status);
    return res.status;
  } catch (err) {
    console.error("[AUDIO FETCH FAILED]", err);
    return null;
  }
}

export async function safePlayAudio(
  audio: HTMLAudioElement,
  opts: SafePlayAudioOptions = {},
): Promise<boolean> {
  if (isClientStaticAudioCircuitOpen()) {
    audioDebugLog("[AUDIO DEBUG] client circuit open — playback blocked");
    if (!opts.quiet) emitStaticAudioVisualFallback({ phrase: opts.phrase, mode: opts.mode });
    return false;
  }

  const proxyUrl = opts.proxyUrl ?? audio.src;
  const srcType = audio.src.startsWith("blob:") ? "blob" : "static";
  audioDebugLog("[AUDIO PLAY ATTEMPT]", { srcType, proxyUrl: proxyUrl.slice(-80) });

  const played = await audioManager.play(
    audio,
    {
      proxyUrl,
      phrase: opts.phrase,
      mode: opts.mode,
      source: "static",
      channel: "speech",
      interrupt: true,
      srcType,
    },
    { maxRetries: 2, channel: "speech", interrupt: true },
  );

  if (played) {
    recordStaticAudioPlaybackSuccess();
    if (import.meta.env.DEV || isStaticAudioDebug()) {
      console.log("[AUDIO PLAY SUCCESS]", { url: audio.src });
    }
    return true;
  }

  reportStaticAudioPlayFailed(new Error("audio_play_failed"), audio, {
    phrase: opts.phrase,
    mode: opts.mode,
    attempt: "exhausted",
    proxyUrl,
  });
  if (!opts.quiet) emitStaticAudioVisualFallback({ phrase: opts.phrase, mode: opts.mode });
  return false;
}

function createStaticPlaybackElement(proxyUrl: string): HTMLAudioElement | null {
  try {
    return getOrCreateCachedAudio(proxyUrl);
  } catch {
    return null;
  }
}

/**
 * Android installed PWA: fetch MP3 into a blob URL first.
 * Avoids cross-origin Range/206 decode bugs on HTMLAudioElement.src.
 */
async function createStaticPlaybackElementFromBlob(
  proxyUrl: string,
): Promise<HTMLAudioElement | null> {
  const absUrl = proxyUrl.startsWith("http") ? proxyUrl : getApiUrl(proxyUrl);
  try {
    const res = await fetch(absUrl, {
      method: "GET",
      credentials: "omit",
      cache: "default",
      mode: "cors",
    });
    logAmyVoiceDiag("blob_fetch", {
      url: absUrl.slice(-72),
      status: res.status,
      ok: res.ok,
    });
    if (!res.ok) return null;
    if (
      isPlaceholderStaticAsset({
        staticSourceHeader: res.headers.get(STATIC_AUDIO_SOURCE_HEADER),
        contentLength: Number(res.headers.get("content-length") ?? "0"),
      })
    ) {
      logAmyVoiceDiag("static_placeholder_rejected", { url: absUrl.slice(-72) });
      return null;
    }
    const blob = await res.blob();
    if (isPlaceholderStaticAsset({ blobSize: blob.size })) {
      logAmyVoiceDiag("static_placeholder_blob_rejected", { url: absUrl.slice(-72), bytes: blob.size });
      return null;
    }
    try {
      await validateAudioBlobDecodable(blob);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logAmyVoiceDiag("blob_decode_failed", { bytes: blob.size, error: msg });
      return null;
    }
    const blobUrl = URL.createObjectURL(blob);
    audioManager.trackObjectUrl(blobUrl);
    return audioManager.create(blobUrl);
  } catch (err) {
    logAmyVoiceDiag("blob_fetch_error", {
      url: absUrl.slice(-72),
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

function shouldPreferBlobStaticPlayback(): boolean {
  return isMobileStaticAudioDevice();
}

async function createStaticPlaybackElementAsync(
  proxyUrl: string,
): Promise<HTMLAudioElement | null> {
  if (shouldPreferBlobStaticPlayback()) {
    const blobEl = await createStaticPlaybackElementFromBlob(proxyUrl);
    if (blobEl) return blobEl;
    logAmyVoiceDiag("mobile_blob_miss_try_direct", { url: proxyUrl.slice(-72) });
  }

  // Desktop fast path: reuse a warm URL-keyed element and stream from src.
  const direct = createStaticPlaybackElement(proxyUrl);
  if (direct) return direct;

  const blobEl = await createStaticPlaybackElementFromBlob(proxyUrl);
  if (blobEl) return blobEl;
  logAmyVoiceDiag("blob_fallback_remote", { url: proxyUrl.slice(-72) });
  return direct;
}

export type PreparePlaybackOptions = {
  /** Pipeline handles UX — suppress early visual-only events. */
  quiet?: boolean;
};

export async function prepareStaticPlaybackAudio(
  rawText: string,
  mode: StaticAudioMode = "default",
  options?: PreparePlaybackOptions,
): Promise<HTMLAudioElement | null> {
  if (isClientStaticAudioCircuitOpen()) {
    if (!options?.quiet) emitStaticAudioVisualFallback({ phrase: rawText, mode });
    return null;
  }
  const proxyUrl = lookupStaticAudioUrl(rawText, mode);
  if (!proxyUrl) {
    if (!options?.quiet) emitStaticAudioVisualFallback({ phrase: rawText, mode });
    return null;
  }
  return createStaticPlaybackElementAsync(proxyUrl);
}

/** Remote MP3 (live TTS / cache proxy) — same Android blob path as static. */
export async function prepareRemotePlaybackAudio(
  playbackUrl: string,
): Promise<HTMLAudioElement | null> {
  return createStaticPlaybackElementAsync(playbackUrl);
}

export async function playStaticAudio(
  rawText: string,
  mode: StaticAudioMode = "default",
): Promise<boolean> {
  const text = (rawText ?? "").trim();
  audioDebugLog("[AUDIO DEBUG START]", { text, mode });

  if (!text) {
    console.error("URL RESOLUTION FAILED", rawText);
    return false;
  }

  const proxyUrl = lookupStaticAudioUrl(text, mode);
  audioDebugLog("[AUDIO URL]", proxyUrl);

  if (!proxyUrl) {
    console.error("URL RESOLUTION FAILED", text);
    return false;
  }

  await verifyStaticAudioEndpoint(proxyUrl);

  let audio: HTMLAudioElement | null;
  try {
    audio = await createStaticPlaybackElementAsync(proxyUrl);
  } catch (err) {
    console.error("[AUDIO OBJECT FAILED]", err);
    return false;
  }
  if (!audio) {
    console.error("[AUDIO OBJECT FAILED]", "createStaticPlaybackElement returned null");
    return false;
  }
  audioDebugLog("[AUDIO OBJECT CREATED]", proxyUrl);

  try {
    const played = await safePlayAudio(audio, { proxyUrl, phrase: text, mode });
    if (played) {
      audioDebugLog("[AUDIO PLAY SUCCESS]");
    }
    return played;
  } catch (err) {
    console.error("[AUDIO PLAY FAILED]", err);
    return false;
  }
}

export function tryCreateStaticPlaybackAudio(
  rawText: string,
  mode: StaticAudioMode = "default",
): HTMLAudioElement | null {
  const proxyUrl = lookupStaticAudioUrl(rawText, mode);
  if (!proxyUrl) return null;
  return createStaticPlaybackElement(proxyUrl);
}

export function createStaticAudioElement(
  rawText: string,
  mode: StaticAudioMode = "default",
): HTMLAudioElement | null {
  return tryCreateStaticPlaybackAudio(rawText, mode);
}

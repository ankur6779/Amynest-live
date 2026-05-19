import audioMap from "@/data/static-audio-map.json";
import { agentDebugLog } from "@/lib/agent-debug-log";
import { getApiUrl } from "@/lib/api";
import { playHtmlAudio } from "@/lib/tts-guard";
import {
  assertStaticAudioUrl,
  assertStaticPlaybackUrl,
  forbidDirectGcsUrl,
} from "@/lib/static-audio-guard";
import {
  emitStaticAudioVisualFallback,
  isClientStaticAudioCircuitOpen,
  isStaticAudioDebug,
  recordStaticAudioPlaybackSuccess,
  reportStaticAudioMissingUrl,
  reportStaticAudioPlayFailed,
  reportStaticAudioProxyFailed,
  staticAudioRetryDelayMs,
} from "@/lib/static-audio-telemetry";
import {
  isStaticTtsText,
  normalizeStaticAudioKey,
  staticAudioMissingKey,
  type StaticAudioMode,
} from "@workspace/static-audio/browser";

function audioDebugLog(...args: unknown[]): void {
  if (import.meta.env.DEV || isStaticAudioDebug()) {
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type StaticAudioMapFile = {
  default: Record<string, string>;
  phonics: Record<string, string>;
};

const raw = audioMap as StaticAudioMapFile;

const missingKeys = new Set<string>();
const loggedMissing = new Set<string>();
const loggedViolations = new Set<string>();

const audioCache = new Map<string, HTMLAudioElement>();

const STATIC_GCS_HASH_RE = /\/static-audio\/([a-f0-9]{32})\.mp3$/i;

function indexByNormalizedKey(bucket: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!bucket) return out;
  for (const [key, url] of Object.entries(bucket)) {
    const normalized = normalizeStaticAudioKey(key);
    if (!normalized) continue;
    out[normalized] = (url ?? "").trim();
  }
  return out;
}

const map: { default: Record<string, string>; phonics: Record<string, string> } = {
  default: indexByNormalizedKey(raw.default),
  phonics: indexByNormalizedKey(raw.phonics),
};

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

function recordMissingStaticAudio(normalized: string, mode: StaticAudioMode, text: string): void {
  if (!normalized) return;
  const key = staticAudioMissingKey(mode, normalized);
  missingKeys.add(key);
  warnOnce(`missing:${key}`, "Missing static audio:", normalized);
  if (import.meta.env.PROD) {
    void reportMissingToServer(key);
  }
  if (import.meta.env.PROD || isStaticAudioStrictMode()) {
    console.error("CRITICAL: Missing static audio in production", { text, mode, normalized });
  }
}

let reportQueue: string[] = [];
let reportTimer: ReturnType<typeof setTimeout> | null = null;

function flushMissingReports(): void {
  const keys = [...new Set(reportQueue)];
  reportQueue = [];
  reportTimer = null;
  if (keys.length === 0) return;
  void import("@/lib/api")
    .then(({ getApiUrl: apiUrl }) =>
      fetch(apiUrl("/api/static-audio/missing"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys }),
        keepalive: true,
      }),
    )
    .catch(() => {});
}

function reportMissingToServer(key: string): void {
  reportQueue.push(key);
  if (reportTimer) return;
  reportTimer = setTimeout(flushMissingReports, 500);
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

export function isValidStaticPlaybackUrl(url: string): boolean {
  return assertStaticAudioUrl(url);
}

export function resolveStaticPlaybackUrl(
  urlOrMapEntry: string,
  context?: { text?: string; mode?: StaticAudioMode },
): string | null {
  const trimmed = (urlOrMapEntry ?? "").trim();
  if (!trimmed) return null;

  if (isValidStaticPlaybackUrl(trimmed)) {
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

export function lookupStaticAudioUrl(
  rawText: string,
  mode: StaticAudioMode = "default",
): string | null {
  const text = rawText.trim();
  const normalized = normalizeStaticAudioKey(text);
  if (!normalized) return null;

  const mapEntry = map[mode]?.[normalized] ?? null;
  if (!mapEntry) {
    if (isCatalogPhrase(text, mode)) {
      recordMissingStaticAudio(normalized, mode, text);
      reportStaticAudioMissingUrl(text, mode);
    }
    return null;
  }

  const proxyUrl = resolveStaticPlaybackUrl(mapEntry, { text, mode });
  if (!proxyUrl || !isValidStaticPlaybackUrl(proxyUrl)) {
    const hash = extractStaticAudioHashFromUrl(mapEntry);
    console.error("INVALID STATIC AUDIO ROUTE", proxyUrl);
    console.error("STATIC AUDIO PROXY FAILED", { hash });
    reportStaticAudioProxyFailed({ hash, mapEntry: mapEntry.slice(0, 120) }, text, mode);
    if (isCatalogPhrase(text, mode)) {
      recordMissingStaticAudio(normalized, mode, text);
    }
    return null;
  }

  if (import.meta.env.DEV || isStaticAudioDebug()) {
    console.log("[STATIC AUDIO LOOKUP]", { text, normalized, mode, url: proxyUrl });
  }

  return proxyUrl;
}

export function getStaticAudioUrl(rawText: string, mode: StaticAudioMode = "default"): string | null {
  return lookupStaticAudioUrl(rawText, mode);
}

export function hasStaticAudio(rawText: string, mode: StaticAudioMode = "default"): boolean {
  return lookupStaticAudioUrl(rawText, mode) !== null;
}

export function mustUseStaticOnly(rawText: string, mode: StaticAudioMode = "default"): boolean {
  return isCatalogPhrase(rawText, mode);
}

export function shouldBlockStaticTtsFallback(
  rawText: string,
  mode: StaticAudioMode = "default",
): boolean {
  return mustUseStaticOnly(rawText, mode);
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

function getPrefetchLimit(max?: number): number {
  if (max !== undefined) return max;
  if (typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
    return 2;
  }
  return 5;
}

/** Fetch-only warm — fills CDN/browser cache without decoding audio. */
export function prefetchStaticAudioUrl(proxyUrl: string): void {
  if (!proxyUrl || prefetchedUrls.has(proxyUrl)) return;
  prefetchedUrls.add(proxyUrl);
  const cap = getPrefetchLimit() * 2;
  if (prefetchedUrls.size > cap) {
    const first = prefetchedUrls.values().next().value;
    if (first) prefetchedUrls.delete(first);
  }
  void fetch(proxyUrl, { method: "GET", credentials: "omit", cache: "force-cache" })
    .then((res) => {
      void import("@/lib/static-audio-telemetry").then((t) =>
        t.recordClientCdnCacheStatus(proxyUrl, res),
      );
    })
    .catch(() => {});
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

function createFreshAudio(proxyUrl: string): HTMLAudioElement {
  assertStaticPlaybackUrl(proxyUrl);
  const audio = new Audio(proxyUrl);
  // Lazy until play() — browser HTTP cache serves repeat phrases.
  audio.preload = "none";
  return audio;
}

function getOrCreateCachedAudio(proxyUrl: string): HTMLAudioElement {
  const existing = audioCache.get(proxyUrl);
  if (existing) {
    existing.pause();
    existing.currentTime = 0;
    if (existing.src !== proxyUrl) {
      existing.src = proxyUrl;
    }
    return existing;
  }
  const audio = createFreshAudio(proxyUrl);
  audioCache.set(proxyUrl, audio);
  return audio;
}

export type SafePlayAudioOptions = {
  /** Enables one retry with a fresh Audio element after failure. */
  proxyUrl?: string;
  phrase?: string;
  mode?: StaticAudioMode;
};

async function verifyStaticAudioEndpoint(proxyUrl: string): Promise<number | null> {
  if (!import.meta.env.DEV && !isStaticAudioDebug()) return null;
  try {
    const res = await fetch(proxyUrl, { method: "GET", credentials: "omit", cache: "no-store" });
    console.log("[AUDIO RESPONSE STATUS]", res.status);
    // #region agent log
    agentDebugLog({
      hypothesisId: "D",
      runId: "pre-fix",
      location: "static-audio.ts:verifyStaticAudioEndpoint",
      message: "API verify fetch",
      data: { status: res.status, ok: res.ok, urlTail: proxyUrl.slice(-48) },
    });
    // #endregion
    return res.status;
  } catch (err) {
    console.error("[AUDIO FETCH FAILED]", err);
    // #region agent log
    agentDebugLog({
      hypothesisId: "D",
      runId: "pre-fix",
      location: "static-audio.ts:verifyStaticAudioEndpoint",
      message: "API verify fetch failed",
      data: { error: err instanceof Error ? err.message : String(err) },
    });
    // #endregion
    return null;
  }
}

async function playElementOnce(audio: HTMLAudioElement): Promise<void> {
  audioDebugLog("[AUDIO PLAY ATTEMPT]");
  await playHtmlAudio(audio);
}

export async function safePlayAudio(
  audio: HTMLAudioElement,
  opts: SafePlayAudioOptions = {},
): Promise<boolean> {
  if (isClientStaticAudioCircuitOpen()) {
    audioDebugLog("[AUDIO DEBUG] client circuit open — playback blocked");
    // #region agent log
    agentDebugLog({
      hypothesisId: "C",
      runId: "pre-fix",
      location: "static-audio.ts:safePlayAudio",
      message: "client circuit open",
      data: { phrase: opts.phrase?.slice(0, 80) },
    });
    // #endregion
    emitStaticAudioVisualFallback({ phrase: opts.phrase, mode: opts.mode });
    return false;
  }

  const proxyUrl = opts.proxyUrl ?? audio.src;

  try {
    await playElementOnce(audio);
    recordStaticAudioPlaybackSuccess();
    if (import.meta.env.DEV || isStaticAudioDebug()) {
      console.log("[AUDIO PLAY SUCCESS]", { url: audio.src });
    }
    return true;
  } catch (err) {
    console.error("[AUDIO PLAY FAILED]", err);
    reportStaticAudioPlayFailed(err, audio, {
      phrase: opts.phrase,
      mode: opts.mode,
      attempt: "first",
    });

    if (proxyUrl && isValidStaticPlaybackUrl(proxyUrl) && !isClientStaticAudioCircuitOpen()) {
      audioCache.delete(proxyUrl);
      await sleep(staticAudioRetryDelayMs());
      try {
        const retryAudio = createFreshAudio(proxyUrl);
        await playElementOnce(retryAudio);
        audioCache.set(proxyUrl, retryAudio);
        recordStaticAudioPlaybackSuccess();
        if (import.meta.env.DEV || isStaticAudioDebug()) {
          console.log("[AUDIO PLAY SUCCESS]", { url: proxyUrl, retry: true });
        }
        return true;
      } catch (retryErr) {
        console.error("[AUDIO PLAY FAILED]", retryErr);
        reportStaticAudioPlayFailed(retryErr, audio, {
          phrase: opts.phrase,
          mode: opts.mode,
          attempt: "retry",
          proxyUrl,
        });
      }
    }

    emitStaticAudioVisualFallback({ phrase: opts.phrase, mode: opts.mode });
    return false;
  }
}

function createStaticPlaybackElement(proxyUrl: string): HTMLAudioElement | null {
  try {
    return getOrCreateCachedAudio(proxyUrl);
  } catch {
    return null;
  }
}

export async function prepareStaticPlaybackAudio(
  rawText: string,
  mode: StaticAudioMode = "default",
): Promise<HTMLAudioElement | null> {
  if (isClientStaticAudioCircuitOpen()) {
    emitStaticAudioVisualFallback({ phrase: rawText, mode });
    return null;
  }
  const proxyUrl = lookupStaticAudioUrl(rawText, mode);
  if (!proxyUrl) {
    emitStaticAudioVisualFallback({ phrase: rawText, mode });
    return null;
  }
  return createStaticPlaybackElement(proxyUrl);
}

export async function playStaticAudio(
  rawText: string,
  mode: StaticAudioMode = "default",
): Promise<boolean> {
  const text = (rawText ?? "").trim();
  audioDebugLog("[AUDIO DEBUG START]", { text, mode });
  // #region agent log
  agentDebugLog({
    hypothesisId: "A",
    runId: "pre-fix",
    location: "static-audio.ts:playStaticAudio",
    message: "playStaticAudio invoked",
    data: { textLen: text.length, mode, circuitOpen: isClientStaticAudioCircuitOpen() },
  });
  // #endregion

  if (!text) {
    console.error("URL RESOLUTION FAILED", rawText);
    return false;
  }

  const proxyUrl = lookupStaticAudioUrl(text, mode);
  audioDebugLog("[AUDIO URL]", proxyUrl);
  // #region agent log
  agentDebugLog({
    hypothesisId: "B",
    runId: "pre-fix",
    location: "static-audio.ts:playStaticAudio",
    message: "URL resolved",
    data: { proxyUrl: proxyUrl?.slice(-64) ?? null, hasUrl: Boolean(proxyUrl) },
  });
  // #endregion

  if (!proxyUrl) {
    console.error("URL RESOLUTION FAILED", text);
    return false;
  }

  await verifyStaticAudioEndpoint(proxyUrl);

  let audio: HTMLAudioElement | null;
  try {
    audio = createStaticPlaybackElement(proxyUrl);
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
      // #region agent log
      agentDebugLog({
        hypothesisId: "E",
        runId: "pre-fix",
        location: "static-audio.ts:playStaticAudio",
        message: "playback success",
        data: { urlTail: proxyUrl.slice(-48) },
      });
      // #endregion
    }
    return played;
  } catch (err) {
    console.error("[AUDIO PLAY FAILED]", err);
    // #region agent log
    agentDebugLog({
      hypothesisId: "E",
      runId: "pre-fix",
      location: "static-audio.ts:playStaticAudio",
      message: "playback threw",
      data: { error: err instanceof Error ? err.message : String(err) },
    });
    // #endregion
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

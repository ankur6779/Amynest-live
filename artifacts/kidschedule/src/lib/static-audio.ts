import audioMap from "@/data/static-audio-map.json";
import { getApiUrl } from "@/lib/api";
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

type StaticAudioMapFile = {
  default: Record<string, string>;
  phonics: Record<string, string>;
};

const raw = audioMap as StaticAudioMapFile;

const missingKeys = new Set<string>();
const loggedMissing = new Set<string>();
const loggedViolations = new Set<string>();

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

  const keys = [
    normalizeStaticAudioKey(text),
    normalizeSpeakTextForLookup(text),
  ];
  const seen = new Set<string>();
  for (const normalized of keys) {
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    const mapEntry = map[mode]?.[normalized];
    if (mapEntry) return { mapEntry, normalized };
  }
  return null;
}

export function lookupStaticAudioUrl(
  rawText: string,
  mode: StaticAudioMode = "default",
): string | null {
  const text = rawText.trim();
  const resolved = resolveMapEntry(text, mode);
  if (!resolved) {
    const normalized = normalizeSpeakTextForLookup(text);
    if (normalized && isCatalogPhrase(text, mode)) {
      recordMissingStaticAudio(normalized, mode, text);
      reportStaticAudioMissingUrl(text, mode);
    }
    return null;
  }

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
  audioDebugLog("[AUDIO PLAY ATTEMPT]");

  const played = await audioManager.play(
    audio,
    {
      proxyUrl,
      phrase: opts.phrase,
      mode: opts.mode,
      source: "static",
      channel: "speech",
      interrupt: true,
      srcType: "static",
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

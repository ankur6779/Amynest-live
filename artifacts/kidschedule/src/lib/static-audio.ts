import audioMap from "@/data/static-audio-map.json";
import { resolveApiMediaUrl } from "@/lib/api";
import {
  isStaticTtsText,
  normalizeStaticAudioKey,
  staticAudioMissingKey,
  type StaticAudioMode,
} from "@workspace/static-audio";

type StaticAudioMapFile = {
  default: Record<string, string>;
  phonics: Record<string, string>;
};

const raw = audioMap as StaticAudioMapFile;

/** Preload / warm URL → hidden audio element (not used for concurrent playback). */
const audioCache = new Map<string, HTMLAudioElement>();

const missingKeys = new Set<string>();
const loggedMissing = new Set<string>();
const loggedViolations = new Set<string>();

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

/** Strict mode: block any dynamic TTS fallback (default on in production builds). */
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

function isHttpsAudioUrl(url: string): boolean {
  return url.startsWith("https://") && !url.includes("undefined");
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
    .then(({ getApiUrl }) =>
      fetch(getApiUrl("/api/static-audio/missing"), {
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

export function lookupStaticAudioUrl(
  rawText: string,
  mode: StaticAudioMode = "default",
): string | null {
  const text = rawText.trim();
  const normalized = normalizeStaticAudioKey(text);
  if (!normalized) return null;
  const url = map[mode]?.[normalized] ?? null;
  if (!url || !isHttpsAudioUrl(url)) {
    if (isCatalogPhrase(text, mode)) {
      recordMissingStaticAudio(normalized, mode, text);
    }
    return null;
  }
  return url;
}

/** @deprecated Use lookupStaticAudioUrl */
export function getStaticAudioUrl(rawText: string, mode: StaticAudioMode = "default"): string | null {
  return lookupStaticAudioUrl(rawText, mode);
}

export function hasStaticAudio(rawText: string, mode: StaticAudioMode = "default"): boolean {
  return lookupStaticAudioUrl(rawText, mode) !== null;
}

/**
 * Catalog phrases must use pre-generated audio only — never /api/tts/synthesize.
 */
export function mustUseStaticOnly(rawText: string, mode: StaticAudioMode = "default"): boolean {
  return isCatalogPhrase(rawText, mode);
}

/**
 * @deprecated Use mustUseStaticOnly — always blocks API for catalog phrases.
 */
export function shouldBlockStaticTtsFallback(
  rawText: string,
  mode: StaticAudioMode = "default",
): boolean {
  return mustUseStaticOnly(rawText, mode);
}

/** Log when code attempts dynamic TTS for a catalog phrase (strict mode). */
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

export function preloadStaticAudioUrls(urls: string[], max = 5): void {
  for (const raw of urls) {
    if (audioCache.size >= max) break;
    const url = resolveApiMediaUrl(raw);
    if (!isHttpsAudioUrl(url) || audioCache.has(url)) continue;
    const warm = new Audio(url);
    warm.preload = "auto";
    audioCache.set(url, warm);
  }
}

export function preloadStaticPhrases(
  phrases: string[],
  mode: StaticAudioMode = "default",
  max = 5,
): void {
  const urls: string[] = [];
  for (const phrase of phrases) {
    if (urls.length >= max) break;
    const url = lookupStaticAudioUrl(phrase, mode);
    if (url) urls.push(url);
  }
  preloadStaticAudioUrls(urls, max);
}

function getOrCreateCachedAudio(resolvedUrl: string): HTMLAudioElement {
  const existing = audioCache.get(resolvedUrl);
  if (existing) {
    existing.pause();
    existing.currentTime = 0;
    return existing;
  }
  const audio = new Audio(resolvedUrl);
  audio.preload = "auto";
  audioCache.set(resolvedUrl, audio);
  return audio;
}

/**
 * Safe play — never throws (autoplay / gesture errors).
 */
export async function safePlayAudio(audio: HTMLAudioElement): Promise<boolean> {
  try {
    if (audio.paused) await audio.play();
    return true;
  } catch (err) {
    console.error("AUDIO PLAY FAILED", err);
    return false;
  }
}

/**
 * Resolve static GCS audio for playback. Returns null for non-catalog or missing URL.
 * Catalog phrases with missing URL never fall through to dynamic TTS.
 */
export function tryCreateStaticPlaybackAudio(
  rawText: string,
  mode: StaticAudioMode = "default",
): HTMLAudioElement | null {
  if (!mustUseStaticOnly(rawText, mode) && !lookupStaticAudioUrl(rawText, mode)) {
    return null;
  }

  const url = lookupStaticAudioUrl(rawText, mode);
  if (!url) {
    return null;
  }

  const resolved = resolveApiMediaUrl(url);
  return getOrCreateCachedAudio(resolved);
}

/** @deprecated Use tryCreateStaticPlaybackAudio */
export function createStaticAudioElement(
  rawText: string,
  mode: StaticAudioMode = "default",
): HTMLAudioElement | null {
  return tryCreateStaticPlaybackAudio(rawText, mode);
}
